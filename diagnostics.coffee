diagnostics =
  process: (cb) ->
    # Heap usage output
    obj = process.memoryUsage()

    string = "PROF: 
      #{Math.round process.uptime()} 
      #{Math.round(obj.heapTotal/1024/1024)}MB
      #{Math.round(obj.heapUsed/1024/1024)}MB"

    console.log string

    cb? null, {
      uptime:process.uptime(),
      heapTotal:obj.heapTotal,
      heapUsed:obj.heapUsed
    }

  request: (cb) ->
    ###
    #Check responsiveness of app periodically
    ###
    url = process.env.NODE_URL || "http://localhost:3000"
    require('http').get(url, (res) ->
      console.log "Http request got response: #{res.statusCode}"
      cb? null, res
    ).on('error', (error) ->
      console.log "Http request got error: #{error.message}"
      cb? error, null
    )

# On initial load, run all diagnostics (handy for one off jobs)
diagnostics.process()
diagnostics.request()

module.exports = diagnostics
