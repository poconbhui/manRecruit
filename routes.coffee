###
#Define Routings
###

routing = (app) ->

  # Define SessionController routing
  SessionController = require "#{__dirname}/controllers/sessions"

  app.get  '/login',  SessionController::new
  app.post '/login',  SessionController::create
  app.get  '/logout', SessionController::destroy

  # Load sessions and require logged in
  middleware = [
    SessionController::loadSessionData
    SessionController::requireLoggedIn
  ]



  ###
  #Require logged in from here
  ###

  # Define NationController routing
  NationController = require "#{__dirname}/controllers/nations"

  middleware.push NationController::loadNumbers

  app.get '/', (req,res) ->
    res.redirect '/nations'
  app.get  '/nations', middleware, NationController::index

  app.param 'nationSource', (req, res, next, nationSource) ->
    if nationSource in ['feeder','sinker']
      res.locals.nationSource = nationSource
      next()
    else
      res.redirect '/nations'

  app.get  '/nations/:nationSource/new', middleware,  NationController::new
  app.post '/nations/:nationSource', middleware, NationController::create



  ###
  #Require Admin from here
  ###
  app.get  '/login/admin', middleware, SessionController::newAdmin
  app.post '/login/admin', middleware, SessionController::createAdmin

  # Require admin
  middleware.push SessionController::requireAdmin


  # Continue defining NationController routing
  app.get '/nations/recruitmentNumbers',
          middleware,
          NationController::recruitmentNumbers
  app.get '/nations/:nation', middleware, NationController::show


  # Define UserController routing
  UserController = require "#{__dirname}/controllers/users"

  app.get  '/users',       middleware, UserController::index
  app.get  '/users/new',   middleware, UserController::new
  app.post '/users',       middleware, UserController::create
  app.get  '/users/:user', middleware, UserController::show

module.exports = routing
