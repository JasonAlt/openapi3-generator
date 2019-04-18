module.exports = (Handlebars, _) =>{

  /**
   * Checks if any secSchemes are oauth2
   */
  Handlebars.registerHelper('hasOAuth2Flows', (secSchemes, options) => {
    for (var s in secSchemes) {
        if (secSchemes[s].type == 'oauth2') {
            return options.fn(secSchemes);
        }
    }
      return options.inverse(secSchemes);
  });

}
