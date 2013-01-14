###
#Define Routings
###

routing = (app) ->

  # Define sessionController routing
  sessionController = require "#{__dirname}/controllers/sessions"

  app.get  '/login',  sessionController.new
  app.post '/login',  sessionController.create
  app.get  '/logout', sessionController.destroy

  # Load sessions and require logged in
  middleware = [
    sessionController.loadSessionData
    sessionController.requireLoggedIn
  ]



  ###
  #Require logged in from here
  ###

  # Define nationController routing
  nationController = require "#{__dirname}/controllers/nations"

  middleware.push nationController.loadNumbers

  app.get '/', (req,res) ->
    res.redirect '/nations'
  app.get  '/nations', middleware, nationController.index
  app.get  '/nations/new', middleware,  nationController.new
  app.post '/nations', middleware, nationController.create



  ###
  #Require Admin from here
  ###
  app.get  '/login/admin', middleware, sessionController.newAdmin
  app.post '/login/admin', middleware, sessionController.createAdmin

  # Require admin
  middleware.push sessionController.requireAdmin


  # Continue defining nationController routing
  app.get '/nations/recruitmentNumbers',
          middleware,
          nationController.recruitmentNumbers
  app.get '/nations/:nation', middleware, nationController.show


  # Define userController routing
  userController = require "#{__dirname}/controllers/users"

  app.get  '/users',       middleware, userController.index
  app.get  '/users/new',   middleware, userController.new
  app.post '/users',       middleware, userController.create
  app.get  '/users/:user', middleware, userController.show

module.exports = routing
