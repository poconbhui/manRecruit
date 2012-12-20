var Users = require(__dirname+'/../models/users.js');
var Sessions = require(__dirname+'/../models/sessions.js');
var crypto = require('crypto');

var sessionController = {
  'new': function(req,res){
    if('development' == res.locals.environment){
      res.locals.username = 'TD';
      res.locals.password = Users.generatePassword('TD');
    }

    res.locals.message = 'User Login';
    res.locals.action  = '/login';

    console.log(res.locals);

    res.render('sessions/new.html.jade');
  },

  'newAdmin': function(req,res){
    if('development' == res.locals.environment){
      res.locals.username = 'admin';
      res.locals.password = 'I_HEART_TD';
    }

    res.locals.message = 'Admin Login';
    res.locals.action  = '/login/admin';

    res.render('sessions/new.html.jade');
  },


  'create': function(req,res){
    var user = req.body.user;

    if(Users.verify(user.name, user.password)){
      crypto.randomBytes(24, function(ex,buf){
        var token = buf.toString('hex');
        var session = new Sessions(token);
        session.set('username', user.name);
        session.set('admin',false);

        res.cookie('session',token,{signed:true});

        res.redirect('/nations');
      });
    }
    else{
      res.redirect('/nations');
    }
  },


  'createAdmin': function(req,res){
    var user = req.body.user || {};

    if(user.name == 'admin' && user.password == 'I_HEART_TD'){
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
    if(req.session && req.session.get('username')){
      // If username is set, user is logged in. Continue
      next();
    }
    else{
      // No username found. Require login!
      res.redirect('/login');
    }
  },


  'requireAdmin': function(req,res,next){
    if(req.session.get('admin') == true){
      // User has admin status. Continue
      next();
    }
    else{
      // User has no admin statue. Require admin login
      res.redirect('/login/admin');
    }
  }

};

module.exports = sessionController;
