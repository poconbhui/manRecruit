###
#Define app configs
###

express = require 'express'

config = (app) ->
  app.use express.bodyParser()
  app.use express.cookieParser 'secret'

  app.set 'views', "#{__dirname}/views"
  app.engine 'jade', require('jade').__express

  app.locals._ = require 'underscore'

  app.set 'port', (process.env.PORT or 3000)

  app.configure 'development', ->
    console.log 'DEVELOPMENT'
    app.use (req,res,next) ->
      res.locals.environment = 'development'
      next()

  app.configure 'staging', ->
    console.log 'STAGING'
    app.use (req,res,next) ->
      res.locals.environment = 'staging'
      next()

  app.configure 'production', ->
    app.use (req,res,next) ->
      res.locals.environment = 'production'
      next()

module.exports = config
