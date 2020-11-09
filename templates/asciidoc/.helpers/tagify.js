module.exports = (Handlebars, _) =>{

  /**
   * Tagify a string.
   */
  Handlebars.registerHelper('tagify', (str) => {
    if (str) {
      return str.replace(/\s+/g,'_');
    } else {
      return "";
    }
  });

}
