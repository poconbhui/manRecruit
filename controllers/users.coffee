User = require "#{__dirname}/../models/users"

userController =

  index: (req,res) -> res.render 'users/index.html.jade'

  new: (req,res) -> res.render 'users/new.html.jade'

  create: (req,res) ->
    username = req.body.username
    res.redirect "/users/#{username}"
    
  show: (req,res) ->
    username = req.params.user
    user = new User username

    user.generatePassword (error, password) ->
      res.send {username,password}

module.exports = userController
