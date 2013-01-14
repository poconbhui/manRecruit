crypto = require('crypto')
secret = 'pw'

class User
  constructor: (@username) ->

  generatePassword: (callback) ->
    callback(
      null,
      crypto.createHash('md5').update(@username+secret).digest('hex')
    )

  verify: (password_in, callback) ->
    @generatePassword (error, password) =>
      if error
        callback error, null
        return false

      if password == password_in
        callback(null, true)
      else
        callback(null, false)

module.exports = User
