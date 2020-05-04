module.exports = (Handlebars, _) =>{

  Handlebars.registerHelper('filterPathByTag', (path, tag, options) => {
    if (!path) return null;
    var filtered_path = {};
    var anyOps = false;
    var ret = "";
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
    for (var prop in path) {
        if (!(prop.toLowerCase() in ops)) {
            filtered_path[prop] = path[prop];
        }
    }
    for (var op in ops) {
        opname = ops[op];
        if (opname in path) {
            for (var optag in path[opname].tags) {
                if (tag == path[opname].tags[optag]) {
                    filtered_path[opname] = path[opname];
                    anyOps = true;
                }
            }
        }
    }
    if (anyOps) {
        return filtered_path;
    } else {
        return {};
    }
  });
}
