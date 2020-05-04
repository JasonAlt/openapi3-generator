module.exports = (Handlebars, _) =>{

  Handlebars.registerHelper('acceptedValues', items =>{
    if(!items) return ' __Any__';

    return items.map(i => `\`${i}\``).join(', ');
  });

}
