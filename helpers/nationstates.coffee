userAgent = "Node.js NSAPI by Poopcannon. poopcannon@gmail.com"

xml2js = require( 'xml2js' )
http   = require( 'http'   )


# Get xml data via http.get method and return it as a parsed object
xmlGet = (options, callback) ->

  do runRequest = ->
    req = http.request options, (res) ->
      xmlReturned = ""

      res.setEncoding 'utf8'

      res
        .on('data', (chunk) ->
          xmlReturned = xmlReturned + chunk
        )
        .on('end', ->
          # TODO: add some error checking

          # check if we've been locked out of the API
          if xmlReturned.match(
            "<h1>Too Many Requests From Your IP Address</h1>"
          )?
            # We've been locked out! Return false and exit
            callback false, null
            return false

          # We've got some data! Parse and return
          parser = new xml2js.Parser()
          parser.parseString xmlReturned, (error, result) ->
            xmlReturned = null # unset xmlReturned
            if error
              callback error, null
            else
              callback null,  result
        )
        .on('error', (error) ->
          console.log('problem with request: ')
          console.log(error.code)
          callback(error, null)
        )

    req.on('error', (error) ->

      switch error.code
        when 'ECONNRESET', 'ETIMEDOUT'
          runRequest()
        else
          console.log 'NSAPI Request error: ', error.code

    )
    req.end()

# The main Nationstates object output by this module
class Nationstates
  constructor: (options) ->

    options = options || {}

    # Define default values for feeders
    @feeders = options.feeders || [
      "the_pacific",
      "the_north_pacific",
      "the_south_pacific",
      "the_east_pacific",
      "the_west_pacific"
    ]

    # Define default values for sinkers
    @sinkers = options.sinkers || [
      "lazarus",
      "osiris",
      "balder"
    ]

    @userAgent = options.userAgent || userAgent

  # The actual API used for interacting with Nationstates
  api: (options, callback) ->
    
    request = ""

    what = Object.prototype.toString

    # parse options to request
    switch what.call options

      when '[object Array]'

        ###
        #If the input options are an array, assume this is a list
        #of data to parse and query
        ###
        request = "q="+options.join('+')


      when '[object Object]'

        ###
        #If input options is an object, assume this is a list of
        #key-value pairs to query.
        #If a value is an array, assume this is a list of data
        ###
        for key,value of options

          ###
          #We expect the value to be a string or an array
          #If it's an array, we have to parse it to a string
          ###
          if what.call(value) == '[object Array]'
            value = value.join('+')

          request = request + key + "=" + value + "&"

        # Pop off the last & from the request string
        request = request.replace /\&$/, ''

      else

        # By default, we'll assume we've been passed a string
        request = options

    # Http options, specifying how to connect to the NSAPI
    http_options =
      host: 'www.nationstates.net',
      port: '80',
      path: '/cgi-bin/api.cgi?' + request,
      headers: {'User-Agent': @userAgent}

    # Run the query
    xmlGet http_options, (error, res) -> callback res

module.exports = Nationstates
