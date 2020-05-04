module.exports = (Handlebars, _) =>{

  Handlebars.registerHelper('escapeTags', html => {
    try {
      var out = "";
      var data = html;
      do {
        var block_start = data.search(/<dl>|<pre>|<p>/);
        if (block_start != -1) {
          var before_block = data.slice(0, block_start);
          var after_block = data.slice(block_start);
          before_block = before_block.replace(/(<[^\/][^>]*>)/g, "+++$1")
          before_block = before_block.replace(/(<\/[^>]*>)/g, "$1+++")
          out += before_block;
          out += "+++"
          var block_end = after_block.search(/<\/dl>|<\/pre>|<\/p>/);
          out += after_block.slice(0, block_end);
          var block_close = after_block.slice(block_end);
          if (block_close.startsWith("</dl>")) {
            out += "</dl>+++";
            data = block_close.slice(5);
          } else if (block_close.startsWith("</pre>")) {
            out += "</pre>+++";
            data = block_close.slice(6);
          } else {
            out += "</p>+++";
            data = block_close.slice(4);
          }
        } else {
          data = data.replace(/(<[^\/][^>]*>)/g, "+++$1")
          data = data.replace(/(<\/[^>]*>)/g, "$1+++")
          out += data;
          data = "";
        }
      } while (data);
      return out;
    } catch (e) {
      return e;
    }
  });

}
