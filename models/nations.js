var Nationstates = require(__dirname+'/../helpers/nationstates.js');
var _            = require('underscore');


// The important arrays!
  var recruitable = [];
  var unrecruitable = [];
  var recruited = [];


// updateNations takes in a list of oldNations and badNations and a callback
// It finds a list of new nations, prepends it to oldNations, removes
// the nations in this new list which also appear in badNations and
// removes the ones that aren't in the feeders.
// It then calls a callback(nations, badNations) where nations is the new
// list of recruitable nations, and badNations is the new list of bad nations
function updateNations(oldNations, oldBadNations, callback){
  var NS = new Nationstates;

  var feederNations = [];
  var newNations = [];

  var parseArray = function(){
    
    // Add the newest nations to the front of the current working list
    newNations = _.union(newNations, oldNations);
    unfilteredList = newNations;

    // Keep only newNations currently in the feeders
    newNations = _.intersection(newNations, feederNations);

    // Keep only newNations that aren't in the bad list
    newNations = _.difference(newNations, oldBadNations);

    // The bad nations are now any nation that have been removed in the
    // filtering
    oldBadNations = _.difference(unfilteredList, newNations);
    
    // Set nations to new filtered list
    oldNations = newNations;


    if(typeof callback == 'function'){
      callback(oldNations, oldBadNations);
    }
  };

  // Set parseArray to run only after all the feeders have loaded
  // and the newNations have been loaded
  parseArray = _.after(NS.feeders.length + 1, parseArray);

  // Find all nations in all feeders
  _.each(NS.feeders, function(feeder){

    NS.api({ 'region':feeder, 'q':'nations' }, function(result){
      if(result){
        // add result to feeder nations
        feederNations = feederNations.concat(result['REGION']['NATIONS'][0].split(':'));
      }
      else{
        console.log("There was some error loading nations from ",feeder);
      }

      parseArray();
    });

  });

  // Get list of new nations
  NS.api({'q':'newnations'}, function(result){

    if(result){
      newNations = result['WORLD']['NEWNATIONS'][0].split(',');
    }
    else{
      console.log("There was some problem getting new nations");
    }

    parseArray();

  });

}; //end updateNations



// Set nations to be updated regularly
// Make initial results bad, and update from there
updateNations([],[], function(newNations, newBadNations){
    //  DEBUG, actually want lists populated
    recruitable = newNations;
    unrecruitable = newBadNations;
//  nations = [];
//  badNations = _.union(newNations, newBadNations);

  // Run update every 30 seconds
  setInterval(function(){

    var oldNations = recruitable;
    recruitable = [];

    var oldBadNations = unrecruitable;
    unrecruitable = [];

    updateNations(
      oldNations,
      oldBadNations,
      function(newNations, newBadNations){
        recruitable = newNations;
        unrecruitable = _.union(unrecruitable, newBadNations);
      }
    );

  }, 30*1000);

});



// Define MongoDB Connections here
var mongodb = require('mongodb');

var host = '127.0.0.1';
var port = 27017;
var nationDB = new mongodb.Db(
  'nation_db',
  new mongodb.Server(
    host,
    port
  ),
  {'safe':false}
);

nationDB.open(function(){});


var Nations = function(region_in){
  var self = this;

  var region = region_in;
  if(!region_in){return false;}

  // Return all recruitable
  this.getAllRecruitable = function(){
    return recruitable;
  };

  this.countRecruitable = function(){
    return recruitable.length;
  };

  // Pop first nation off list
  this.popFirstRecruitable = function(){
    return recruitable.shift();
  };

  // Set recruitable list from input array
  this.setAllRecruitable = function(recruitable_in){
    recruitable = recruitable_in;
    return true;
  };

  // return all unrecruitable
  this.getAllUnrecruitable = function(){
    return unrecruitable;
  };

  this.setAllUnrecruitable = function(unrecruitable_in){
    unrecruitable = unrecruitable_in;
  };

  this.addUnrecruitable = function(nation){
    unrecruitable.push(nation);
  };


  var getNationCollection = function(callback){
    nationDB.collection('nations',function(error,nation_collection){
      if(error) callback(error);
      else      callback(null, nation_collection);
    });
  };

  // Add nation and data to the recruited list
  this.addRecruited = function(data, callback){
    data.date = new Date;

    getNationCollection(function(error, nation_collection){
      //recruited.push(data);
      // If error, return error and die
      if(error){
        callback(error);
        return false;
      }

      data._id = data.nation;
      nation_collection.insert(data, {}, callback)
    });
  };

  this.getRecruitedData = function(){
    return recruited;
  };


  // Get recruitment numbers from mapReduce run
  this.getRecruitmentNumbers = function(){

    // Get date of two Sundays ago
    var today = new Date();
    //today.setUTCDate(today.getUTCDate() + 8);
    var lastLastSunday = new Date(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate()
    );
    lastLastSunday.setUTCDate(
      lastLastSunday.getUTCDate() - lastLastSunday.getUTCDay() - 7
    );


    // Parse getRecruitmentNumbers args
    var callback;
    var query = {date:{$gte:lastLastSunday}};
    if(arguments.length == 1){
      callback = arguments[0];
    }
    else{
      query.recruiter = arguments[0];
      callback = arguments[1];
    }
    

    var map = function(){
      var doc = this;
      if(doc.date && doc.recruiter && doc.nation){

        // Get date in doc
        var date = new Date(doc.date);

        // Find date of last Sunday
        var today = new Date;
        var lastSunday = new Date(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate()
        );
        lastSunday.setUTCDate(
          lastSunday.getUTCDate() - lastSunday.getUTCDay()
        );

        // Is it older than last Sunday?
        if(date < lastSunday) emit(doc.recruiter,{'prev':1,'current':0});
        else                  emit(doc.recruiter,{'prev':0,'current':1});
      }
    };

    var reduce = function(k, vals){
      var totals = {'prev':0,'current':0};

      for(var i in vals){
        totals.prev = totals.prev + vals[i].prev;
        totals.current = totals.current + vals[i].current;
      }

      return totals;
    };

    getNationCollection(function(error, nation_collection){
      nation_collection.mapReduce(map, reduce,
        {
          'query':query,
          'out':{inline:1}
        },
        function(error,collection){
          if(error) callback(error);
          else{
            collection = _.map(collection, function(entry){
              return {'recruiter': entry._id, 'count': entry.value};
            });
            callback(null, collection);
          }
        }
      );
    });

  };


  this.find = function(nationName, callback){
    var error = null;

    if(_.contains(recruitable, nationName)){
      callback(null, {'nation': nationName, 'status': 'recruitable'});
      return true;
    }
    else{
      getNationCollection(function(error, nation_collection){
        nation_collection.findOne(
          {'nation':nationName},
          function(error, nation){
            if(error){
              callback(null, {'nation':nationName, 'status': 'not found'});
            }
            else{
              nation.status = 'recruited';
              callback(null, nation);
            }
          }
        );
      });
    }
  }


};


/*
setTimeout(function(){
  console.log("TRYING");
  var N = new Nations('tni');
  N.addRecruited({'nation':'dumbbum','recruiter':'TD'},function(error,result){
    console.log("RAN");
    console.log("ERROR: ",error);
    console.log("RESULT: ",result);
  });
  nationDB.collection('nations',function(err,coll){
    coll.find({'recruiter':'TD','date':{$lt:new Date(new Date()-5*60*1000)}}).toArray(function(err, doc){
      console.log("FIND ERR: ",err);
      console.log("FOND DOC: ",doc);
    });
  });
  N.getRecruitmentNumbers(function(collection){
    console.log("AFTER: ",collection);
  });

},1*1000);
*/


module.exports = Nations;
