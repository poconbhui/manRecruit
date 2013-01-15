_ = require('underscore')

redis = require("#{__dirname}/../connections").redis

redis (db) ->
  redis = db

sessions = {}
cleanupInterval = 30*60


###
# Periodically check sessions and delete any where the last access
# is longer than 30 mins
###

###
setInterval ->
  console.log 'Running Session Cleanup'
  _.each sessions, (value,key) ->
    if value.lastAccess < (new Date() - cleanupInterval)
      console.log "Removing Session: #{key}"
      delete sessions[key]
, cleanupInterval
###


class Session

  constructor: (@_key) ->
    #sessions[@_key] = {} unless sessions[@_key]
    #@_session = sessions[@_key]

    # Update last access time
    # @_session.lastAccess = new Date()


  rKey: (key) ->
    "#{@_key}:#{key}"


  set: (key, value, callback) ->
    r_key = @rKey key
    redis.set r_key, value, (error, reply) ->
      redis.expire r_key, cleanupInterval
      callback? null, reply?.toString()


  get: (key, callback) ->
    r_key = @rKey key
    redis.get r_key, (error, reply) ->
      redis.expire r_key, cleanupInterval
      callback? null, reply?.toString()

  destroy: (key, callback) ->
    r_key = @rKey key
    redis.del r_key, (error, reply) ->
      callback? null, reply?.toString()

module.exports = Session
