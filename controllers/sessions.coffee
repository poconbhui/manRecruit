User     = require "#{__dirname}/../models/users"
Sessions = require "#{__dirname}/../models/sessions"
crypto   = require 'crypto'

class SessionController
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
    user_input = req.body.user
    user = new User user_input.name

    user.verify user_input.password, (error, verified) ->
      if verified
        session = new Sessions user.username

        session.set 'username', user.username
        session.set 'admin', false

        res.cookie 'username', user.username,
          signed: true
          httpOnly: true
          path: '/'

      res.redirect '/'


  createAdmin: (req,res) ->
    user = req.body.user || {}

    if user.name == 'admin' and user.password == 'I_HEART_TD'
      req.session.set 'admin', true

    res.redirect '/'


  destroy: (req,res) ->
    session = new Sessions req.signedCookies.username

    session.destroy()

    res.clearCookie 'username'
    res.redirect '/login'


  loadSessionData: (req,res,next) ->
    if req.signedCookies.username
      res.locals.signed_in = true
      res.locals.username = req.signedCookies.username
      req.session = new Sessions req.signedCookies.username
    else
      res.locals.signed_in = false

    next()


  requireLoggedIn: (req,res,next) ->
    if res.locals.signed_in
      next()
    else
      res.redirect '/login'


  requireAdmin: (req,res,next) ->
    req.session.get 'admin', (error, is_admin) ->
      if is_admin == 'true'
        next()
      else
        res.redirect '/login/admin'


module.exports = SessionController
