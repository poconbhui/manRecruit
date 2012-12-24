var userAgent = "Node.js NSAPI by Poopcannon. poopcannon@gmail.com"

var xml2js = require( 'xml2js' )
  , http   = require( 'http'   );


// Get xml data via http.get method and return it as a parsed object
var xmlGet = function(options, callback) {

  (function runRequest(){
    var req = http.request(options, function(res) {
      var xmlReturned = "";

      res.setEncoding('utf8');

      res
        .on('data', function(chunk) {
          xmlReturned = xmlReturned + chunk;
        })
        .on('end', function(){
          // add some error checking

          // check if we've been locked out of the API
          if(
            xmlReturned.match(
              "<h1>Too Many Requests From Your IP Address</h1>"
            ) != null
          ){
            // We've been locked out! Return false and exit
            callback(false);
            return false;
          }

          // We've got some data! Parse and return
          var parser = new xml2js.Parser();
          //console.log(xmlReturned);
          parser.parseString(xmlReturned, function(err, result) {
            callback(result);
          });
        })
        .on('error', function(e){
          console.log('problem with request: ');
          console.log(e);
          callback(false);
        });
    });

    req.on('error', function(error){
      console.log(error);

      if(error.code == 'ECONNRESET'){
        // Just retry the request
        runRequest();
      }

    });
    req.end();

  })();
};


// The main Nationstates object output by this module
var nationstates = function(options){
  var self = this;

  options = options || {};

  // Define default values for feeders
  self.feeders = options.feeders || [
    "the_pacific",
    "the_north_pacific",
    "the_south_pacific",
    "the_east_pacific",
    "the_west_pacific"
  ];

  // Define default values for sinkers
  self.sinkers = options.sinkers || [
    "lazarus",
    "osiris",
    "balder"
  ];

  self.userAgent = options.userAgent || userAgent;

  // The actual API used for interacting with Nationstates
  self.api = function(options, callback) {
    
    var request = "";

    var what = Object.prototype.toString;

    // parse options to request
    switch(what.call(options)) {

      // If the input options are an array, assume this is a list
      // of data to parse and query
      case '[object Array]':
        request = "q="+options.join('+');
        break;

      // If input options is an object, assume this is a list of
      // key-value pairs to query.
      // If a value is an array, assume this is a list of data
      case '[object Object]':
        for(var key in options) {

          var value = options[key];

          // We expect the value to be a string or an array
          // If it's an array, we have to parse it to a string
          if(what.call(value) == '[object Array]') {
            value = value.join('+');
          }

          request = request + key + "=" + value + "&";
        }

        // Pop off the last & from the request string
        request = request.replace(/\&$/,'');


        break;

      // By default, we'll assume we've been passed a string
      default:
        request = options;
        break;

    };

    // Http options, specifying how to connect to the NSAPI
    var http_options = {
      host: 'www.nationstates.net',
      port: '80',
      path: '/cgi-bin/api.cgi?' + request,
      headers:{'User-Agent': self.userAgent}
    };

    //console.log('OPTIONS', http_options);

    // Run the query
    xmlGet(http_options, function(res) {
      callback(res);
    });

  }; //end api

}; //end nationstates

module.exports = nationstates;
