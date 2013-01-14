#!/usr/bin/env mocha

var app = require('../app');
var request = require('supertest')(app);

describe('Unauthorized User', function(){

  describe('GET /', function(){
    it('Should redirect to /login', function(done){
      request
        .get('/nations')
          .expect('Moved Temporarily. Redirecting to /login')
          .expect(302)
          .end(done);
    });
  });
});

describe('Authorized User', function(){

  var cookie;

  it('Should redirect to /nations after logging in', function(done){
    request
      .post('/login')
      .send( {
        user: {
          name: 'TD',
          password: '61a473734317c9f4f406e8f6f0af7489'
        }
      })
      .expect('Moved Temporarily. Redirecting to /nations')
      .expect(302)
      .end(function(err, res){
        cookie = res.headers['set-cookie'];
        done(err);
      })
  });

  it('should show a list of nations at GET /nations', function(done){
    request
      .get('/nations')
      .set('cookie', cookie)
      .expect(/<h2>Recruitable Nations: \d+<\/h2>/)
      .expect(200)
      .end(done);
  });

  it('should GET /new', function(done){
    request
      .get('/nations/new')
      .set('cookie', cookie)
      .expect(200)
      .end(done)
  });


  describe('Non-Admin User', function(){
    it(
      'should not be able to access GET /nations/recruitmentNumbers',
      function(done){
        request
          .get('/nations/recruitmentNumbers')
          .set('cookie', cookie)
          .expect('Moved Temporarily. Redirecting to /login/admin')
          .expect(302)
          .end(done);
      }
    );

    it('should not be able to GET /users', function(done){
      request
        .get('/users')
        .set('cookie', cookie)
        .expect('Moved Temporarily. Redirecting to /login/admin')
        .expect(302)
        .end(done);
    });
  })

  describe('Admin User', function(){
    it('should redirect POST /login/admin to GET /nations', function(done){
      request
        .post('/login/admin')
        .send( {
          user: {
            name: 'admin',
            password: 'I_HEART_TD'
          }
        })
        .set('cookie', cookie)
        .expect('Moved Temporarily. Redirecting to /nations')
        .expect(302)
        .end(done);
    });

    it(
      'should be able to access GET /nations/recruitmentNumbers',
      function(done){
        request
          .get('/nations/recruitmentNumbers')
          .set('cookie', cookie)
          .expect(/<div>Totals for[^<]*<\/div>/)
          .expect(200)
          .end(done);
      }
    );
  });
});

