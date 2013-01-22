mongodb = require("#{__dirname}/../connections").mongodb

mongodb (error, db) ->
  mongodb = db
  mongodb.collection('nations').rename('TNI:nations')
