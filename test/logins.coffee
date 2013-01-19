#!/usr/bin/env mocha

app = require "#{__dirname}/../app"
request = require('supertest') app

User = require "#{__dirname}/../models/users"

randomString = Math.random().toString(36).replace(/[0-9]/g,'').substring(2,7)
user = new User randomString

describe 'Permissions and Routes', ->
  describe 'Unauthorized User', ->

    it 'Should be redirected to /login when trying to GET /', (done) ->
      request
        .get('/')
          .expect('Moved Temporarily. Redirecting to /login')
          .expect(302)
          .end(done)

  describe 'Authorized User', ->

    cookie = {}

    it 'Should be redirected to / after logging in', (done) ->
      user.generatePassword (error, password) ->
        request
          .post('/login')
          .send(
            user:
              name: user.username
              password: password
          )
          .expect(302)
          .end( (err, res) ->
            cookie = res.headers['set-cookie']
            done(err)
          )

    it 'should be able to GET /nations', (done) ->
      request
        .get('/nations')
        .set('cookie', cookie)
        .expect(200)
        .end(done)

    it 'should be able to GET /nations/feeder/new', (done) ->
      request
        .get('/nations/feeder/new')
        .set('cookie', cookie)
        .expect(200)
        .end(done)


    describe 'Non-Admin User', ->
      it 'should not be able to access GET /nations/recruitmentNumbers', (done) ->
        request
          .get('/nations/recruitmentNumbers')
          .set('cookie', cookie)
          .expect(302)
          .end(done)

      it 'should not be able to GET /users', (done) ->
        request
          .get('/users')
          .set('cookie', cookie)
          .expect(302)
          .end(done)

    describe 'Admin User', ->
      it 'should redirect successful login to GET /', (done) ->
        request
          .post('/login/admin')
          .send(
            user:
              name: 'admin',
              password: 'I_HEART_TD'
          )
          .set('cookie', cookie)
          .expect('Moved Temporarily. Redirecting to /')
          .expect(302)
          .end(done)

      it 'should be able to access GET /nations/recruitmentNumbers', (done) ->
        request
          .get('/nations/recruitmentNumbers')
          .set('cookie', cookie)
          .expect(200)
          .end(done)
