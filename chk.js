var nseq = require('./helpers/nseq');

n = new nseq()
  .push({
    type: 'parallel',
    range: [1,2,3,4],
    func: function(key, val, s){
      console.log('First');
      console.log(key);
      console.log(val);
      console.log(s);
      setTimeout(function(){
        s.vals['willy'] = 'bum';
        s.done();
      }, 1000);
    }
  })
  .push(function(s){
    s.vals['man'] = 'wee';
    console.log('Second');
    s.done();
  })
  .push(function(s){
    console.log(s);
    console.log('ONE');
    console.log(s.vals);
  })
  .exec();

z = new nseq()
  .push(function(s){
    console.log('Third');
    console.log(s);
    s.vals['gee'] = 'face';
    s.done();
  })
  .push(function(s){
    console.log('Fourth');
    console.log(s);
    s.vals['ook'] = 'q';
    s.done();
  })
  .push(function(s){
    console.log('TWO');
    console.log(s);
    console.log(s.vals);
  })
  .exec();
