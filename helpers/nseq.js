var events = require('events');

var nseq = function() {
  var self = this;

  var stack = arguments[0] || [];
  var stackCount = 0;

  this.vals = {};

  this.push = function(options){
    if(options.call){
      stack.push({type: 'serial', func: options});
    }
    else{
      stack.push(options);
    }

    return self;
  };

  var funcState = function(){
    this.vals = self.vals;
  };

  var done = function(){
    if(stack[0]){
      fs = new funcState;
      fs.done = done;

      if(!stack[0].type || stack[0].type == 'serial'){
        var f = stack.shift();
        f.func(fs);
      }
      else if(stack[0].type = 'parallel'){
        var f = stack.shift();
        var fs = new funcState;

        fs.doneTotal = f.range.length;
        fs.doneCount = 0;

        fs.done = function(){
          ++fs.doneCount;

          if(fs.doneCount == fs.doneTotal){
            done();
          }
        };

        for(var key in f.range){
          var val = f.range[key];
          (function(key,val){
            f.func(key, val, fs);
          })(key, val);
        }
      }
    }
  };

  this.exec = function(){
    done();
  }
};

module.exports = nseq;
