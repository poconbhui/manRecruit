var mongodb = require('mongodb');
var Nationstates = require(__dirname+'/../helpers/nationstates.js');
var _            = require('underscore');


// The important arrays!
  var recruitable = [];
  var unrecruitable = [];
  var recruited = [];


// Keep an array of all nations currently in the feeders
var feederNations = [];
// Every 30 seconds, refresh this list
function updateFeederNations(callback){
  var NS = new Nationstates;
  var nations = [];

  var update = _.after(NS.feeders.length,function(){
    feederNations.length = 0;
    feederNations.push.apply(feederNations,nations);

    //console.log('feederNations Length:   '+feederNations.length);

    if(typeof callback == 'function'){
      callback(feederNations);
    }

    nations.length = 0;

  });

  _.forEach(NS.feeders, function(feeder){
    NS.api({'region':feeder, 'q':'nations'},function(response){
      nations = nations.concat(response['REGION']['NATIONS'][0].split(':'));
      update();
    });
  });
  
}


// Keep array of all nations currently in new list
var newNations = [];
function updateNewNations(callback){
  var NS = new Nationstates;
  NS.api({'q':'newnations'},function(response){

    newNations.length = 0;
    newNations.push.apply(
      newNations,
      response['WORLD']['NEWNATIONS'][0].split(',')
    );

    //console.log('newNations Length:      '+newNations.length);

    if(typeof callback == 'function'){
      callback(newNations);
    }
  });
}


function updateRecruitable(callback){
  recruitable = _.chain(newNations)
    .union(recruitable)
    .intersection(feederNations)
    .difference(unrecruitable)
    .uniq()
    .value();

  // Only have to worry about newNations that didn't make the list
  unrecruitable = _.chain(newNations)
    .difference(recruitable)
    .value();

  //console.log('- Recruitable Length:   '+recruitable.length);
  //console.log('- Unrecruitable Length: '+unrecruitable.length);

  if(typeof callback == 'function'){
    callback(recruitable,unrecruitable);
  }
}
//updateRecruitable();
//setInterval(updateRecruitable,5*1000);

function boot_nationUpdateLoop(){
  // Set on intervals thereafter
  setInterval(updateNewNations, 30*1000);
  setInterval(updateFeederNations, 30*1000);
  setInterval(updateRecruitable, 15*1000);
}


/***
 * Define MongoDB Connections here
 ***/
//var nationDB = null;
var uri = process.env.MONGOLAB_URI || 'mongodb://127.0.0.1:27017/nation_db';

function nationDB(callback){
  mongodb.MongoClient.connect(uri, {'safe': true}, function(error, db){

    if(error){
      console.log('ERROR CONNECTING TO MONGODB: ',error);
      return;
    }

    callback(error,db);
  });
}

nationDB(function(error, db){
  // Initialization:
  //  Find newNations.
  //  Generate unrecruitable list from nations in newNations that have
  //    already been recruited.
  //  Find feederNations
  //  Generate recruitable list given newNations, feederNations
  //    and unrecruitable list

  // Get newNations
  updateNewNations(function(newNations){

    // find newNations already in database
    db.collection('nations',function(error,nation_collection){
      nation_collection
        .find({'name':{$in:newNations}})
        .toArray(function(error,results){
          
          db.close();

          if(error){
            console.log('There was an error loading initial nations: ',error);
            return;
          }

          // Generate unrecruitable list from database results
          unrecruitable = _.map(results, function(result){
            return result.name;
          });
          

          // Find feederNations
          updateFeederNations(function(){

            // NOW generate recruitable list
            updateRecruitable(function(){

              // Boot update loops now that everything is done
              boot_nationUpdateLoop();

            });

          });

        }); //toArray
    }); //nationDB.collection
  }); //updateNewNations

}); // nationDB



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
    var nation = recruitable.shift();
    return nation;
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
    nationDB(function(error, db){
      db.collection('nations',function(error,nation_collection){
        if(error) callback(error,null, db);
        else      callback(null, nation_collection, db);
      });
    });
  };

  // Add nation and data to the recruited list
  this.addRecruited = function(data, callback){
    data.date = new Date;

    getNationCollection(function(error, nation_collection, db){
      //recruited.push(data);
      // If error, return error and die
      if(error){
        db.close();
        callback(error);
        return false;
      }

      //data._id = data.name;
      nation_collection.insert(data, {w:1}, function(error,result){
        db.close();
        if(typeof callback == 'function'){
          callback(error,result);
        }
      });
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
      if(doc.date && doc.recruiter && doc.name){

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

    getNationCollection(function(error, nation_collection, db){
      nation_collection.mapReduce(map, reduce,
        {
          'query':query,
          'out':{inline:1}
        },
        function(error,result){

          db.close();

          if(error) callback(error);
          else{
            result = _.map(result, function(entry){
              return {'recruiter': entry._id, 'count': entry.value};
            });
            callback(null, result);
          }
        }
      );
    });

  };


  this.find = function(nationName, callback){
    var error = null;

    if(_.contains(recruitable, nationName)){
      callback(null, {'name': nationName, 'status': 'recruitable'});
      return true;
    }
    else{
      getNationCollection(function(error, nation_collection, db){
        nation_collection.findOne(
          {'name':nationName},
          function(error, nation){

            db.close();

            if(error){
              callback(null, {'name':nationName, 'status': 'not found'});
            }
            else{
              if(!nation){
                nation = {name: nationName, status: 'not found'};
              }
              else{
                nation.status = 'recruited';
              }

              callback(null, nation);
            }
          }
        );
      });
    }
  }


};



module.exports = Nations;
