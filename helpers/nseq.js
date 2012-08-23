var events = require('events');

var nseq = function() {
  var self = this;

  var stack = [];
  var stackCount = 0;

  this.vals = {};

  this.push = function(){
    if(arguments[0] == 'serial'){
      stack.push({type: 'serial', func: arguments[1]});
    }
    else if(typeof arguments[0] == 'function'){
      stack.push({type: 'serial', func: arguments[0]});
    }
    else if(arguments[0] == 'parallel'){
      stack.push({type: 'parallel', func: arguments[1]});
    }

    return self;
  };

  this.done = function(){
    var f = stack.shift();
    
    if(typeof f !== 'undefined'){
      var args = [self];
      for(var i in arguments){
        args.push(arguments[i]);
      }

      f.func.apply(self.done,args);
    };
  };
};

module.exports = nseq;
