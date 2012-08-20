var xml2js = require('xml2js')
  , http = require('http');

//var xmlGetParser = new xml2js.Parser();
    //xmlGetParser.setMaxListeners(0);
var xmlGet = function(options, callback) {
  http.get(options, function(res) {
    var xmlReturned = "";

    res.setEncoding('utf8');

    res
      .on('data', function(chunk) {
        xmlReturned = xmlReturned + chunk;
      })
      .on('end', function(){
        // add some error checking

        var parser = new xml2js.Parser();
        //console.log(xmlReturned);
        parser.parseString(xmlReturned, function(err, result) {
          //console.log(err);
          //console.log(result);
          callback(result);
        });
      })
      .on('error', function(e){
        console.log('problem with request: ');
        console.log(e);
      });
  });
}

var nationstates = {
  feeders: [
    "the_pacific",
    "the_north_pacific",
    "the_south_pacific",
    "the_east_pacific",
    "the_west_pacific"
  ],

  sinkers: [
    "lazarus",
    "osiris"
  ],

  api: function(options, callback) {
    
    var request = "";

    var what = Object.prototype.toString;

    // parse options to request
    switch(what.call(options)) {
      case '[object Array]':
        request = "q="+options.join('+');
        break;
      case '[object Object]':
        for(var key in request) {
          var val = request[key];
          if(what.call(val) == '[object Array]') {
            val = val.join('+');
          }

          request = request + key + "=" + val + "&";
        }

        request = request.replace(/\&$/,'');
      default:
        request = options
    };

    var options = {
      host: 'www.nationstates.net',
      port: '80',
      path: '/cgi-bin/api.cgi?' + request,
    };

    xmlGet(options, function(res) {
      callback(res);
    });
  }

};

module.exports = nationstates;
