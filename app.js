/**********************
 * Module dependencies
 **********************/

var express = require('express')
  , http = require('http')
  , path = require('path')
  , Seq = require('seq')
  , ns = require('./helpers/nationstates')
  , mongoose = require('mongoose')
  , db = mongoose.createConnection('localhost', 'test');



/*********************
 * Nation model setup
 *********************/

var Nation;

db.on('error', console.error.bind(console, 'connection error'));
db.once('open', function(){
  console.log('Mongoose successfully connected to MongoDB server');


  var nationSchema = new mongoose.Schema({
      name: { type: String, index: { unique: true } }
    , recruiter: String
    , recruitDate: Date
  });

  Nation = db.model('Nation', nationSchema);

});



/********************
 * App configuration
 ********************/

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));


  app.set('salt', 'pw');
});

app.configure('development', function(){
  app.use(express.errorHandler());
  app.locals.pretty = true;
});

var port = process.env.PORT || 5000;
app.set('port', port);



/********************************
 * Nation generation and storage
 ********************************/

//the all important list of recruitable nations
var nations = ["a","b","c","d"];

//a list of stale nations that may not be in the database already
var badNations = ["c","d","e"];

function getNationsList(callback){
  Seq()

    // push feeders into pareach
    .seq(function() {
      this(false,ns.feeders)
    })
    .flatten()

    // run for each feeder
    .parEach(function(feeder){
      B = this;

      ns.api("region="+feeder+"&q=nations&v=3", function(res){
        r = res['NATIONS'];
        B.vars[feeder] = r.split(':');
        B(false);
      });
    })

    // get new nations
    .par(function(){
      B = this;

      ns.api("q=newnations", function(res) {
        r = res['NEWNATIONS'];
        B.vars['newNations'] = r.split(',');
        B(false);
      });
    })

    // stuff it all together
    //merge nation arrays
    .seq(function(newNations){
      //console.log('SEQ RETURN');
      //console.log(this.vars);

      var rawList = this.vars;

      function ltFeeders(i){
        for(var k=0; k<ns.feeders.length; ++k){
          if(i<rawList[ns.feeders[k]].length){
            return true;
          }
        }
        return false;
      }
      function feedersLeft(i){
        var ret = [];

        for(var k=0; k<ns.feeders.length; ++k){
          if(i<rawList[ns.feeders[k]].length){
            ret.push(ns.feeders[k]);
          }
        }
        return ret;
      }


      var merged = [];
      for(var i=0; ltFeeders(i); ++i){
        f = feedersLeft(i);
        for (var j=0; j<f.length; ++j){
          merged.push(rawList[f[j]].shift());
        }
      }

      newMerged = merged.filter(function(el){
        return rawList['newNations'].indexOf(el) < 0;
      });

      merged = rawList['newNations'].concat(newMerged);

      //console.log(merged);


      //remove nations already in database

      var Recruited = {compliment: function(array){ return array; }};

      newMerged = Recruited.compliment(merged);
      merged = newMerged;

      //remove nations from badlist
      
      newMerged = merged.filter(function(el){
        return badNations.indexOf(el) < 0;
      });
      merged = newMerged;

      if(typeof callback === 'function'){
        callback(merged);
      }
    });
}


getNationsList(function(nationArr){
  nations = nationArr;
});
t = setInterval(function(){
  getNationsList(function(nationArr){
    nations = nationArr;
  });
}, 30*1000);



/*****************************************************
 * Some functions that should have already been there
 *****************************************************/
function parseCookies(cookieString){
  console.log('COOKIE STRING');
  console.log(cookieString);
  var cookies = {};
  cookieString.split(';').forEach(function( cookie ) {
    var parts = cookie.split('=');
    cookies[ parts[ 0 ].trim() ] = ( parts[ 1 ] || '' ).trim();
  });

  return cookies;
};



/********************
 * Logging functions
 ********************/
function requireLoggedIn(req, res){
  console.log('CHECKING COOKIES:');

  cookies = parseCookies(req.headers.cookie);
  console.log(cookies);


  if(cookies['password'] != cookies['username'] + app.get('salt')){
    console.log('OH SHIT! NOT LOGGED IN!');
    return false;
  }

  return true;
}

app.get('/login', function(req,res){
  res.render('login', {title: "Login to manRecruit"});
});

app.get('/logout', function(req,res){
  res.cookie('username', null);
  res.cookie('password', null);

  res.redirect('/');
});

app.post('/login', function(req,res){
  res.cookie('username', req.param('username', null));
  res.cookie('password', req.param('password', null));

  res.redirect('/');
});



/***************************************
 * Nation getting and logging functions
 ***************************************/
app.get('/', function(req,res){
  if(!requireLoggedIn(req,res)){
    res.redirect('/login');
    return;
  }
  console.log('PASSED LOGIN');

  var thisNation = nations.shift();

  cookies = parseCookies(req.headers.cookie);

  if(thisNation !== undefined){
    var nation = new Nation({name: thisNation, recruiter: cookies['username'], recruitDate: new Date});
    nation.save(function(err){
      if(err === null) {
        res.render('index', {title: "GETTING NATION", nation: nation.name});
      }
      else {
        res.render('index', {title: "GETTING NATION", nation: nation.name, err: err.err});
      }
    });
  }
  else{
    res.render('index',{title: "GETTING NATION", nation:'', err: 'No new nations!'});
  }

});

app.post('/',function(req,res){
  res.redirect('/');
});


app.get('/api/currentList', function(req, res){
  res.json(nations);
});

app.get('/api/newNation', function(req,res){
  if(!requireLoggedIn(req,res)){
    res.redirect('/login');
    return;
  }

  var thisNation = nations.shift();

  cookies = parseCookies(req.headers.cookie);

  if(thisNation !== undefined){
    var nation = new Nation({name: thisNation, recruiter: cookies['username'], recruitDate: new Date});
    nation.save(function(err){
      if(err === null) {
        res.json({
            nation: nation.name
        });
      }
      else {
        res.json({
          err: err
        });
      }
    });
  }
});



/*****************
 * Startup Server
 * ***************/
http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
