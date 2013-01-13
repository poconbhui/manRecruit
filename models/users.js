/*jslint node: true */
'use strict';

var crypto = require('crypto');
var secret = 'pw';

var User = function(username) {
  this.username = username;
};

User.prototype.generatePassword = function(callback) {
  callback(
    null,
    crypto.createHash('md5').update(this.username+secret).digest('hex')
  );

  return this;
};

User.prototype.verify = function(password_in, callback) {
  var _this = this;
  this.generatePassword(function(error, password) {
    console.log('USER: '+_this.username);
    console.log('FOUND: '+password);
    console.log('GIVEN: '+password_in);
    if(password === password_in) {
      callback(null, true);
    }
    else {
      callback(null, false);
    }
  });

  return this;
};

module.exports = User;
