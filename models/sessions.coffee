_ = require('underscore')

sessions = {}
cleanupInterval = 30*60*1000


###
# Periodically check sessions and delete any where the last access
# is longer than 30 mins
###

setInterval ->
  console.log 'Running Session Cleanup'
  _.each sessions, (value,key) ->
    if value.lastAccess < (new Date() - cleanupInterval)
      console.log "Removing Session: #{key}"
      delete sessions[key]
, cleanupInterval


class Session

  constructor: (@_key) ->
    sessions[@_key] = {} unless sessions[@_key]
    @_session = sessions[@_key]

    # Update last access time
    @_session.lastAccess = new Date()


  set: (key, value, callback) ->
    setReturn = @_session[key] = value
    callback? null, setReturn


  get: (key, callback) ->
    callback null, @_session[key]

  destroy: (callback) ->
    delVal = delete sessions[@_key]
    callback? null, delVal

module.exports = Session
