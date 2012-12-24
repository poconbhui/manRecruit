var Nations = require(__dirname + '/../models/nations.js');
var _            = require('underscore');
var Sessions = require(__dirname+'/../models/sessions.js');

Nations = new Nations('TNI');

var nationController = {

  // Show splash page
  'index': function(req, res){
    res.locals.recruitableCount = Nations.countRecruitable();
    res.locals.recruitableList  = Nations.getAllRecruitable();

    res.render('nations/index.html.jade');

  },


  // Present recruiter with a recruitable nation
  'new': function(req, res){
    res.locals.offeredNation = Nations.popFirstRecruitable();
    res.locals.recruitableCount = Nations.countRecruitable();

    // Not the best option, but this should hopefully help
    // with the double nation problem
    Nations.addUnrecruitable(req.body.nation);

    Nations.getRecruitmentNumbers(
      req.session.get('username'),
      function(error, collection){
        if(error){
          console.log("ERROR: ",error);
          collection = [];
        }

        if(collection[0]){
          res.locals.recruitedCount = collection[0].count.current;
        }
        else{
          res.locals.recruitedCount = 0;
        }

        res.render('nations/new.html.jade');
      }
    );

  },


  // Add recruitable nation data to database if recruited
  'create': function(req, res){

    // If "sent" button was pressed
    if(req.body.sent){
      // Mark nation as recruited
      Nations.addRecruited(
        {
          'name':req.body.nation,
          'recruiter':req.session.get('username')
        },
        function(error,result){
          // Give recruiter new nation
          res.redirect('/nations/new');
        }
      );
    }
    else{
      // Give recruiter a new nation
      res.redirect('/nations/new');
    }
  },


  // This isn't really implemented yet.
  // It will probably be an ISIS feature
  'show': function(req, res){
    var requestedNation = req.params.nation;
    Nations.find(requestedNation, function(error, nation){
      res.json(nation);
    });
  },


  'recruitmentNumbers': function(req,res){
    Nations.getRecruitmentNumbers(function(error,collection){
      collection = _.chain(collection)
        .filter(function(entry){
          return entry.count.prev > 0;
        })
        .map(function(entry){
          return {
            'recruiter': entry.recruiter,
            'count':     entry.count.prev
          };
        })
        .sortBy(function(entry){
          return -entry.count;
        })
        .value();

      // Find last Sunday
      var today = new Date;
      var prevDate = new Date(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate()
      );
      prevDate.setUTCDate(prevDate.getUTCDate() - prevDate.getUTCDay());

      res.locals.totalsDate = prevDate;
      res.locals.recruitmentNumbers = collection;

      res.render('nations/recruitmentNumbers.html.jade');
    });
  }

};

module.exports = nationController;
