function selfunc(func_in){
  return function(){
    func_in.apply(func_in, arguments);
  };
}

module.exports = selfunc;
