mongo        = require('mongodb')
mongoURI     = process.env.MONGOLAB_URI || 'mongodb://127.0.0.1:27017/nation_db'

connections =
  _mongoDB: null
  mongodb: (callback) ->
    if connections._mongoDB
      callback null, connections._mongoDB

    else

      # Open db connection to MongoDB database
      mongo.MongoClient.connect mongoURI,
        db:
          w: 1
        server:
          auto_reconnect: true
      , (error, db) ->

        if error
          console.log 'ERROR CONNECTING TO MONGODB: ', error
          callback error, null
          return false

        connections._mongoDB = db

        # This is fine, because the event loop will keep it open
        callback null, db


  _redisDB: null
  redis: (callback) ->
    if connections._redisDB
      callback null, connections._redisDB

    else

      # Set up connection to Redis database
      if process.env.REDISTOGO_URL
        rtg_url = require('url').parse(process.env.REDISTOGO_URL)
        redis = require('redis').createClient rtg_url.port, rtg_url.hostname
        redis.auth rtg_url.auth.split(':')[1]
      else
        redis = require('redis').createClient()

      connections._redisDB = redis
      callback null, redis


module.exports = connections
