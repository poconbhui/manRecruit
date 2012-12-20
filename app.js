var express      = require('express');
var app          = express();
var _            = require('underscore');

require('longjohn');


/***
 * Define Express specifics
 ***/
app.use(express.bodyParser());
app.use(express.cookieParser('secret'));
app.set('views', __dirname+'/views');
app.engine('jade', require('jade').__express);
app.locals._ = _;

var port = process.env.PORT || 3000;


if('development' == app.get('env')){
  app.use(function(req,res,next){
    res.locals.environment = 'development';
    next();
  });
}
else if('production' == app.get('env')){
  app.use(function(req,res,next){
    res.locals.environment = 'production';
    next();
  });
}



/***
 * Define Routings
 ***/

// Define sessionController routing
var sessionController = require(__dirname+'/controllers/sessions');

app.get( '/login', sessionController.new);
app.post('/login', sessionController.create);
app.get( '/logout', sessionController.destroy);

// Load sessions and require logged in
var middleware = [
  sessionController.loadSessionData,
  sessionController.requireLoggedIn
];



/***
 * Require logged in from here
 ***/


// Define nationController routing
var nationController = require(__dirname+'/controllers/nations');

app.get( '/', function(req,res){res.redirect('/nations')});
app.get( '/nations', middleware, nationController.index);
app.get( '/nations/new', middleware,  nationController.new);
app.post('/nations', middleware, nationController.create);



/***
 * Require Admin from here
 ***/
app.get( '/login/admin', middleware, sessionController.newAdmin);
app.post('/login/admin', middleware, sessionController.createAdmin);

// Require admin
middleware.push(sessionController.requireAdmin);


// Continue defining nationController routing
app.get( '/nations/recruitmentNumbers', middleware, nationController.recruitmentNumbers);
app.get( '/nations/:nation', middleware, nationController.show);


// Define userController routing
var userController = require(__dirname+'/controllers/users');

app.get( '/users', middleware, userController.index);
app.get( '/users/new', middleware, userController.new);
app.post('/users', middleware, userController.create);
app.get( '/users/:user', middleware, userController.show);


app.listen(port);
