var Users = require(__dirname+'/../models/users');

var userController = {

  'index': function(req,res){
    res.render('users/index.html.jade');
  },

  'new': function(req,res){
    res.render('users/new.html.jade');
  },

  'create': function(req,res){
    var username = req.body.username;
    res.redirect('/users/'+username);
  },
    
  'show': function(req,res){
    var username = req.params.user;
    res.send({'username':username,'password':Users.generatePassword(username)});
  }

};

module.exports = userController;
