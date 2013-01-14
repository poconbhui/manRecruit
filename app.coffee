# Heap usage output
if process.env.NODE_ENV is 'development' or 'staging'
  setInterval ->
    obj = process.memoryUsage()

    string = "PROF: 
      #{Math.round process.uptime()} 
      #{obj.heapTotal} 
      #{obj.heapUsed}"

    console.log string
  , 30*1000

express = require('express');
app     = express();

require 'longjohn'

require("#{__dirname}/config") app
require("#{__dirname}/routes") app


app.listen app.get 'port'

module.exports = app
