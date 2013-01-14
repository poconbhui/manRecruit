mongo        = require('mongodb')
mongoURI     = process.env.MONGOLAB_URI || 'mongodb://127.0.0.1:27017/nation_db'
Nationstates = require(__dirname+'/../helpers/nationstates')
_            = require('underscore')


# Open db connection to MongoDB database
nationDB = {}
mongo.MongoClient.connect mongoURI,
  db:
    w: 1
  server:
    auto_reconnect: true
, (error, db) ->

    if error
      console.log 'ERROR CONNECTING TO MONGODB: ', error

    # This is fine, because the event loop will keep it open
    nationDB = db

    bootNationUpdateLoops()



# The important arrays!
recruitable = []
unrecruitable = []
recruited = []


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


updateRecruitable = (callback) ->
  recruitable = _.chain(newNations)
    .union(recruitable)
    .intersection(feederNations)
    .difference(unrecruitable)
    .uniq()
    .value()

  # Only have to worry about newNations that didn't make the list
  unrecruitable = _.chain(newNations)
    .difference(recruitable)
    .value()

  console.log "RECRUITABLE LENGTH:   #{recruitable.length}"
  console.log "UNRECRUITABLE LENGTH: #{unrecruitable.length}"

  callback? recruitable, unrecruitable


###
#Define Nation object from here
###

class Nation
  constructor: (@_region) ->

  # Return all recruitable
  getAllRecruitable: (callback) ->
    callback null, recruitable

  countRecruitable: (callback) ->
    callback null, recruitable.length

  # Pop first nation off list
  popFirstRecruitable: (callback) ->
    callback null, recruitable.shift()

  # return all unrecruitable
  getAllUnrecruitable: (callback) ->
    callback null, unrecruitable

  addUnrecruitable: (nation) ->
    unrecruitable.push nation

  _getNationCollection: (callback) ->
    nationDB.collection 'nations', (error, nation_collection) ->
      if(error)
        callback error, null
      else
        callback null,  nation_collection

  # Add nation and data to the recruited list
  addRecruited: (data, callback) ->
    data.date = new Date()

    Nation::_getNationCollection (error, nation_collection) ->
      #recruited.push(data);
      # If error, return error and die
      if error
        callback? error
      else
        #data._id = data.name;
        nation_collection.insert data, {w:1}, (error,result) ->
          callback? error,result

  getRecruitedData: (callback) ->
    callback null, recruited

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

    if _.contains recruitable, nationName
      callback null, {'name': nationName, 'status': 'recruitable'}
      return true
    else
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
    #  Generate unrecruitable list from nations in newNations that have
    #    already been recruited.
    #  Find feederNations
    #  Generate recruitable list given newNations, feederNations
    #    and unrecruitable list
    ###

    # Get newNations
    updateNewNations (newNations) ->

      # find newNations already in database
      nation_collection
        .find({'name':{$in:newNations}})
        .toArray (error, results) ->

          if error
            console.log 'There was an error loading initial nations: ',error
            return

          # Generate unrecruitable list from database results
          unrecruitable = _.map results, (result) ->
            result.name
          

          # Find feederNations
          updateFeederNations ->

            # NOW generate recruitable list
            updateRecruitable ->

              # Boot update loops now that everything is done
              setInterval(updateNewNations, 30*1000)
              setInterval(updateFeederNations, 30*1000)
              setInterval(updateRecruitable, 15*1000)


module.exports = Nation
