module.exports = (Handlebars, _) =>{

  /**
   * Tagify a string.
   */
  Handlebars.registerHelper('tagify', (str) => {
    return str.replace(/\s+/g,'_');
  });

}
