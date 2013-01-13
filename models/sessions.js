/*jslint node: true */
'use strict';

var _ = require('underscore');

var sessions = {};
var cleanupInterval = 30*60*1000;


// Periodically check sessions and delete any where the last access
// is longer than 30 mins
setInterval(function(){
  console.log('Running Session Cleanup');
  _.each(sessions, function(value,key){
    if(value.lastAccess < (new Date() - cleanupInterval)){
      console.log('Removing Session: '+key);
      delete sessions[key];
    }
  });
}, cleanupInterval);


var Session = function(key){

  if(!sessions[key]){
    sessions[key] = {};
  }

  this._session = sessions[key];
  this._key = key;


  // Update last access time
  this._session.lastAccess = new Date();

};


Session.prototype.set = function(key, value, callback){
  var setReturn = this._session[key] = value;

  if(typeof callback == 'function'){
    callback(null, setReturn);
  }

  return this;
};

Session.prototype.get = function(key, callback){
  callback(null, this._session[key]);

  return this;
};

Session.prototype.destroy = function(callback){
  var delVal = delete this._sessions[this._key];

  if(typeof callback == 'function') {
    callback(null, delVal);
  }

  return this;
};

module.exports = Session;
