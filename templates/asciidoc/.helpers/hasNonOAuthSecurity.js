module.exports = (Handlebars, _) =>{

  /**
   * Checks if any secSchemes are oauth2
   */
  Handlebars.registerHelper('hasNonOAuthSecurity', (secSchemes, options) => {
    for (var s in secSchemes) {
        if (secSchemes[s].type != 'oauth2') {
            return options.fn(this);
        }
    }
      return options.inverse(this);
  });

}
