function parseCookies(cookieString){
  //console.log('COOKIE STRING');
  //console.log(cookieString);

  if(typeof cookieString !== 'string'){
    return {};
  }

  var cookies = {};
  cookieString.split(';').forEach(function( cookie ) {
    var parts = cookie.split('=');
    cookies[ parts[ 0 ].trim() ] = ( parts[ 1 ] || '' ).trim();
  });

  return cookies;
}

module.exports = parseCookies;
