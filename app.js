/**********************
 * Module dependencies
 **********************/

var express = require('express')
  , http = require('http')
  , path = require('path')
  , nseq = require('./helpers/nseq')
  , ns = require('./helpers/nationstates')
  , mongoose = require('mongoose')
  , db = mongoose.createConnection(process.env.MONGOLAB_URI || 'localhost/test')
  , crypto = require('crypto');


db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
  console.log('Mongoose connected to MongoDB database at ' + db.user + ':' + db.pass + '@' + db.host + ':' + db.port + '/' + db.name);

  console.log('Populating feeder nations');
  getNationsList(function(nationArr){
    nations = nationArr;
  });
  console.log('Populating sinker nations');
  getSinkerNationsList(function(nationArr){
    sinkerNations = nationArr;
  });
});



/*********************
 * Nation model setup
 *********************/


var nationSchema = new mongoose.Schema({
    name: { type: String, index: { unique: true } }
  , recruiter: String
  , recruitDate: Date
  , from: String
});

var Nation = db.model('Nation', nationSchema);



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
var nations = [];

var sinkerNations = [];

function getNationsList(callback){
  var c = new nseq();

    // push feeders into pareach

    for(var i=0; i<ns.feeders.length; ++i){
      // run for each feeder
      (function(feeder){
        c.push(function(c){
          ns.api("region="+feeder+"&q=nations&v=3", function(res){
            r = res['NATIONS'];
            c.vals[feeder] = r.split(':');
            c.done();
          });
        });
      })(ns.feeders[i]);
    }

    // get new nations
    c.push(function(c){
      ns.api("q=newnations", function(res) {
        r = res['NEWNATIONS'];
        c.vals['newNations'] = r.split(',');
        c.done();
      });
    })

    // stuff it all together
    //merge nation arrays
    c.push(function(c){
      //console.log('SEQ RETURN');
      //console.log(this.vars);

      var rawList = c.vals;

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
      //due to either recruiting or badListing

      Nation.find({'name': { $in: merged } }, function(err,ret){
        for(var e=0; e<ret.length; ++e){
          var i = merged.indexOf(ret[e].name);
          if(i>=0){
            merged.splice(i,1);
          }
        }
 
        if(typeof callback === 'function'){
          callback(merged);
        }
      });

    });

    c.done();
}

function getSinkerNationsList(callback){
  var c = new nseq();

    for(var i=0; i<ns.sinkers.length; ++i){
      // run for each feeder
      (function(sinker){
        c.push(function(c){
          ns.api("region="+sinker+"&q=nations&v=3", function(res){
            r = res['NATIONS'];
            c.vals[sinker] = r.split(':');
            c.done();
          });
        });
      })(ns.sinkers[i]);
    }

    // stuff it all together
    //merge nation arrays
    c.push(function(c){
      //console.log('SEQ RETURN');
      //console.log(this.vars);

      var rawList = c.vals;

      function ltSinkers(i){
        for(var k=0; k<ns.sinkers.length; ++k){
          if(i<rawList[ns.sinkers[k]].length){
            return true;
          }
        }
        return false;
      }
      function sinkersLeft(i){
        var ret = [];

        for(var k=0; k<ns.sinkers.length; ++k){
          if(i<rawList[ns.sinkers[k]].length){
            ret.push(ns.sinkers[k]);
          }
        }
        return ret;
      }


      var merged = [];
      for(var i=0; ltSinkers(i); ++i){
        f = sinkersLeft(i);
        for (var j=0; j<f.length; ++j){
          merged.push(rawList[f[j]].shift());
        }
      }
      //remove nations already in database
      //due to either recruitment or badListing

      Nation.find({'name': { $in: merged } }, function(err,ret){
        for(var e=0; e<ret.length; ++e){
          var i = merged.indexOf(ret[e].name);
          if(i>=0){
            merged.splice(i,1);
          }
        }
 
        if(typeof callback === 'function'){
          callback(merged);
        }
      });

    });

    c.done();
}



t = setInterval(function(){
  getNationsList(function(nationArr){
    nations = nationArr;
  });
  getSinkerNationsList(function(nationArr){
    sinkerNations = nationArr;
  });
}, 30*1000);



/*****************************************************
 * Some functions that should have already been there
 *****************************************************/
function parseCookies(cookieString){
  //console.log('COOKIE STRING');
  //console.log(cookieString);

  if(typeof cookieString !== 'string'){
    return {};
  }

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
  //console.log('CHECKING COOKIES:');

  cookies = parseCookies(req.headers.cookie);
  //console.log(cookies);


  var hash = crypto.createHash('md5');
  hash.update(cookies['username'] + app.get('salt'));
  hash = hash.digest('hex');

  //console.log('md5('+cookies['username']+app.get('salt')+')');
  //console.log(hash);

  if(cookies['password'] != hash){
    //console.log('OH SHIT! NOT LOGGED IN!');
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
  //console.log('PASSED LOGIN');

  var thisNation = nations.shift();

  cookies = parseCookies(req.headers.cookie);

  if(thisNation !== undefined){
    var nation = new Nation({name: thisNation, recruiter: cookies['username'], recruitDate: new Date, from: 'feeder'});
    nation.save(function(err){
      if(err === null) {
        res.render('index', {title: "GETTING NATION", nation: nation.name, action: '/'});
      }
      else if(err.code == 11000){
        res.redirect('/');
        res.end();
      }
      else {
        res.render('index', {title: "GETTING NATION", nation: nation.name, err: err.err, action: '/'});
      }
    });
  }
  else{
    res.render('index',{title: "GETTING NATION", nation:'', err: 'No new nations!', action: '/'});
  }

});

app.post('/',function(req,res){
  res.redirect('/');
});



app.get('/sinkers', function(req,res){
  if(!requireLoggedIn(req,res)){
    res.redirect('/login');
    return;
  }
  //console.log('PASSED LOGIN');

  var thisNation = nations.shift();

  cookies = parseCookies(req.headers.cookie);

  if(thisNation !== undefined){
    var nation = new Nation({name: thisNation, recruiter: cookies['username'], recruitDate: new Date, from: 'sinker'});
    nation.save(function(err){
      if(err === null) {
        res.render('index', {title: "GETTING NATION", nation: nation.name, action: '/sinkers'});
      }
      else if(err.code == 11000){
        res.redirect('/sinkers');
        res.end();
      }
      else {
        res.render('index', {title: "GETTING NATION", nation: nation.name, err: err.err, action: '/sinkers'});
      }
    });
  }
  else{
    res.render('index',{title: "GETTING NATION", nation:'', err: 'No new nations!', action: '/sinkers'});
  }

});

app.post('/sinkers',function(req,res){
  res.redirect('/sinkers');
});


app.get('/api/currentSinkerList', function(req, res){
  res.json(sinkerNations);
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
    var nation = new Nation({name: thisNation, recruiter: cookies['username'], recruitDate: new Date, from: 'feeder'});
    nation.save(function(err){
      if(err === null) {
        res.json({
            nation: nation.name
        });
      }
      else if(err.code == 11000){
        res.redirect('/api/newNation');
        res.end();
      }
      else {
        res.json({
          err: err
        });
      }
    });
  }
});

app.get('/api/sinkerNation', function(req,res){
  if(!requireLoggedIn(req,res)){
    res.redirect('/login');
    return;
  }

  var thisNation = nations.shift();

  cookies = parseCookies(req.headers.cookie);

  if(thisNation !== undefined){
    var nation = new Nation({name: thisNation, recruiter: cookies['username'], recruitDate: new Date, from: 'sinker'});
    nation.save(function(err){
      if(err === null) {
        res.json({
            nation: nation.name
        });
      }
      else if(err.code == 11000){
        res.redirect('/api/sinkerNation');
        res.end();
      }
      else {
        res.json({
          err: err
        });
      }
    });
  }
});


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

app.get('/admin/login', function(req,res){
  res.render('admin/login', {title: "Admin Login"});
});
app.post('/admin/login', function(req,res){
  res.cookie('admin_username', req.param('username', null));
  res.cookie('admin_password', req.param('password', null));

  res.redirect('/admin');
});

app.get('/admin', function(req,res){
  if(!requireAdmin(req,res)){
    res.redirect('/admin/login');
    return;
  }

  res.render('admin/index', {title: "Admin Home"})
});

app.get('/admin/user/new', function(req,res){
  if(!requireAdmin(req,res)){
    res.redirect('/admin/login');
    return;
  }

  res.render('admin/user/new', {title: "Create username/password pair"});
});
app.post('/admin/user/show', function(req,res){
  if(!requireAdmin(req,res)){
    res.redirect('/admin/login');
    return;
  }

  var username = req.param('username',null);
  var password = crypto.createHash('md5').update(username+app.get('salt')).digest('hex');

  res.render('admin/user/show', {title: "username/password keypair", username: username, password: password});
});

app.get('/admin/nation/makeBad', function(req,res){
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
});





/*****************
 * Startup Server
 * ***************/
http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
