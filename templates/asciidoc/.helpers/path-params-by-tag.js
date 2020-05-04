module.exports = (Handlebars, _) =>{

  Handlebars.registerHelper('pathParamsByTag', (paths, tagName, paramIn, options) => {
    // Return an object containing all the path-level path parameters for 
    // a set of paths that have operations that match a tag
    if (!paths) return null;
    var path_params = null;
    const ops = [
        "get",
        "put",
        "post",
        "delete",
        "options",
        "head",
        "patch",
        "trace"
    ];
    for (var path in paths) {
        var pathobj = paths[path];
        for (var op in ops) {
            var opname = ops[op];
            if (opname in pathobj) {
                for (var optag in pathobj[opname].tags) {
                    if (tagName == pathobj[opname].tags[optag]) {
                        if (pathobj.parameters) {
                            for (var param in pathobj.parameters) {
                                var paramobj = pathobj.parameters[param];
                                if (paramobj['in'] == paramIn) {
                                    if (path_params == null) {
                                        path_params = {};
                                    }
                                    if (!(paramobj['name'] in path_params)) {
                                        path_params[paramobj['name']] = paramobj;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    if (path_params == null) {
        return options.inverse(paths);
    } else {
        return options.fn(path_params);
    }
  });
}
