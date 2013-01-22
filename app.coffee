express = require('express')
app     = express()

require 'longjohn'

require("#{__dirname}/config") app
require("#{__dirname}/routes") app

diagnostics = require "#{__dirname}/utils/diagnostics"

# Run diagnostics every minute
setInterval ->

  # Ensure our heap usage isn't over 400MB
  diagnostics.process (error,stats) ->
    if stats.heapTotal/1024/1024 > 400
      console.log "Heap Usage over limit. 
                   Shutting down (and hopefully restarting)."
      process.exit(1)

  # Ensure our server is actually responding
  diagnostics.request (error, res) ->
    if error
      console.log "Http request failed.
                   Shutting down (and hopefully restarting)."
      process.exit(1)
, 60*1000


if process.env.NODE_ENV != 'test'
  app.listen app.get 'port'

module.exports = app
