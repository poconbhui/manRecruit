Nation   = require "#{__dirname}/../models/nations"
_        = require 'underscore'
Sessions = require "#{__dirname}/../models/sessions"

randomString = (string_length) ->
  chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz'
  string_length = string_length || 8
  random_string = []

  while random_string.length < string_length
    rnum = Math.floor(Math.random() * chars.length)
    random_string.push chars.substring(rnum,rnum+1)

  random_string.join("")


class NationController

  # Show splash page
  index: (req, res) ->
    feederNations = new Nation 'TNI', ['feeder','sinker']

    feederNations.getAllRecruitable (error, recruitableList) ->
      res.locals.recruitableList = recruitableList
      res.render 'nations/index.html.jade'


  # Present recruiter with a recruitable nation
  new: (req, res) ->
    nationSource = res.locals.nationSource
    nations = new Nation 'TNI', nationSource

    nations.popFirstRecruitable (error, firstRecruitable) ->

      res.locals.offeredNation = firstRecruitable[nationSource]

      ###
      #Not the best option, but this should hopefully help
      #with the double nation problem
      ###
      nations.addUnrecruitable res.locals.offeredNation

      res.set
        'Cache-Control': 'no-cache',
        'Expires': 'Thu, 01 Dec 1994 16:00:00 GMT'

      res.render 'nations/new.html.jade'


  # Add recruitable nation data to database if recruited
  create: (req, res) ->
    nationSource = res.locals.nationSource
    nations = new Nation 'TNI', nationSource

    # If 'sent' button was pressed
    if req.body.sent?
      nations.addRecruited
        'name':req.body.nation,
        'recruiter':res.locals.username
      , (error,result) ->
        if error
          console.log 'Error Adding Nation: ', error, result

        # Give recruiter new nation
        res.redirect "/nations/#{nationSource}/new?#{randomString()}"

    else
      # Give recruiter a new nation
      res.redirect "/nations/#{nationSource}/new?#{randomString()}"


  ###
  #This isn't really implemented yet.
  #It will probably be an ISIS feature
  ###
  show: (req, res) ->
    nations = new Nation 'TNI', ['feeder','sinker']

    requestedNation = req.params.nation
    nations.find requestedNation, (error, nation_data) ->
      res.json nation_data

  recruitmentNumbers: (req,res) ->
    nations = new Nation 'TNI', ['feeder','sinker']

    nations.getRecruitmentNumbers (error,collection) ->
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
    nations = new Nation 'TNI', ['feeder','sinker']

    username = res.locals.username

    nations.countRecruitable (error, recruitableCount) ->
      if error
        console.log 'ERROR: ', error
        res.locals.recruitableCount = {feeder:0,sinker:0}

      res.locals.recruitableCount = recruitableCount

      nations.getRecruitmentNumbers username, (error, collection) ->
        if error
          console.log 'ERROR: ', error
          collection = []

        res.locals.recruitedCount = collection[0]?.count.current || 0

        next()



module.exports = NationController
