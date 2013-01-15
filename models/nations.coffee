nationDB     = require("#{__dirname}/../connections").mongodb
redis        = require("#{__dirname}/../connections").redis
Nationstates = require "#{__dirname}/../helpers/nationstates"
_            = require 'underscore'


nationDB (db)->
  nationDB = db
  bootNationUpdateLoops()

redis (db) ->
  redis = db



# Keep an array of all nations currently in the feeders
feederNations = []
updateFeederNations = (callback) ->
  NS = new Nationstates()
  nations = []

  update = _.after NS.feeders.length, ->
    feederNations.length = 0
    feederNations.push.apply feederNations,nations

    callback? feederNations

    nations.length = 0

  _.forEach NS.feeders, (feeder) ->
    NS.api {'region':feeder, 'q':'nations'}, (response) ->
      nations = nations.concat response.REGION.NATIONS[0].split(':')
      update()


# Keep array of all nations currently in new list
newNations = []
updateNewNations = (callback) ->
  NS = new Nationstates()
  NS.api {'q':'newnations'}, (response) ->

    newNations.length = 0
    newNations.push.apply newNations, response.WORLD.NEWNATIONS[0].split(',')

    callback? newNations

# Keep array of the sinker nations
sinkerNations = []
updateSinkerNations = (callback) ->
  NS = new Nationstates()
  nations = []

  update = _.after NS.sinkers.length, ->
    max_len = 0
    for nationList in nations
      max_len = nationList.length if nationList.length > max_len

    for nationList in nations
      for j in [0..max_len]
        sinkerNations.push nationList[j] if nationList[j]

    callback? sinkerNations


  _.forEach NS.sinkers, (sinker) ->
    NS.api {'region':sinker, 'q':'nations'}, (response) ->
      nation_array = response.REGION.NATIONS[0].split(':')
      nations.push nation_array
      update()



#Keep track of leading nations from previous runs
feederHead = []
sinkerHead = []
updateRecruitable = (callback) ->

  #Get list of new nations since last update
  getAppendable = (list, head) ->
    ret = list.slice 0, _.chain(head)
      .map( (nation) ->
        list.indexOf nation
      )
      .filter( (index) ->
        index >= 0
      )
      .min()
      .value()

  getHead = (list) ->
    _.first list, 10

  pushNations = (source, sourceList, newList, head) ->
    #Push new newList onto source list
    for nation in getAppendable(newList, head).reverse()
      redis.lpush source, nation

    #Remove nations not in source
    redis.lrange source, 0, -1, (error, reply) ->
      multi = redis.multi()
      for nation in _.difference(reply, sourceList)
        multi.lrem source, 0, nation
      multi.exec()

  ###
  #Update Feeder arrays
  ###

  pushNations 'feeder', feederNations, newNations, feederHead
  feederHead = getHead newNations

  ###
  #Update Sinker arrays
  ###

  pushNations 'sinker', sinkerNations, sinkerNations, sinkerHead
  sinkerHead = getHead sinkerNations


  callback?()


###
#Define Nation object from here
###

class Nation
  constructor: (@_region, @_sources) ->
    @_sources = _.flatten [@_sources]

  # Return all recruitable
  getAllRecruitable: (callback) ->
    multi = redis.multi()
    multi.lrange source, 0, 50 for source in @_sources
    multi.exec (error,reply) =>
      callback error, _.object @_sources, reply

  countRecruitable: (callback) ->
    multi = redis.multi()
    multi.llen source for source in @_sources
    multi.exec (error,reply) =>
      callback error, _.object @_sources, reply


  # Pop first nation off list
  popFirstRecruitable: (callback) ->
    multi = redis.multi()
    multi.lpop source for source in @_sources
    multi.exec (error,reply) =>
      callback error, _.object @_sources, reply


  _getNationCollection: (callback) ->
    nationDB.collection 'nations', (error, nation_collection) ->
      if(error)
        callback error, null
      else
        callback null,  nation_collection


  # Add nation and data to the recruited list
  addRecruited: (data, callback) ->
    data.date = new Date()
    data.source = @_sources[0]

    console.log 'ADDING', @_sources, data

    Nation::_getNationCollection (error, nation_collection) ->
      #recruited.push(data);
      # If error, return error and die
      if error
        callback? error
      else
        #data._id = data.name;
        nation_collection.insert data, {w:1}, (error,result) ->
          console.log 'INSERT', error
          callback? error,result


  ###
  #Get recruitment numbers from mapReduce run
  #Signatures:
  # callback
  # recruiter, callback
  ###
  getRecruitmentNumbers: (arg1, arg2) ->

    # Parse args
    query = {}
    if arg2?
      query.recruiter = arg1
      callback = arg2
    else
      callback = arg1
  

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
    
    query.date = { $gte:lastLastSunday }
    query.source = { $in:@_sources }


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

    Nation::_getNationCollection (error, nation_collection) ->
      nation_collection.mapReduce map, reduce,
        'query':query
        'out':{inline:1}
      , (error,result) ->
          if error
            callback error, null
          else
            result = _.map result, (entry) ->
              'recruiter': entry._id
              'count': entry.value

            callback null, result


  find: (nationName, callback) ->
    error = null

    Nation::_getNationCollection (error, nation_collection) ->
      nation_collection.findOne {'name':nationName}, (error, nation) ->
        if error
          callback null, {'name':nationName, 'status': 'not found'}
        else
          if not nation
            nation = {name: nationName, status: 'not found'}
          else
            nation.status = 'recruited'

          callback(null, nation)



###
#Boot Nation Update Loops
###
bootNationUpdateLoops = ->
  Nation::_getNationCollection (error, nation_collection) ->
    ### 
    # Initialization:
    #  Find newNations.
    #  Find feederNations
    #  Generate heads from nations already found in the database
    #  Generate recruitable list given newNations, feederNations
    #    and unrecruitable list
    ###

    # Get Sinker Nations
    updateSinkerNations () ->

      # Get newNations
      updateNewNations () ->

        check_nations = newNations.concat(sinkerNations)

        # find newNations already in database
        nation_collection
          .find({'name':{$in:check_nations}})
          .toArray (error, results) ->

            if error
              console.log 'There was an error loading initial nations: ',error
              return

            results = _.map results, (result) ->
              result.name

            # Generate unrecruitable lists from database results
            feederHead = results

            # Remove results from initial sinker list
            sinkerNations = _.difference(sinkerNations, results)

            # Add newest member in redis list to heads
            redis.multi()
              .lrange('feeder', 0,10)
              .lrange('sinker', 0,10)
              .exec (error, reply) ->
                feederHead = feederHead.concat reply[0] if reply[0].length
                sinkerHead = sinkerHead.concat reply[1] if reply[1].length

                # Find feederNations
                updateFeederNations ->

                  # NOW generate recruitable list
                  updateRecruitable ->

                    # Boot update loops now that everything is done
                    setInterval(updateNewNations, 30*1000)
                    setInterval(updateFeederNations, 30*1000)
                    setInterval(updateSinkerNations, 30*1000)

                    setInterval(updateRecruitable, 15*1000)


module.exports = Nation
