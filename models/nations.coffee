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

    tmpList = []
    for nationList in nations
      for j in [0..max_len]
        tmpList.push nationList[j] if nationList[j]

    sinkerNations = _.uniq tmpList

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

    console.log list.indexOf 'revert'
    console.log 'appendable: ',ret
    ret

  getHead = (list) ->
    _.first list, 10

  pushNations = (source, sourceList, newList, head) ->
    #Push new newList onto source list
    multi = redis.multi()
    for nation in getAppendable(newList, head).reverse()
      multi.lpush source, nation
    multi.exec ->

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

  pushNations 'sinker', sinkerNations, _.first(sinkerNations,50), sinkerHead
  sinkerHead = sinkerNations

  console.log 'sinkerHead now: ',sinkerNations.length, sinkerHead.length


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

    heads_loaded = () ->
      # NOW generate recruitable list
      updateRecruitable ->

        # Boot update loops now that everything is done
        setInterval(updateNewNations, 30*1000)
        setInterval(updateFeederNations, 30*1000)
        setInterval(updateSinkerNations, 30*1000)

        setInterval(updateRecruitable, 15*1000)


    run_lists_loaded = () ->

      # find nations in base lists already in the database
      check_nations = newNations.concat(sinkerNations)
      nation_collection.find(
        {'name':{$in:check_nations}}
      )
      .toArray (error, results) ->

        if error
          console.log 'There was an error loading initial nations: ',error
          return

        # Get array of nation names from database entries
        results = _.map results, (result) ->
          result.name

        heads_loaded = _.after 2, heads_loaded

        ###
        #The feeder nations lists runs a newest first algorithm
        #so, we only need to worry about finding the most recently
        #found nation
        ###
        feederHead = results
        redis.lrange 'feeder', 0, 10, (error,reply) ->
          feederHead.push.apply feederHead, reply
          heads_loaded()

        ###
        #The sinker nations lists runs a total region algorithm,
        #we need to do one of two things
        # 1. If redis is already populated, just find the newest head
        # 2. If redis is not populated, populate it and set a head
        ###
        redis.llen 'sinker', (error,reply) ->
          if reply
            console.log 'generating head'
            sinkerHead = results
          else
            console.log 'populating redis'
            multi = redis.multi()
            for nation in _.difference(sinkerNations, results).reverse()
              multi.lpush 'sinker', nation
            multi.exec()
            sinkerHead = _.first sinkerNations, 10

          heads_loaded()


    run_lists_loaded = _.after 3, run_lists_loaded

    # Preload NSAPI lists
    updateSinkerNations () -> run_lists_loaded()
    updateNewNations () -> run_lists_loaded()
    updateFeederNations () -> run_lists_loaded()


module.exports = Nation
