module.exports = (Handlebars, _) =>{

  Handlebars.registerHelper('breakAtSlash', s => {
    try {
      return s.replace(/\//g, "/&#8203;");
    } catch (e) {
      return '';
    }
  });

}
