# Heap usage output
if process.env.NODE_ENV is 'development' or 'staging'
  setInterval ->
    obj = process.memoryUsage()

    string = "PROF: 
      #{Math.round process.uptime()} 
      #{Math.round(obj.heapTotal/1024/1024)}MB
      #{Math.round(obj.heapUsed/1024/1024)}MB"

    console.log string
  , 30*1000

###
#Check memory usage periodically, if over limit, restart system
###
setInterval ->
  obj = process.memoryUsage()
  heapTotal = obj.heapTotal/1024/1024
  if heapTotal > 400
    console.log "Measured Heap Total of #{heapTotal}. Exiting."
    process.exit(1)
, 30*1000

express = require('express')
app     = express()

require 'longjohn'

require("#{__dirname}/config") app
require("#{__dirname}/routes") app

app.get '/testDeath', (req,res) ->
  res.send 'Dying'
  process.exit(0)



app.listen app.get 'port'

module.exports = app
