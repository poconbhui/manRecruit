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
  , crypto = require('crypto')
  , parseCookies = require('./helpers/parseCookies')
  , resourceful = require('./helpers/resourceful');


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

    // run for each feeder
    c.push({
      type: 'parallel',
      range: ns.feeders,
      func: function(index, feeder, c){
        ns.api("region="+feeder+"&q=nations&v=3", function(res){
          r = res['NATIONS'];
          c.vals[feeder] = r.split(':');
          c.done();
        });
      }
    })

    // get new nations
    .push(function(c){
      ns.api("q=newnations", function(res) {
        r = res['NEWNATIONS'];
        c.vals['newNations'] = r.split(',');
        c.done();
      });
    })

    // stuff it all together
    //merge nation arrays
    .push(function(c){
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


      // merge all lists together by adding from the top of each list.
      // this should keep the new list in roughly chronological order
      var merged = [];
      for(var i=0; ltFeeders(i); ++i){
        f = feedersLeft(i);
        for (var j=0; j<f.length; ++j){
          merged.push(rawList[f[j]].shift());
        }
      }

      // remove nations from newNations from the newly merged list
      // because these nations will be put at the top.
      newMerged = merged.filter(function(el){
        return rawList['newNations'].indexOf(el) < 0;
      });
      merged = rawList['newNations'].concat(newMerged);


      // remove nations already in database
      // due to either recruiting or badListing
      Nation.find({'name': { $in: merged } }, function(err,ret){
        for(var e=0; e<ret.length; ++e){
          var i = merged.indexOf(ret[e].name);
          if(i>=0){
            merged.splice(i,1);
          }
        }
 
        // run the callback of this entire function with the new list
        // as the argument
        if(typeof callback === 'function'){
          callback(merged);
        }
      });

    })
    .exec();
}

function getSinkerNationsList(callback){
  var c = new nseq()

    // run for each sinker
    .push({
      type: 'parallel',
      range: ns.sinkers,
      func: function(index, sinker, c){
        ns.api("region="+sinker+"&q=nations&v=3", function(res){
          r = res['NATIONS'];
          c.vals[sinker] = r.split(':');
          c.done();
        });
      }
    })

    // stuff it all together
    //merge nation arrays
    .push(function(c){
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

    })
    .exec();
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


app.get('/',function(req,res){
  if(!requireLoggedIn(req,res)){
    res.redirect('/login');
    return;
  }

  res.render('index', {title: "manRecruit Home"});
});


app.get('/login', function(req,res){
  res.render('login', {title: "Login to manRecruit"});
});

app.get('/logout', function(req,res){
  res.cookie('username', null);
  res.cookie('password', null);

  res.redirect('/');
});

app.post('/login', function(req,res){
  res.cookie('username', req.param('username', null), {path: '/', httpOnly: true});
  res.cookie('password', req.param('password', null), {path: '/', httpOnly: true});

  res.redirect('/');
});



/***************************************
 * Nation getting and logging functions
 ***************************************/
app.get('/feeders', function(req,res){
  res.redirect('/');
  res.end();
});
app.post('/feeders', function(req,res){
  if(!requireLoggedIn(req,res)){
    res.redirect('/login');
    return;
  }
  //console.log('PASSED LOGIN');

  (function thisFunc(){
    var thisNation = nations.shift();

    cookies = parseCookies(req.headers.cookie);

    if(thisNation !== undefined){
      var nation = new Nation({name: thisNation, recruiter: cookies['username'], recruitDate: new Date, from: 'feeder'});
      nation.save(function(err){
        if(err === null) {
          res.render('getNation', {title: "New Nation - "+nation.name, nation: nation.name, action: '/feeders'});
        }
        else if(err.code == 11000){
          thisFunc();
        }
        else {
          res.render('getNation', {title: "New Nation Error...", nation: nation.name, err: err.err, action: '/feeders'});
        }
      });
    }
    else{
      res.render('getNation',{title: "No New Nations", nation:'', err: 'No new nations!', action: '/feeders'});
    }
  })();

});


app.get('/sinkers', function(req,res){
  res.redirect('/');
  res.end();
});
app.post('/sinkers', function(req,res){
  if(!requireLoggedIn(req,res)){
    res.redirect('/login');
    return;
  }
  //console.log('PASSED LOGIN');

  (function thisFunc(){
    var thisNation = sinkerNations.shift();

    cookies = parseCookies(req.headers.cookie);

    if(thisNation !== undefined){
      var nation = new Nation({name: thisNation, recruiter: cookies['username'], recruitDate: new Date, from: 'sinker'});
      nation.save(function(err){
        if(err === null) {
          res.render('getNation', {title: "Refounded Nation - "+nation.name, nation: nation.name, action: '/sinkers'});
        }
        else if(err.code == 11000){
          thisFunc();
        }
        else {
          res.render('getNation', {title: "Refounded Nation Error...", nation: nation.name, err: err.err, action: '/sinkers'});
        }
      });
    }
    else{
      res.render('getNation',{title: "No Newly Refounded Nations", nation:'', err: 'No new nations!', action: '/sinkers'});
    }
  })();

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

  (function thisFunc(){
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
          thisFunc();
        }
        else {
          res.json({
            err: err
          });
        }
      });
    }
    else{
      res.json({
        err: 'No New Nations'
      });
    }
  })();

});

app.get('/api/sinkerNation', function(req,res){
  if(!requireLoggedIn(req,res)){
    res.redirect('/login');
    return;
  }

  (function thisFunc(){
    var thisNation = sinkerNations.shift();

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
          thisFunc();
        }
        else {
          res.json({
            err: err
          });
        }
      });
    }
    else{
      res.json({
        err: 'No New Nations'
      });
    }
  })();

});


var admin = require('./controllers/admin');
resourceful(app, '/admin/users', admin.users);


app.get('/admin/login', admin.login.get);
app.post('/admin/login', admin.login.post);

app.get('/admin', admin.index);

app.get('/admin/nation/makeBad', admin.nations.makeBad);


app.get('/admin/stats/numbers', function(req,res){
  today = new Date;
  
  this_month = new Date(today.getFullYear(), today.getMonth(), 1);
  last_month = new Date(today.getFullYear(), today.getMonth()-1, 1);
  
  var map = function(){
    var month = (new Date(this.recruitDate).getMonth());

    // get week to nearest monday
    // http://stackoverflow.com/questions/6117814/get-week-of-year-in-javascript-like-in-php
    var d = new Date(this.recruitDate);
    d.setHours(0,0,0);
    // Set to nearest Monday: current date + 1 - current day number
    // Make Sunday's day number 7
    d.setDate(d.getDate() + 1 - (d.getDay()||7));

    emit({year: d.getFullYear(), month: d.getMonth(), date: d.getDate(), recruiter: this.recruiter}, {count: 1});
  };
  
  var reduce = function(key, values){
    var count = 0;
    values.forEach(function(v){
      count += v.count;
    });
  
    return {count: count};
  };
  

  // set start search date to 4 Mondays ago
  var d1 = new Date();
  d1.setHours(0,0,0);
  // Set to 4 Mondays ago: current date + 1 - current day number - 7*4
  // Make Sunday's day number 7
  d1.setDate(d1.getDate() + 1 - (d1.getDay()||7) - 7*4);

  // set end date to this weeks Monday
  d2 = new Date(d1);
  d2.setDate(d2.getDate() + 7*4);

  console.log(d1);
  console.log(d2);
  var query = {
    recruitDate: {$gte: d1, $lt: d2}
  };

  Nation.collection.mapReduce(
    map.toString(),
    reduce.toString(),
    {query: query , out: {inline: 1}},
    function(err, dbres) {
  //    if(err) throw err;

      console.log(err);
      console.log(dbres);

      res.write("Recruitment Numbers\n");
      res.write("===================\n");
      var list = [];
      dbres.forEach(function(r) {
        list.unshift({date: new Date(r._id.year, r._id.month, r._id.date), recruiter: r._id.recruiter, count: r.value.count});
      });

      var currDate = new Date(0);
      list.forEach(function(l){
        console.log(l);
        if(l.date.toString() != currDate.toString()){
          res.write("\nWeek starting: "+l.date.getDate()+'/'+l.date.getMonth()+'/'+l.date.getFullYear()+"\n");
          currDate = l.date;
          console.log(currDate, l.date);
        }
        res.write(""+l.recruiter);
        res.write(' - ');
        res.write(""+l.count);
        res.write("\n");
      });
      res.end();
    }
  );
});





/*****************
 * Startup Server
 * ***************/
http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
