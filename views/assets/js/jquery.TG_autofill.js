(function($) {
  function toTitleCase(str) {
    return str.replace(
      /\w\S*/g,
      function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      }
    );
  }

  $.fn.TG_autofill = function(nation) {
    var TG = this.val();
    var nation_link = nation;
    var nation_name = toTitleCase(nation.replace(/_/g,' '));

    TG = TG
      .replace('#NATION#',nation_name)
      .replace('#NATION_LINK#',nation_link);

    this.val(TG);
  };
})(jQuery)
