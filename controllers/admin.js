var crypto = require('crypto');
var settings = require('../settings');
var parseCookies = require('../helpers/parseCookies');

function requireAdmin(req,res){
  cookies = parseCookies(req.headers.cookie);
  //console.log('ADMIN FOUND');
  //console.log(cookies['admin_username']);
  //console.log(cookies['admin_password']);

  if( cookies['admin_username'] == 'admin'
    && cookies['admin_password'] == 'I_HEART_TD')
  {
    return true;
  }
  return false;
}

var admin = {};

admin.login = {};

admin.login.get = function(req,res){
  res.render('admin/login', {title: "Admin Login"});
};

admin.login.post = function(req,res){
  res.cookie('admin_username', req.param('username', null), {path: '/', httpOnly: true});
  res.cookie('admin_password', req.param('password', null), {path: '/', httpOnly: true});

  res.redirect('/admin');
};

admin.index = function(req,res){
  if(!requireAdmin(req,res)){
    res.redirect('/admin/login');
    return;
  }

  res.render('admin/index', {title: "Admin Home"});
};


admin.users = {};
admin.users.index = function(req,res){
  res.redirect('/admin');
  res.end();
};

admin.users.new = function(req,res){
  if(!requireAdmin(req,res)){
    res.redirect('/admin/login');
    return;
  }

  res.render('admin/users/new', {title: "Create username/password pair"});
};

admin.users.create = function(req,res){
  if(!requireAdmin(req,res)){
    res.redirect('/admin/login');
    return;
  }
  var username = req.param('username',null);
  res.redirect('/admin/users/'+username);
  res.end();
}

admin.users.show = function(req,res){
  if(!requireAdmin(req,res)){
    res.redirect('/admin/login');
    return;
  }

  var username = req.params.id;
  var password = crypto.createHash('md5').update(username+settings.salt).digest('hex');

  res.render('admin/users/show', {title: "username/password keypair", username: username, password: password});
};


admin.nations = {};
admin.nations.makeBad = function(req,res){
  if(!requireAdmin(req,res)){
    res.redirect('/admin/login');
    return;
  }

  for(var i in nations){
    (function(thisNation){
      var badNation = new Nation({name: thisNation, recruiter: cookies['username'], recruitDate: new Date, from: 'badNation'});
      badNation.save(function(err){});
    })(nations[i]);
  }

  for(var i in sinkerNations){
    (function(thisNation){
      var badNation = new Nation({name: thisNation, recruiter: cookies['username'], recruitDate: new Date, from: 'badNation'});
      badNation.save(function(err){});
    })(sinkerNations[i]);
  }

  nations = [];
  sinkerNations = [];

  res.send('badNations generated from current nation list');
};

module.exports = admin;
