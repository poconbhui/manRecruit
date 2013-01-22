#!/usr/bin/env mocha

Nation = require "#{__dirname}/../models/nations"
_      = require "underscore"

describe 'Nations', ->

  describe 'popFirstRecruitable', ->

    it 'should return unique recruitable nations', (done) ->
      
      nations = new Nation 'TNI', ['feeder','sinker']

      feederList = {}
      sinkerList = {}

      done = _.after 50, done

      for i in [1..50]
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
          done()
