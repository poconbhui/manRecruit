Nation   = require "#{__dirname}/../models/nations"
_        = require 'underscore'
Sessions = require "#{__dirname}/../models/sessions"

Nation = new Nation 'TNI'

randomString = (string_length) ->
  chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz'
  string_length = string_length || 8
  random_string = []

  while random_string.length < string_length
    rnum = Math.floor(Math.random() * chars.length)
    random_string.push chars.substring(rnum,rnum+1)

  random_string.join("")


nationController =

  # Show splash page
  index: (req, res) ->
    Nation.countRecruitable (error, recruitableCount) ->
      Nation.getAllRecruitable (error, recruitableList) ->
        res.locals.recruitableCount = recruitableCount
        res.locals.recruitableList  = recruitableList

        res.render 'nations/index.html.jade'


  # Present recruiter with a recruitable nation
  new: (req, res) ->
    Nation.popFirstRecruitable (error, firstRecruitable) ->
      Nation.countRecruitable (error, recruitableCount) ->

        res.locals.offeredNation = firstRecruitable
        res.locals.recruitableCount = recruitableCount

        ###
        #Not the best option, but this should hopefully help
        #with the double nation problem
        ###
        Nation.addUnrecruitable res.locals.offeredNation


        req.session.get 'username', (error, username) ->
          if error
            console.log 'Error getting username in NationController.new'
            res.redirect '/nations'
            return

          Nation.getRecruitmentNumbers username, (error, collection) ->
            if error
              console.log 'ERROR: ', error
              collection = []

            res.locals.recruitedCount = collection[0]?.count.current || 0

            res.set
              'Cache-Control': 'no-cache',
              Expires: 'Thu, 01 Dec 1994 16:00:00 GMT'

            res.render 'nations/new.html.jade'


  # Add recruitable nation data to database if recruited
  create: (req, res) ->

    # If 'sent' button was pressed
    if req.body.sent?
      # Mark nation as recruited
      req.session.get 'username', (error, username) ->
        if error
          console.log 'Error loading username in NationController.create'
          res.redirect "/nations/new?#{randomString()}"
          return false

        Nation.addRecruited
          'name':req.body.nation,
          'recruiter':username
        , (error,result) ->
          if error
            console.log 'Error Adding Nation: ', error, result

          # Give recruiter new nation
          res.redirect "/nations/new?#{randomString()}"

    else
      # Give recruiter a new nation
      res.redirect "/nations/new?#{randomString()}"


  ###
  #This isn't really implemented yet.
  #It will probably be an ISIS feature
  ###
  show: (req, res) ->
    requestedNation = req.params.nation
    Nation.find requestedNation, (error, nation) ->
      res.json nation

  recruitmentNumbers: (req,res) ->
    Nation.getRecruitmentNumbers (error,collection) ->
      prevNumbers = _.chain(collection)
        .filter( (entry) -> entry.count.prev > 0 )
        .map( (entry) ->
          'recruiter': entry.recruiter,
          'count':     entry.count.prev
        )
        .sortBy( (entry) -> -entry.count.prev )
        .value()

      currentNumbers = _.chain(collection)
        .filter( (entry) -> entry.count.current > 0 )
        .map( (entry) ->
          'recruiter': entry.recruiter,
          'count':     entry.count.current
        )
        .sortBy( (entry) -> -entry.count.current )
        .value()

      # Find last Sunday
      today = new Date()
      prevDate = new Date(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate()
      )

      prevDate.setUTCDate prevDate.getUTCDate() - prevDate.getUTCDay()
      nextDate = new Date prevDate
      nextDate.setUTCDate nextDate.getUTCDate() + 7

      res.locals.prevTotalsDate = prevDate
      res.locals.prevRecruitmentNumbers = prevNumbers

      res.locals.currentTotalsDate = nextDate
      res.locals.currentRecruitmentNumbers = currentNumbers

      res.render 'nations/recruitmentNumbers.html.jade'

  loadNumbers: (req, res, next) ->
    req.session.get 'username', (error, username) ->
      if error
        console.log 'Error getting username in NationController.loadNumbers'
        res.redirect '/nations'
        return

      Nation.countRecruitable (error, recruitableCount) ->
        if error
          console.log 'ERROR: ', error
          recruitableCount = 0

        Nation.getRecruitmentNumbers username, (error, collection) ->
          if error
            console.log 'ERROR: ', error
            collection = []

          res.locals.recruitableCount = recruitableCount
          res.locals.recruitedCount = collection[0]?.count.current || 0

          next()

module.exports = nationController
