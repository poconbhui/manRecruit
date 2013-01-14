#!/usr/bin/env mocha

app = require "#{__dirname}/../app"
request = require('supertest') app

describe 'Unauthorized User', ->

  describe 'GET /', ->
    it 'Should redirect to /login', (done) ->
      request
        .get('/nations')
          .expect('Moved Temporarily. Redirecting to /login')
          .expect(302)
          .end(done)

describe 'Authorized User', ->

  cookie = {}

  it 'Should redirect to /nations after logging in', (done) ->
    request
      .post('/login')
      .send(
        user:
          name: 'TD',
          password: '61a473734317c9f4f406e8f6f0af7489'
      )
      .expect('Moved Temporarily. Redirecting to /nations')
      .expect(302)
      .end( (err, res) ->
        cookie = res.headers['set-cookie']
        done(err)
      )

  it 'should show a list of nations at GET /nations', (done) ->
    request
      .get('/nations')
      .set('cookie', cookie)
      .expect(200)
      .end(done)

  it 'should GET /new', (done) ->
    request
      .get('/nations/new')
      .set('cookie', cookie)
      .expect(200)
      .end(done)


  describe 'Non-Admin User', ->
    it 'should not be able to access GET /nations/recruitmentNumbers', (done) ->
      request
        .get('/nations/recruitmentNumbers')
        .set('cookie', cookie)
        .expect('Moved Temporarily. Redirecting to /login/admin')
        .expect(302)
        .end(done)

    it 'should not be able to GET /users', (done) ->
      request
        .get('/users')
        .set('cookie', cookie)
        .expect('Moved Temporarily. Redirecting to /login/admin')
        .expect(302)
        .end(done)

  describe 'Admin User', ->
    it 'should redirect successful login to GET /nations', (done) ->
      request
        .post('/login/admin')
        .send(
          user:
            name: 'admin',
            password: 'I_HEART_TD'
        )
        .set('cookie', cookie)
        .expect('Moved Temporarily. Redirecting to /nations')
        .expect(302)
        .end(done)

    it 'should be able to access GET /nations/recruitmentNumbers', (done) ->
      request
        .get('/nations/recruitmentNumbers')
        .set('cookie', cookie)
        .expect(200)
        .end(done)
