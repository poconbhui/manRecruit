User     = require "#{__dirname}/../models/users"
Sessions = require "#{__dirname}/../models/sessions"
crypto   = require 'crypto'

sessionController =
  new: (req,res) ->

    common = ->
      res.locals.message = 'User Login'
      res.locals.action  = '/login'

      res.render 'sessions/new.html.jade'

    switch res.locals.environment
      when 'development', 'staging'
        user = new User 'TD'

        user.generatePassword (error, password) ->
          res.locals.username = user.username
          res.locals.password = password

          common()

      when 'production'
        common()


  newAdmin: (req,res) ->
    if res.locals.environment in ['development', 'staging']
        res.locals.username = 'admin'
        res.locals.password = 'I_HEART_TD'

    res.locals.message = 'Admin Login'
    res.locals.action  = '/login/admin'

    res.render 'sessions/new.html.jade'


  create: (req,res) ->
    user_in = req.body.user
    user = new User user_in.name

    user.verify user_in.password, (error, result) ->
      if result
        crypto.randomBytes 24, (ex,buf) ->
          token = buf.toString 'hex'
          session = new Sessions token

          session.set 'username', user.username
          session.set 'admin', false

          res.cookie 'session', token, {signed:true}

          res.redirect '/nations'
      else
        res.redirect '/nations'


  createAdmin: (req,res) ->
    user = req.body.user || {}

    if user.name == 'admin' and user.password == 'I_HEART_TD'
      req.session.set 'admin', true

    res.redirect '/nations'


  destroy: (req,res) ->
    session = new Sessions req.signedCookies.session
    session.destroy()
    res.clearCookie 'session'
    res.redirect '/login'


  loadSessionData: (req,res,next) ->
    if req.signedCookies.session
      req.session = new Sessions req.signedCookies.session

    next()


  requireLoggedIn: (req,res,next) ->
    
    unless req.session
      res.redirect '/login'
      return false

    req.session.get 'username', (error, username) ->
      if username
        next()
      else
        res.redirect '/login'


  requireAdmin: (req,res,next) ->
    req.session.get 'admin', (error, status) ->
      if status == true
        next()
      else
        res.redirect '/login/admin'


module.exports = sessionController
