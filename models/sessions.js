var _ = require('underscore');

var sessions = {};


// Periodically check sessions and delete any where the last access
// is longer than 30 mins
setInterval(function(){
  _.each(sessions, function(value,key){
    if(value.lastAccess < new Date - 30*60*1000){
      delete sessions[key];
    }
  });
}, 30*60*1000);


var Session = function(key){

  if(!sessions[key]){
    sessions[key] = {};
  }

  var session = sessions[key];


  // Update last access time
  session.lastAccess = new Date;


  this.set = function(key, value){
    session[key] = value;
    return true;
  }

  this.get = function(key){
    return session[key];
  }

  this.destroy = function(){
    delete sessions[key];
  }

};

module.exports = Session;
