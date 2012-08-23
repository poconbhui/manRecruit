var nseq = require('./helpers/nseq');

n = new nseq()
  .push('parallel', function(s){
    console.log('First');
    setTimeout(function(){
      s.vals['willy'] = 'bum';
      s.done();
    }, 1000);
  })
  .push(function(s){
    s.vals['man'] = 'wee';
    console.log('Second');
    s.done();
  })
  .push(function(s){
    console.log('ONE');
    console.log(s.vals);
  })
  .done();

z = new nseq()
  .push('serial', function(s){
    console.log('Third');
    s.vals['gee'] = 'face';
    s.done();
  })
  .push(function(s){
    s.vals['ook'] = 'q';
    console.log('Fourth');
    s.done();
  })
  .push(function(s){
    console.log('TWO');
    console.log(s.vals);
  })
  .done();
