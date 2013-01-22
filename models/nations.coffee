mongodb = require("#{__dirname}/../connections").mongodb
redis   = require("#{__dirname}/../connections").redis
_       = require 'underscore'


mongodb (error,db) ->
  mongodb = db
  Nation.setup = true

redis (error, db) ->
  redis = db


###
#Define Nation object from here
###

class Nation
  @setup = false
  constructor: (@_region, @_sources) ->
    @_sources = _.flatten [@_sources]
    @nationDB = mongodb.collection "#{@_region}:nations"

  # Return all recruitable
  getAllRecruitable: (callback) ->
    redis.multi(
     ['lrange', source, 0, 50] for source in @_sources
    )
    .exec (error,reply) =>
      callback error, _.object @_sources, reply

  countRecruitable: (callback) ->
    redis.multi(
      ['llen', source] for source in @_sources
    )
    .exec (error,reply) =>
      callback error, _.object @_sources, reply


  # Pop first nation off list
  popFirstRecruitable: (callback) ->
    redis.multi(
      ['lpop', source] for source in @_sources
    )
    .exec (error,reply) =>
      callback error, _.object @_sources, reply


  # Add nation and data to the recruited list
  addRecruited: (data, callback) ->
    data.date = new Date()
    data.source = @_sources[0]

    @nationDB.insert data, {w:1}, (error,result) ->
      callback? error,result


  ###
  #Get recruitment numbers from mapReduce run
  ###
  getRecruitmentNumbers: (callback, recruiter) ->

    ###
    # Get important dates here
    ###

    # Get date of two Sundays ago
    today = new Date()

    #today.setUTCDate(today.getUTCDate() + 8)
    lastLastSunday = new Date(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate()
    )
    lastLastSunday.setUTCDate(
      lastLastSunday.getUTCDate() - lastLastSunday.getUTCDay() - 7
    )
    
    query =
      date:   { $gte:lastLastSunday }
      source: { $in:@_sources }

    query.recruiter = recruiter if recruiter?


    ###
    # Define MapReduce functions here
    ###

    map = ->
      #global emit: false

      doc = this
      if doc.date and doc.recruiter and doc.name

        # Get date in doc
        date = new Date doc.date

        # Find date of last Sunday
        today = new Date()
        lastSunday = new Date(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate()
        )
        lastSunday.setUTCDate(
          lastSunday.getUTCDate() - lastSunday.getUTCDay()
        )

        # Is it older than last Sunday?
        if(date < lastSunday)
          emit doc.recruiter, {'prev':1,'current':0}
        else
          emit doc.recruiter, {'prev':0,'current':1}

    reduce = (key_in, values_in) ->
      totals = {'prev':0,'current':0}

      for value,key in values_in
        totals.prev = totals.prev + value.prev
        totals.current = totals.current + value.current

      return totals

    @nationDB.mapReduce map, reduce,
      'query':query
      'out':{inline:1}
    , (error,result) ->
        if error
          console.log "ERROR HERE"
          callback error, null
        else
          result = _.map result, (entry) ->
            'recruiter': entry._id
            'count': entry.value

          callback null, result


  find: (nationName, callback) ->
    error = null

    @nationDB.findOne {'name':nationName}, (error, nation) ->
      if error
        callback null, {'name':nationName, 'status': 'not found'}
      else
        if not nation
          nation = {name: nationName, status: 'not found'}
        else
          nation.status = 'recruited'

        callback(null, nation)



module.exports = Nation


# Boot nation updaters
require "#{__dirname}/../utils/updateNations"
