/*jslint node: true */
'use strict';

var Nation = require(__dirname + '/../models/nations.js');
var _            = require('underscore');
var Sessions = require(__dirname+'/../models/sessions.js');

Nation = new Nation('TNI');

function randomString(string_length) {
    var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz';
    string_length = string_length || 8;
    var random_string = '';

    for (var i=0; i<string_length; i++) {
        var rnum = Math.floor(Math.random() * chars.length);
        random_string += chars.substring(rnum,rnum+1);
    }

    return random_string;
}

var nationController = {

  // Show splash page
  'index': function(req, res){
    
    Nation.countRecruitable(function(error, recruitableCount){
      Nation.getAllRecruitable(function(error, recruitableList){
        res.locals.recruitableCount = recruitableCount;
        res.locals.recruitableList  = recruitableList;

        res.render('nations/index.html.jade');
      });
    });

  },


  // Present recruiter with a recruitable nation
  'new': function(req, res){

    Nation.popFirstRecruitable(function(error, firstRecruitable){
      Nation.countRecruitable(function(error, recruitableCount){

        res.locals.offeredNation = firstRecruitable;
        res.locals.recruitableCount = recruitableCount;

        // Not the best option, but this should hopefully help
        // with the double nation problem
        Nation.addUnrecruitable(res.locals.offeredNation);


        req.session.get('username', function(error, username){
          if(error){
            console.log('Error getting username in NationController.new');
            res.redirect('/nations');
            return;
          }

          Nation.getRecruitmentNumbers(username, function(error, collection){
            if(error){
              console.log('ERROR: ', error);
              collection = [];
            }

            if(collection[0]){
              res.locals.recruitedCount = collection[0].count.current;
            }
            else{
              res.locals.recruitedCount = 0;
            }

            res.set({
              'Cache-Control': 'no-cache',
              'Expires': 'Thu, 01 Dec 1994 16:00:00 GMT'
            });
            res.render('nations/new.html.jade');
          });

        }); //req.session.get

      }); //Nation.countRecruitable
    }); //Nation.popFirstRecruitable

  },


  // Add recruitable nation data to database if recruited
  'create': function(req, res){

    // If 'sent' button was pressed
    if(req.body.sent){
      // Mark nation as recruited
      req.session.get('username', function(error, username){
        if(error){
          console.log('Error loading username in NationController.create');
          res.redirect('/nations/new?'+randomString());
          return false;
        }

        Nation.addRecruited(
          {
            'name':req.body.nation,
            'recruiter':username
          },
          function(error,result){
            if(error){
              console.log('Error Adding Nation: ', error,result);
            }
            // Give recruiter new nation
            res.redirect('/nations/new?'+randomString());
          }
        );
      });
    }
    else{
      // Give recruiter a new nation
      res.redirect('/nations/new?'+randomString());
    }
  },


  // This isn't really implemented yet.
  // It will probably be an ISIS feature
  'show': function(req, res){
    var requestedNation = req.params.nation;
    Nation.find(requestedNation, function(error, nation){
      res.json(nation);
    });
  },


  'recruitmentNumbers': function(req,res){
    Nation.getRecruitmentNumbers(function(error,collection){
      var prevNumbers = _.chain(collection)
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
          return -entry.count.prev;
        })
        .value();

      var currentNumbers = _.chain(collection)
        .filter(function(entry){
          return entry.count.current > 0;
        })
        .map(function(entry){
          return {
            'recruiter': entry.recruiter,
            'count':     entry.count.current
          };
        })
        .sortBy(function(entry){
          return -entry.count.current;
        })
        .value();

      // Find last Sunday
      var today = new Date();
      var prevDate = new Date(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate()
      );
      prevDate.setUTCDate(prevDate.getUTCDate() - prevDate.getUTCDay());
      var nextDate = new Date(prevDate);
      nextDate.setUTCDate(nextDate.getUTCDate() + 7);

      res.locals.prevTotalsDate = prevDate;
      res.locals.prevRecruitmentNumbers = prevNumbers;

      res.locals.currentTotalsDate = nextDate;
      res.locals.currentRecruitmentNumbers = currentNumbers;

      res.render('nations/recruitmentNumbers.html.jade');
    });
  }

};

module.exports = nationController;
