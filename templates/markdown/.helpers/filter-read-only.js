module.exports = (Handlebars, _) =>{
  Handlebars.registerHelper('filterReadOnly', (prop, omitReadOnly, options) => {
    if (!prop) return null;
    if (prop.readOnly && omitReadOnly) {
        return options.inverse(this);
    } else {
        return options.fn(this);
    }
  });
}
