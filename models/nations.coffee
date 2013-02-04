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
  #Helper method for getting date of last Sunday
  ###
  lastSunday: () ->
    # Get date of two Sundays ago
    today = new Date()

    lastSunday = new Date(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate()
    )
    lastSunday.setUTCDate(
      lastSunday.getUTCDate() - lastSunday.getUTCDay()
    )
    return lastSunday

  ###
  #Get recruitment numbers from group function
  ###
  getRecruitmentNumbers: (query, callback) ->

    parsedQuery = {}
    parsedQuery.recruiter = query.recruiter if query.recruiter?

    parsedQuery.date = {}
    parsedQuery.date.$gt  = query.date.start
    parsedQuery.date.$lte = query.date.end

    parsedQuery.source = { $in:@_sources }

    @nationDB.group ['recruiter'],
      parsedQuery,
      {count:0},
      "function(obj,res){res.count++;}",
      (error, result) ->
        callback error, result


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
