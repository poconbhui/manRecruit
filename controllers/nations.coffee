Nation   = require "#{__dirname}/../models/nations"
_        = require 'underscore'
Sessions = require "#{__dirname}/../models/sessions"

randomString = () -> Math.random().toString(36).substring(2,7)

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

      res.set
        'Cache-Control': 'no-cache',
        'Expires': 'Thu, 01 Dec 1994 16:00:00 GMT'

      res.render 'nations/new.html.jade'


  # Add recruitable nation data to database if recruited
  create: (req, res) ->
    nationSource = res.locals.nationSource
    nations = new Nation 'TNI', nationSource

    if req.body.sent?
      # 'sent' button was pressed
      nations.addRecruited
        'name':req.body.nation,
        'recruiter':res.locals.username
      , (error,result) ->
        if error
          console.log 'Error Adding Nation: ', error, result

        # Give recruiter new nation
        res.redirect "/nations/#{nationSource}/new?#{randomString()}"
    else
      # 'ignored' button was pressed
      nations.addRecruited
        'name':req.body.nation,
        'recruiter':'REJECTED'
      , (error,result) ->
        if error
          console.log 'Error Adding Nation: ', error, result

        # Give recruiter new nation
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

    today = new Date
    lastSunday = Nation::lastSunday()
    lastLastSunday = new Date(lastSunday)
    lastLastSunday.setUTCDate lastSunday.getUTCDate() - 7

    render = _.after 2, () ->
      data = [{recruiter:'r', count:1}]

      res.render 'nations/recruitmentNumbers.html.jade'

    nations.getRecruitmentNumbers
      date:{start:lastSunday, end:today},
      (error,data) ->
        res.locals.currentTotalsDate = lastSunday
        res.locals.currentRecruitmentNumbers = data

        render()

    nations.getRecruitmentNumbers
      date:{start:lastLastSunday, end:lastSunday},
      (error,data) ->
        res.locals.prevTotalsDate = lastLastSunday
        res.locals.prevRecruitmentNumbers = data

        render()



  loadNumbers: (req, res, next) ->
    nations = new Nation 'TNI', ['feeder','sinker']

    res.locals.nationSource ||= null

    next = _.after 2, next

    nations.countRecruitable (error, recruitableCount) ->
      if error
        console.log 'countRecruitable ERROR: ', error
        res.locals.recruitableCount = {feeder:0,sinker:0}

      res.locals.recruitableCount = recruitableCount
      next()

    today = new Date
    lastSunday = Nation::lastSunday()
    nations.getRecruitmentNumbers
      recruiter:res.locals.username
      date:{start:lastSunday, end:today},
      (error, data) ->
        if error
          data = []

        res.locals.recruitedCount = data[0]?.count || 0
        next()



module.exports = NationController
