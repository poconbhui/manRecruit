#!/usr/bin/env mocha

Nation = require "#{__dirname}/../models/nations"

nations = new Nation 'TNI', ['feeder','sinker']

describe 'Nations', ->
  describe 'popFirstRecruitable', ->

    it 'popFirstRecruitable should return unique recruitable nations', ->
      
      feederList = {}
      sinkerList = {}

      for i in [1..100]
        nations.popFirstRecruitable (error, callback) ->
          if error
            throw error

          if callback.feeder
            if feederList[callback.feeder]
              throw new Error "Nation returned twice for feeder"
            else
              feederList[callback.feeder] = true

          if callback.sinker
            if sinkerList[callback.sinker]
              throw new Error "Nation returned twice for feeder"
            else
              sinkerList[callback.sinker] = true
