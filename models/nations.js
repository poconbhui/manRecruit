/*jslint node: true */
'use strict';

var mongo = require('mongodb'),
    mongoURI = process.env.MONGOLAB_URI || 
               'mongodb://127.0.0.1:27017/nation_db',
    Nationstates = require(__dirname+'/../helpers/nationstates.js'),
    _            = require('underscore');


//Open db connection to MongoDB database
var nationDB;
mongo.MongoClient.connect(
  mongoURI,

  {
    'db': {
      'w': 1
    },
    'server': {
      'auto_reconnect': true
    }
  },

  function(error, db) {

    if(error) {
      console.log('ERROR CONNECTING TO MONGODB: ',error);
    }

    //This is fine, because the event loop will keep it open
    nationDB = db;

    bootNationUpdateLoops();

  }
);


// The important arrays!
var recruitable = [],
    unrecruitable = [],
    recruited = [];


// Keep an array of all nations currently in the feeders
var feederNations = [];
function updateFeederNations(callback) {
  var NS = new Nationstates();
  var nations = [];

  var update = _.after(NS.feeders.length,function() {
    feederNations.length = 0;
    feederNations.push.apply(feederNations,nations);

    //console.log('feederNations Length:   '+feederNations.length);

    if(typeof callback == 'function') {
      callback(feederNations);
    }

    nations.length = 0;

  });

  _.forEach(NS.feeders, function(feeder) {
    NS.api({'region':feeder, 'q':'nations'},function(response) {
      nations = nations.concat(response.REGION.NATIONS[0].split(':'));
      update();
    });
  });
  
}


// Keep array of all nations currently in new list
var newNations = [];
function updateNewNations(callback) {
  var NS = new Nationstates();
  NS.api({'q':'newnations'},function(response) {

    newNations.length = 0;
    newNations.push.apply(
      newNations,
      response.WORLD.NEWNATIONS[0].split(',')
    );

    //console.log('newNations Length:      '+newNations.length);

    if(typeof callback == 'function') {
      callback(newNations);
    }
  });
}


function updateRecruitable(callback) {
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

  console.log('RECRUITABLE LENGTH:   ' + recruitable.length);
  console.log('UNRECRUITABLE LENGTH: ' + unrecruitable.length);

  if(typeof callback == 'function') {
    callback(recruitable,unrecruitable);
  }
}



/**
 * Define Nation object from here
 */

var Nation = function(region_in) {
  //var _this = this;

  this._region = region_in;
  if(!region_in) return false;

};

// Return all recruitable
Nation.prototype.getAllRecruitable = function(callback) {
  callback(null, recruitable);
  return this;
};

Nation.prototype.countRecruitable = function(callback) {
  callback(null, recruitable.length);
  return this;
};

// Pop first nation off list
Nation.prototype.popFirstRecruitable = function(callback) {
  callback(null, recruitable.shift());

  return this;
};

// return all unrecruitable
Nation.prototype.getAllUnrecruitable = function(callback) {
  callback(null, unrecruitable);

  return this;
};

Nation.prototype.addUnrecruitable = function(nation) {
  unrecruitable.push(nation);

  return this;
};


Nation.prototype._getNationCollection = function _getNationCollection(
  callback
) {
  nationDB.collection('nations',function(error, nation_collection) {
    if(error) callback(error, null);
    else      callback(null,  nation_collection);
  });
};

// Add nation and data to the recruited list
Nation.prototype.addRecruited = function(data, callback) {
  data.date = new Date();

  this._getNationCollection(function(error, nation_collection) {
    //recruited.push(data);
    // If error, return error and die
    if(error) {
      callback(error);
      return false;
    }

    //data._id = data.name;
    nation_collection.insert(data, {w:1}, function(error,result) {
      if(typeof callback == 'function') {
        callback(error,result);
      }
    });
  });

  return this;
};

Nation.prototype.getRecruitedData = function(callback) {
  callback(null, recruited);

  return this;
};


/**
 * Get recruitment numbers from mapReduce run
 * Signatures:
 *  callback
 *  recruiter, callback
 */
Nation.prototype.getRecruitmentNumbers = function() {

  // Parse getRecruitmentNumbers args
  var callback;
  var query = {};
  if(arguments.length == 1) {
    callback = arguments[0];
  }
  else {
    query.recruiter = arguments[0];
    callback = arguments[1];
  }
  

  /**
   * Get important dates here
   */

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
  
  query.date = { $gte:lastLastSunday };


  /**
   * Define MapReduce functions here
   */

  var map = function() {
    /*global emit: false*/

    var doc = this;
    if(doc.date && doc.recruiter && doc.name) {

      // Get date in doc
      var date = new Date(doc.date);

      // Find date of last Sunday
      var today = new Date();
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

  var reduce = function(key, vals) {
    var totals = {'prev':0,'current':0};

    for(var i in vals) {
      totals.prev = totals.prev + vals[i].prev;
      totals.current = totals.current + vals[i].current;
    }

    return totals;
  };

  this._getNationCollection(function(error, nation_collection) {
    nation_collection.mapReduce(map, reduce,
      {
        'query':query,
        'out':{inline:1}
      },
      function(error,result) {
        if(error) {
          callback(error, null);
        }
        else {
          result = _.map(result, function(entry) {
            return {'recruiter': entry._id, 'count': entry.value};
          });

          callback(null, result);
        }

      }
    );
  });

  return this;
};


Nation.prototype.find = function(nationName, callback) {
  var error = null;

  if(_.contains(recruitable, nationName)) {
    callback(null, {'name': nationName, 'status': 'recruitable'});
    return true;
  }
  else {
    this._getNationCollection(function(error, nation_collection) {
      nation_collection.findOne(
        {'name':nationName},
        function(error, nation) {
          if(error) {
            callback(null, {'name':nationName, 'status': 'not found'});
          }
          else {
            if(!nation) {
              nation = {name: nationName, status: 'not found'};
            }
            else {
              nation.status = 'recruited';
            }

            callback(null, nation);
          }
        }
      );
    });
  }
};



/***
 * Boot Nation Update Loops
 ***/
function bootNationUpdateLoops(){
  Nation.prototype._getNationCollection(function(error, nation_collection) {
    // Initialization:
    //  Find newNations.
    //  Generate unrecruitable list from nations in newNations that have
    //    already been recruited.
    //  Find feederNations
    //  Generate recruitable list given newNations, feederNations
    //    and unrecruitable list

    // Get newNations
    updateNewNations(function(newNations) {

      // find newNations already in database
      nation_collection
        .find({'name':{$in:newNations}})
        .toArray(function(error, results) {

          if(error) {
            console.log('There was an error loading initial nations: ',error);
            return;
          }

          // Generate unrecruitable list from database results
          unrecruitable = _.map(results, function(result) {
            return result.name;
          });
          

          // Find feederNations
          updateFeederNations(function() {

            // NOW generate recruitable list
            updateRecruitable(function() {

              // Boot update loops now that everything is done
              setInterval(updateNewNations, 30*1000);
              setInterval(updateFeederNations, 30*1000);
              setInterval(updateRecruitable, 15*1000);

            });

          });

        }); //toArray

    }); //updateNewNations

  }); // Nation.prototype._getNationCollection
}




module.exports = Nation;

