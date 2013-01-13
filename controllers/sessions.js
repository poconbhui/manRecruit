/*jslint node: true */
'use strict';

var User = require(__dirname+'/../models/users.js');
var Sessions = require(__dirname+'/../models/sessions.js');
var crypto = require('crypto');

var sessionController = {
  'new': function(req,res){

    var common = function commonNew(){
      res.locals.message = 'User Login';
      res.locals.action  = '/login';

      res.render('sessions/new.html.jade');
    };

    switch(res.locals.environment){
      case 'development':
      case 'staging':
        var user = new User('TD');

        user.generatePassword(function(error, password){
          res.locals.username = user.username;
          res.locals.password = password;

          common();
        });

        break;

      case 'production':
        common();
        break;
    }

  },

  'newAdmin': function(req,res){
    switch(res.locals.environment){
      case 'development':
      case 'staging':
        res.locals.username = 'admin';
        res.locals.password = 'I_HEART_TD';
    }

    res.locals.message = 'Admin Login';
    res.locals.action  = '/login/admin';

    res.render('sessions/new.html.jade');
  },


  'create': function(req,res){
    var user_in = req.body.user;
    var user = new User(user_in.name);

    user.verify(user_in.password, function(error, result){
      if(result){
        crypto.randomBytes(24, function(ex,buf){
          var token = buf.toString('hex');
          var session = new Sessions(token);

          session.set('username', user.username);
          session.set('admin', false);

          res.cookie('session',token,{signed:true});

          res.redirect('/nations');
        });
      }
      else{
        res.redirect('/nations');
      }
    });
  },


  'createAdmin': function(req,res){
    var user = req.body.user || {};

    if(user.name == 'admin' && user.password == 'I_HEART_TD'){
      console.log('SETTING ADMIN TRUE');
      req.session.set('admin', true);
    }

    res.redirect('/nations');
  },


  'destroy': function(req,res){
    var session = new Sessions(req.signedCookies.session);
    session.destroy();
    res.clearCookie('session');
    res.redirect('/login');
  },


  'loadSessionData': function(req,res,next){
    if(req.signedCookies.session){
      req.session = new Sessions(req.signedCookies.session);
    }

    next();
  },


  'requireLoggedIn': function(req,res,next){
    if(!req.session){
      res.redirect('/login');
      return;
    }

    req.session.get('username', function(error, username){
      if(username){
        // If username is set, user is logged in. Continue
        next();
      }
      else{
        // No username found. Require login!
        res.redirect('/login');
      }
    });
  },


  'requireAdmin': function(req,res,next){
    req.session.get('admin', function(error, result) {
      console.log('ADMIN VALUE: ', result);
      if(result){
        // User has admin status. Continue
        next();
      }
      else{
        // User has no admin statue. Require admin login
        res.redirect('/login/admin');
      }
    });
  }

};

module.exports = sessionController;
