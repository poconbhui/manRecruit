mongodb      = require("#{__dirname}/../connections").mongodb
redis        = require("#{__dirname}/../connections").redis
Nationstates = require "#{__dirname}/../utils/nationstates"
_            = require 'underscore'
Nation       = require "#{__dirname}/../models/nations"


# Connect databases
mongodb (error, db) ->
  mongodb = db
  redis (error, db) ->
    redis = db
    bootNationUpdateLoops()



# Keep an array of all nations currently in the feeders
feederNations = []
updateFeederNations = (callback) ->
  NS = new Nationstates()
  nations = []

  update = _.after NS.feeders.length, ->
    feederNations.length = 0
    feederNations.push.apply feederNations, nations

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
    for j in [0..max_len]
      for nationList in nations
        tmpList.push nationList[j] if nationList[j]

    sinkerNations.length = 0
    sinkerNations.push.apply sinkerNations, _.uniq tmpList

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
  feederHead.length = 0
  feederHead.push.apply feederHead, getHead newNations

  ###
  #Update Sinker arrays
  ###

  pushNations 'sinker', sinkerNations, _.first(sinkerNations,50), sinkerHead
  sinkerHead.length = 0
  sinkerHead.push.apply sinkerHead, sinkerNations

  callback?()



###
#Boot Nation Update Loops
###
bootNationUpdateLoops = ->
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
    nations = new Nation 'TNI', ['feeder','sinker']
    nations.nationDB.find(
      {'name':{$in:check_nations}}
    )
    .toArray (error, results) ->

      if error
        console.log 'There was an error loading initial nations
                    from mongodb: ',error
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
      feederHead.length = 0
      feederHead.push.apply feederHead, results
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
          sinkerHead.length = 0
          sinkerHead.push.apply sinkerHead, results
        else
          multi = redis.multi()
          for nation in _.difference(sinkerNations, results).reverse()
            multi.lpush 'sinker', nation
          multi.exec()
          sinkerHead.length = 0
          sinkerHead.push.apply sinkerHead, _.first sinkerNations, 10

        heads_loaded()


  run_lists_loaded = _.after 3, run_lists_loaded

  # Preload NSAPI lists
  updateSinkerNations () -> run_lists_loaded()
  updateNewNations () -> run_lists_loaded()
  updateFeederNations () -> run_lists_loaded()


