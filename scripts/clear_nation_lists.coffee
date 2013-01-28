require("#{__dirname}/../connections").redis (error, db)->
  redis = db
  redis.on "connect", ->
    redis.multi()
      .ltrim('feeder', 0,0)
      .lpop('feeder')
      .ltrim('sinker', 0,0)
      .lpop('sinker')
      .exec (e,r) ->
        console.log 'replies: ',e,r
        redis.quit()
