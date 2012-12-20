var crypto = require('crypto');
var secret = 'pw';

var Users = function(username){
  this.username = username;

  this.verify = Users.verify(this.username, password);
};

Users.generatePassword = function(username){
  return crypto.createHash('md5').update(username+secret).digest('hex');
}

Users.verify = function(username, password){
  if(password == Users.generatePassword(username)){
    return true;
  }
  else{
    return false;
  }
};

module.exports = Users;
