###
#Define Routings
###

SessionController = require "#{__dirname}/controllers/sessions"
NationController  = require "#{__dirname}/controllers/nations"
UserController    = require "#{__dirname}/controllers/users"

routing = (app) ->

  middleware = []

  # Define SessionController routing

  app.get  '/login',  middleware, SessionController::new
  app.post '/login',  middleware, SessionController::create
  app.get  '/logout', middleware, SessionController::destroy


  ###
  #Require logged in from here
  ###
  middleware.push(
    SessionController::loadSessionData,
    SessionController::requireLoggedIn,
    NationController::loadNumbers
  )

  # Define NationController routing
  app.get '/', (req,res) ->
    res.redirect '/nations'
  app.get  '/nations', middleware, NationController::index

  app.param 'nationSource', (req, res, next, nationSource) ->
    if nationSource in ['feeder','sinker']
      res.locals.nationSource = nationSource
      next()
    else
      res.redirect '/nations'

  app.get  '/nations/:nationSource/new', middleware, NationController::new
  app.post '/nations/:nationSource',     middleware, NationController::create



  app.get  '/login/admin', middleware, SessionController::newAdmin
  app.post '/login/admin', middleware, SessionController::createAdmin

  ###
  #Require Admin from here
  ###
  middleware.push SessionController::requireAdmin


  # Continue defining NationController admin routing
  app.get(
    '/nations/recruitmentNumbers',
    middleware,
    NationController::recruitmentNumbers
  )
  app.get '/nations/:nation', middleware, NationController::show


  # Define UserController routing
  app.get  '/users',       middleware, UserController::index
  app.get  '/users/new',   middleware, UserController::new
  app.post '/users',       middleware, UserController::create
  app.get  '/users/:user', middleware, UserController::show

module.exports = routing
