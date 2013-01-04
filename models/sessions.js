var _ = require('underscore');

var sessions = {};
var cleanupInterval = 30*60*1000;


// Periodically check sessions and delete any where the last access
// is longer than 30 mins
setInterval(function(){
  console.log('Running Session Cleanup');
  _.each(sessions, function(value,key){
    if(value.lastAccess < (new Date - cleanupInterval)){
      console.log('Removing Session: '+key);
      delete sessions[key];
    }
  });
}, cleanupInterval);


var Session = function(key){

  if(!sessions[key]){
    sessions[key] = {};
  }

  var session = sessions[key];


  // Update last access time
  session.lastAccess = new Date;


  this.set = function(key, value){
    return session[key] = value;
  }

  this.get = function(key){
    return session[key];
  }

  this.destroy = function(){
    delete sessions[key];
  }

};

module.exports = Session;
