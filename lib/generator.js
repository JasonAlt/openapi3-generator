/**
 * This module generates a code skeleton for an API using OpenAPI/Swagger.
 * @module codegen
 */

const os = require('os');
const path = require('path');
const fs = require('fs');
const Handlebars = require('handlebars');
const _ = require('lodash');
const beautifier = require('./beautifier');
const xfs = require('fs.extra');
const randomName = require('project-name-generator');
const registerPartial = require('./register-partial');
const bundler = require('./bundler');

const codegen = module.exports;

/**
 * Generates a file.
 *
 * @private
 * @param  {Object} options
 * @param  {String} options.templates_dir Directory where the templates live.
 * @param  {String} options.target_dir    Directory where the file will be generated.
 * @param  {String} options.file_name     Name of the generated file.
 * @param  {String} options.root          Root directory.
 * @param  {Object} options.data          Data to pass to the template.
 * @return {Promise}
 */
const generateFile = options => new Promise((resolve, reject) => {
  const templates_dir = options.templates_dir;
  const target_dir = options.target_dir;
  const file_name = options.file_name;
  const root = options.root;
  const data = options.data;

  fs.readFile(path.resolve(root, file_name), 'utf8', (err, content) => {
    if (err) return reject(err);

    try {
      const template = Handlebars.compile(content);
      const parsed_content = template(data);
      const template_path = path.relative(templates_dir, path.resolve(root, file_name));
      const generated_path = path.resolve(target_dir, template_path);

      fs.writeFile(generated_path, parsed_content, 'utf8', (err) => {
        if (err) return reject(err);
        resolve();
      });
    } catch (e) {
      reject(e);
    }
  });
});

/**
 * Generates a file for every operation.
 *
 * @param config
 * @param operation
 * @param operation_name
 * @returns {Promise}
 */
const generateOperationFile = (config, operation, operation_name) => new Promise((resolve, reject) => {
  fs.readFile(path.join(config.root, config.file_name), 'utf8', (err, data) => {
    if (err) return reject(err);
    const subdir = config.root.replace(new RegExp(`${config.templates_dir}[/]?`),'');
    const new_filename = config.file_name.replace('$$path$$', operation_name);
    const target_file = path.resolve(config.target_dir, subdir, new_filename);
    const template = Handlebars.compile(data.toString());
    const content = template({
      openbrace: '{',
      closebrace: '}' ,
      operation_name: operation_name.replace(/[}{]/g, ''),
      operation,
      swagger: config.data.swagger
    });

    fs.writeFile(target_file, content, 'utf8', (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
});

/**
 * Generates all the files for each operation by iterating over the operations.
 *
 * @param   {Object}  config Configuration options
 * @returns {Promise}
 */
const generateOperationFiles = config => new Promise((resolve, reject) => {
  const files = {};
  _.each(config.data.swagger.paths, (path, path_name) => {
    const operation_name = path.endpointName;
    if (files[operation_name] === undefined) {
      files[operation_name] = [];
    }

    path_name = path_name.replace(/}/g, '').replace(/{/g, ':');

    files[operation_name].push({
      path_name,
      path,
      subresource: (path_name.substring(operation_name.length+1) || '/').replace(/}/g, '').replace(/{/g, ':')
    });

    Promise.all(
      _.map(files, (operation, operation_name) => generateOperationFile(config, operation, operation_name))
    ).then(resolve).catch(reject);
    resolve();
  });
});

/**
 * Generates the directory structure.
 *
 * @private
 * @param  {Object}        config Configuration options
 * @param  {Object|String} config.swagger Swagger JSON or a string pointing to a Swagger file.
 * @param  {String}        config.target_dir Absolute path to the directory where the files will be generated.
 * @param  {String}        config.templates Absolute path to the templates that should be used.
 * @return {Promise}
 */
const generateDirectoryStructure = config => new Promise((resolve, reject) => {
  const target_dir = config.target_dir;
  const templates_dir = config.templates;

  xfs.mkdirpSync(target_dir);

  const walker = xfs.walk(templates_dir, {
    followLinks: false
  });

  walker.on('file', async (root, stats, next) => {
    try {
      if (stats.name.includes('$$path$$')) {
        // this file should be handled for each in swagger.paths
        await generateOperationFiles({
          root,
          templates_dir,
          target_dir,
          data: config,
          file_name: stats.name
        });
        const template_path = path.relative(templates_dir, path.resolve(root, stats.name));
        fs.unlink(path.resolve(target_dir, template_path), next);
      } else {
        const file_path = path.relative(templates_dir, path.resolve(root, stats.name));
        if (!file_path.startsWith('.partials/') && !file_path.startsWith('.helpers/')) {
          // this file should only exist once.
          await generateFile({
            root,
            templates_dir,
            target_dir,
            data: config,
            file_name: stats.name
          });
        }
        next();
      }
    } catch (e) {
      reject(e);
    }
  });

  walker.on('directory', async (root, stats, next) => {
    try {
      const dir_path = path.resolve(target_dir, path.relative(templates_dir, path.resolve(root, stats.name)));
      if (stats.name !== '.partials' && stats.name !== '.helpers') xfs.mkdirpSync(dir_path);
      next();
    } catch (e) {
      reject(e);
    }
  });

  walker.on('errors', (root, nodeStatsArray) => {
    reject(nodeStatsArray);
  });

  walker.on('end', async () => {
    resolve();
  });
});

/**
 * Register the template partials
 *
 * @private
 * @param  {Object}   config Configuration options
 * @param  {String}   config.templates Absolute path to the templates that should be used.
 * @return {Promise}
 */
const registerHelpers = config => new Promise((resolve, reject) => {
  const helpers_dir = path.resolve(config.templates, '.helpers');

  if (!fs.existsSync(helpers_dir)) return resolve();

  const walker = xfs.walk(helpers_dir, {
    followLinks: false
  });

  walker.on('file', async (root, stats, next) => {
    try {
      const file_path = path.resolve(config.templates, path.resolve(root, stats.name));
      require(file_path);
      next();
    } catch (e) {
      reject(e);
    }
  });

  walker.on('errors', (root, nodeStatsArray) => {
    reject(nodeStatsArray);
  });

  walker.on('end', async () => {
    resolve();
  });
});

/**
 * Register the template helpers
 *
 * @private
 * @param  {Object}   config Configuration options
 * @param  {String}   config.templates Absolute path to the templates that should be used.
 * @return {Promise}
 */
const registerPartials = config => new Promise((resolve, reject) => {
  const partials_dir = path.resolve(config.templates, '.partials');

  if (!fs.existsSync(partials_dir)) return resolve();

  const walker = xfs.walk(partials_dir, {
    followLinks: false
  });

  walker.on('file', async (root, stats, next) => {
    try {
      const file_path = path.resolve(config.templates, path.resolve(root, stats.name));
      await registerPartial(file_path);
      next();
    } catch (e) {
      reject(e);
    }
  });

  walker.on('errors', (root, nodeStatsArray) => {
    reject(nodeStatsArray);
  });

  walker.on('end', () => {
    resolve();
  });
});

const bundle = async (openapi) => {
  if (typeof openapi === 'string') {
    try {
      return await bundler(openapi);
    } catch (e) {
      throw e;
    }
  } else if (typeof openapi !== 'object') {
    throw new Error(`Could not find a valid OpenAPI definition: ${openapi}`);
  }
};

/**
 * Generates a code skeleton for an API given an OpenAPI/Swagger file.
 *
 * @module codegen.generate
 * @param  {Object}        config Configuration options
 * @param  {Object|String} config.openapi OpenAPI/Swagger JSON or a string pointing to an OpenAPI/Swagger file.
 * @param  {String}        config.target_dir Path to the directory where the files will be generated.
 * @return {Promise}
 */
codegen.generate = config => new Promise((resolve, reject) => {
  bundle(config.openapi)
    .catch(reject)
    .then((openapi) => {
      openapi = beautifier(openapi);

      const randomTitle = randomName().dashed;
      config.openapi = openapi;

      _.defaultsDeep(config, {
        openapi: {
          info: {
            title: randomTitle
          }
        },
        package: {
          name: _.kebabCase(_.result(config, 'openapi.info.title', randomTitle))
        },
        target_dir: path.resolve(os.tmpdir(), 'openapi-generated'),
        templates: path.resolve(__dirname, '../templates')
      });

      config.swagger = config.openapi;
      config.templates = `${config.templates}/${config.template}`;

      async function start () {
        await registerHelpers(config);
        await registerPartials(config);
        await generateDirectoryStructure(config);
      }

      start().then(resolve).catch(reject);
    });
});