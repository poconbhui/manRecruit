
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , Seq = require('seq')
  , ns = require('./helpers/nationstates');

var app = express.createServer(express.logger());

var port = process.env.PORT || 5000;
app.set('port', port);


function getNationsList(callback){
  Seq()

    // push feeders into pareach
    .seq(function() {
      this(false,ns.feeders)
    })
    .flatten()

    // run for each feeder
    .parEach(function(feeder){
      B = this;

      ns.api("region="+feeder+"&q=nations&v=3", function(res){
        r = res['NATIONS'];
        B.vars[feeder] = r.split(':');
        B(false);
      });
    })

    // get new nations
    .par(function(){
      B = this;

      ns.api("q=newnations", function(res) {
        r = res['NEWNATIONS'];
        B.vars['newNations'] = r.split(',');
        B(false);
      });
    })

    // stuff it all together
    //merge nation arrays
    .seq(function(newNations){
      //console.log('SEQ RETURN');
      //console.log(this.vars);

      var rawList = this.vars;

      function ltFeeders(i){
        for(var k=0; k<ns.feeders.length; ++k){
          if(i<rawList[ns.feeders[k]].length){
            return true;
          }
        }
        return false;
      }
      function feedersLeft(i){
        var ret = [];

        for(var k=0; k<ns.feeders.length; ++k){
          if(i<rawList[ns.feeders[k]].length){
            ret.push(ns.feeders[k]);
          }
        }
        return ret;
      }


      var merged = [];
      for(var i=0; ltFeeders(i); ++i){
        f = feedersLeft(i);
        for (var j=0; j<f.length; ++j){
          merged.push(rawList[f[j]].shift());
        }
      }

      newMerged = merged.filter(function(el){
        return rawList['newNations'].indexOf(el) < 0;
      });

      merged = rawList['newNations'].concat(newMerged);

      //console.log(merged);


      //remove nations already in database

      var Recruited = {compliment: function(array){ return array; }};

      newMerged = Recruited.compliment(merged);
      merged = newMerged;

      //remove nations from badlist
      
      newMerged = merged.filter(function(el){
        return badNations.indexOf(el) < 0;
      });
      merged = newMerged;

      if(typeof callback === 'function'){
        callback(merged);
      }
    });
}


// Nation generation and storage
var nations = ["a","b","c","d"];
var badNations = ["c","d","e"];
getNationsList(function(nationArr){
  nations = nationArr;
});
t = setInterval(function(){
  getNationsList(function(nationArr){
    nations = nationArr;
  });
}, 30*1000);







app.get('/', function(req,res){
  var nation = nations.pop() || 'EMPTY!';
  res.write('GIVEN: ' + nation);
  res.end();
});



http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
