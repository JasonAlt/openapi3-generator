module.exports = (Handlebars, _) =>{

  Handlebars.registerHelper('escapePattern', pattern => {
    try {
      pattern = pattern.replace(/\\/g, "\\\\");
      pattern = pattern.replace(/\*/g, "pass:[*]");
      return pattern.replace(/\|/g, "\\|&#8203;");
    } catch (e) {
      return '';
    }
  });

}
