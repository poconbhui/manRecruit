//= require bootstrap.min.js
//= require jquery.cookie.js
//= require jquery.TG_autofill.js

$(function(){ $('.require-js').show().attr("aria-hidden","false"); });


// Fix the damn heights
$(function() {
  var $NSdiv = $('#NSdiv');
  var $NSiframe = $('#NSiframe');

  if($NSdiv.length) {
    $(window).resize(function() {
      var height = $(window).height() - $NSdiv.offset().top;

      $NSdiv.height(height - 10);
      $NSiframe.height(height - 10);
    })
    .resize();
  }
});

$(function() {
  var $offeredNation = $('#offeredNation');

  if($offeredNation.length) {
    var nationSource = $('#nationSource').val() || "";
    var offeredNation = $('#offeredNation').val() || "";
    var TGCookieName = nationSource+"_TG";
    var TG = $.cookie(TGCookieName) || "";

    var $TGSource = $('#TGSource');
    var $TGParsed = $('#TGParsed');

    $TGSource
      .val(TG)
      .change(function() {
        $TGParsed.val($(this).val()).TG_autofill(offeredNation)
      })
      .change();

    $TGParsed
      .click(function() {
        $(this).select();
      })
      .click();

    $('#SaveTG').click(function() {
      $.cookie(TGCookieName, $TGSource.val());
    });
  }

});
