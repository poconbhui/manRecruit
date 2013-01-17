_ = require('underscore')

redis = require("#{__dirname}/../connections").redis

redis (db) ->
  redis = db

sessions = {}
cleanupInterval = 30*60


class Session

  constructor: (@_key) ->
    #sessions[@_key] = {} unless sessions[@_key]
    #@_session = sessions[@_key]

    # Update last access time
    # @_session.lastAccess = new Date()
    console.log 'CONSTRUCTING SESSION', @_key


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
    if key?
      r_key = @rKey key
      redis.del r_key, (error, reply) ->
        callback? null, reply?.toString()
    else
      r_key = @rKey '*'
      redis.keys r_key, (error, reply) ->
        redis.multi( ['del',key] for key in reply ).exec()

module.exports = Session
