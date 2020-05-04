const OpenAPISampler = require('openapi-sampler');
const _ = require('lodash');
const slugg = require('slugg');
const md = require('markdown-it')();
const curlGenerator = require('./curl-builder');

const sharedStart = (array) => {
  const A = array.concat().sort();
  if (A.length > 0) {
    const a1 = A[0], a2 = A[A.length - 1], L = a1.length;
    let i = 0;
    while (i < L && a1.charAt(i) === a2.charAt(i)) i++;
    return a1.substring(0, i);
  } else {
    return '';
  }
};

const resolveAllOf = (schema) => {
  function lcm_two_numbers(x, y) {
     if ((typeof x !== 'number') || (typeof y !== 'number'))
      return false;
    return (!x || !y) ? 0 : Math.abs((x * y) / gcd_two_numbers(x, y));
  }
  function gcd_two_numbers(x, y) {
    x = Math.abs(x);
    y = Math.abs(y);
    while(y) {
      var t = y;
      y = x % y;
      x = t;
    }
    return x;
  }

  if (schema.allOf) {
    const schemas = [];
    if (!schema.properties) {
        schema.properties = {};
    }
    schema.allOf.forEach((s) => {
      s = resolveAllOf(s)
      for (const key in s.properties) {
        if (!schema.properties[key]) {
          schema.properties[key] = s.properties[key];
        } else {
          prop = schema.properties[key];
          new_prop = s.properties[key];

          if ('title' in new_prop) {
            prop.title = new_prop.title;
          }
          if ('multipleOf' in new_prop) {
            if ('multipleOf' in prop) {
              prop.multipleOf = lcm_two_numbers(
                prop.multipleOf, new_prop.multipleOf);
            } else {
              prop.multipleOf = new_prop.multipleOf;
            }
          }
          if ('maximum' in new_prop) {
            if ('maximum' in prop) {
              prop.maximum = Math.min(
                prop.maximum,
                new_prop.maximum);
            } else {
              prop.maximum = new_prop.maximum;
            }
          }
          if ('exclusiveMaximum' in new_prop) {
            if ('exclusiveMaximum' in prop) {
              prop.exclusiveMaximum = Math.min(
                prop.exclusiveMaximum,
                new_prop.exclusiveMaximum);
            } else {
              prop.exclusiveMaximum = new_prop.exclusiveMaximum;
            }
          }
          if ('minimum' in new_prop) {
            if ('minimum' in prop) {
              prop.minimum = Math.max(
                prop.minimum,
                new_prop.minimum)
            } else {
              prop.minimum = new_prop.minimum;
            }
          }
          if ('exclusiveMinimum' in new_prop) {
            if ('exclusiveMinimum' in prop) {
              prop.exclusiveMinimum = Math.max(
                prop.exclusiveMinimum,
                new_prop.exclusiveMinimum);
            } else {
              prop.exclusiveMinimum = new_prop.exclusiveMinimum;
            }
          }
          if ('maxLength' in new_prop) {
            if ('maxLength' in prop) {
              prop.maxLength = math.Min(
                prop.maxLength,
                new_prop.maxLength);
            } else {
              prop.maxLength = new_prop.maxLength;
            }
          }
          if ('minLength' in new_prop) {
            if ('minLength' in prop) {
              prop.minLength = math.Max(
                prop.minLength,
                new_prop.minLength);
            } else {
              prop.minLength = new_prop.minLength;
            }
          }
          if ('pattern' in new_prop) {
            if ('pattern' in prop) {
              prop.pattern = `(?=${prop.pattern})(?=${new_prop.pattern})`;
            } else {
              prop.pattern = new_prop.pattern;
            }
          }
          if ('maxItems' in new_prop) {
            if ('maxItems' in prop) {
              prop.maxItems = math.Min(
                prop.maxItems,
                new_prop.maxItems);
            } else {
              prop.maxItems = new_prop.maxItems;
            }
          }
          if ('minItems' in new_prop) {
            if ('minItems' in prop) {
              prop.minItems = math.Max(
                prop.minItems,
                new_prop.minItems);
            } else {
              prop.minItems = new_prop.minItems;
            }
          }
          if ('uniqueItems' in new_prop) {
            if ('uniqueItems' in prop) {
              prop.uniqueItems = new_prop.uniqueItems || prop.uniqueItems;
            } else {
              prop.uniqueItems = new_prop.uniqueItems;
            }
          }
          if ('maxProperties' in new_prop) {
            if ('maxProperties' in prop) {
              prop.maxProperties = math.Min(
                prop.maxProperties,
                new_prop.maxProperties);
            } else {
              prop.maxProperties = new_prop.maxProperties;
            }
          }
          if ('minProperties' in new_prop) {
            if ('minProperties' in prop) {
              prop.minProperties = math.Max(
                prop.minProperties,
                new_prop.minProperties);
            } else {
              prop.minProperties = new_prop.minProperties;
            }
          }
          if ('enum' in new_prop) {
            if ('enum' in prop) {
              prop['enum'] = prop['enum'].filter(
                  value => s.properties[key]['enum'].includes(value));
            } else {
              prop['enum'] = new_prop['enum'];
            }
          }
          for (const c in ['type', 'items', 'description', 'format', 'default']) {
            if (c in new_prop) {
              if (c in prop) {
                assert(prop[c] == new_prop[c]);
              } else {
                prop[c] = new_prop[c];
              }
            }
          }
        }
      }
      if ('additionalProperties' in s) {
        if ('additionalProperties' in schema) {
          if (typeof schema.additionalProperties == 'boolean') {
            if (typeof s.additionalProperties == 'boolean') {
              schema.additionalProperties =
                schema.additionalProperties || s.additionalProperties;
            } else {
              schema.additionalProperties = s.additionalProperties;
            }
          } else {
            console.log("Differing types for additionalProperties");
          }
        }
      }
      if ('required' in s) {
        if ('required' in schema) {
          schema.required = [... new Set(Array.prototype.concat(s.required, schema.required))];
        } else {
          schema.required = s.required;
        }
      }
    });

    delete schema.allOf;
    return schema;
  }

  if (schema.properties) {
    const transformed = {};

    for (const key in schema.properties) {
      if (schema.properties[key].allOf) {
        transformed[key] = resolveAllOf(schema.properties[key]);
        continue;
      }
      transformed[key] = schema.properties[key];
    }

    schema.properties = transformed;

    return schema;
  }

  return schema;
};

const generateExample = schema => OpenAPISampler.sample(schema);

const mdToHTML = (text) => {
  const finalText = text || '';
  if (finalText.match(/\n/)) return md.render(finalText);
  return md.renderInline(finalText);
};

const beautifySchema = (schema) => {
  resolveAllOf(schema);
  schema.summaryAsHTML = mdToHTML(schema.summary);
  schema.descriptionAsHTML = mdToHTML(schema.description);

  if (schema.title) schema.slug = `schema-${slugg(schema.title)}`;
  if (!schema.example) schema.generatedExample = generateExample(schema);

  _.each(schema.properties, beautifySchema);
  _.each(schema.additionalProperties, beautifySchema);
  if (schema.items) beautifySchema(schema.items);

  return schema;
};

const beautifyOperation = (operation, operationName, pathName, options) => {
  operation.slug = slugg(`op-${operationName}-${pathName}`);
  operation.summaryAsHTML = mdToHTML(operation.summary);
  operation.descriptionAsHTML = mdToHTML(operation.description);

  if (operation.requestBody) {
    _.each(operation.requestBody.content, (contentType) => {
      if (contentType.schema) {
        contentType.schema = beautifySchema(contentType.schema);
      }
    });
  }

  if (operation.parameters) {
    operation.parameters = operation.parameters.filter(p => p.in !== 'body');
    operation.parameters.filter(p => p.schema).forEach(param => resolveAllOf(param.schema));

    operation.parameters.forEach((param) => {
      param.descriptionAsHTML = mdToHTML(param.description);
      if (param.schema) beautifySchema(param.schema);
    });

    operation.headers = operation.parameters.filter(p => p.in === 'header');
    operation.queryParams = operation.parameters.filter(p => p.in === 'query');
    operation.pathParams = operation.parameters.filter(p => p.in === 'path');
    operation.cookieParams = operation.parameters.filter(p => p.in === 'cookie');

  }
  if (options.curl) {
    operation.curl = curlGenerator(operation, operationName, pathName);
  }

  if (operation.responses) {
    _.each(operation.responses, (response) => {
      if (response.content) {
        _.each(response.content, (contentType) => {
          beautifySchema(contentType.schema);
        });
      }
      if (response.headers) {
        _.each(response.headers, (contentType) => {
          beautifySchema(contentType.schema);
        });
      }
    });
  }

  return operation;
};

const cleanBrackets = text => {
  let finalText = text;

  if (text.startsWith('{')) finalText = finalText.substr(1);
  if (text.endsWith('}')) finalText = finalText.slice(0, -1);

  return finalText;
};

module.exports = (openapi, config) => {
  openapi.basePath = openapi.basePath || '';
  openapi.info = openapi.info || {};
  openapi.info.descriptionAsHTML = mdToHTML(openapi.info.description);

  if (!openapi.components) openapi.components = {};
  if (!openapi.components.schemas) {
    openapi.__noSchemas = true;
    openapi.components.schemas = {};
  }

  _.each(openapi.components.schemas, beautifySchema);

  if (openapi.components.responses) {
    _.each(openapi.components.responses, (response) => {
      if (response.content) {
        _.each(response.content, (contentType) => {
          beautifySchema(contentType.schema);
        });
      }
      if (response.headers) {
        _.each(response.headers, (contentType) => {
          beautifySchema(contentType.schema);
        });
      }
    });
  }

  if (openapi.servers) {
    _.each(openapi.servers, server => {
      server.descriptionAsHTML = mdToHTML(server.description);
      _.each(server.variables, variable => {
        variable.descriptionAsHTML = mdToHTML(variable.description);
      });
    });
  }

  if (openapi.security) {
    openapi._security = [];

    _.each(openapi.security, security => {
      const name = Object.keys(security)[0];
      if (!openapi.components || !openapi.components.securitySchemes || !openapi.components.securitySchemes[name]) {
        throw new Error(`Security definition "${name}" is not in included in #/components/securitySchemes.`);
      }

      openapi.components.securitySchemes[name].descriptionAsHTML = mdToHTML(openapi.components.securitySchemes[name].description);
      openapi._security.push(openapi.components.securitySchemes[name]);
    });
  }

  _.each(openapi.paths, (path, pathName) => {
    path.endpointName = pathName === '/' ? 'root' : cleanBrackets(pathName.split('/')[1]);

    const basePath = openapi.basePath.trim();

    const newPathName = basePath.length ? `${basePath}/${pathName}` : pathName;
    if (newPathName !== pathName) {
      openapi.paths[newPathName] = path;
      delete openapi.paths[pathName];
    }

    const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'COPY', 'HEAD', 'OPTIONS', 'LINK', 'UNLIK', 'PURGE', 'LOCK', 'UNLOCK', 'PROPFIND'];

    _.each(path, (operation, operationName) => {
      if (httpMethods.includes(operationName.toUpperCase())) beautifyOperation(operation, operationName, pathName, config);
    });
  });

  openapi.endpoints = _.uniq(_.map(openapi.paths, 'endpointName'));

  const commonPrefix = sharedStart(Object.keys(openapi.paths));
  const levels = commonPrefix.split('/').length - 1;
  openapi.__commonPrefix = commonPrefix.split('/').slice(0, levels).join('/');

  return openapi;
};
