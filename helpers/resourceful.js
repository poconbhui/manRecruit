module.exports = function(app, resource, controller){
  app.param(function(name, fn){
    if (fn instanceof RegExp) {
      return function(req, res, next, val){
        var captures;
        if (captures = fn.exec(String(val))) {
          req.params[name] = captures;
          next();
        } else {
          next('route');
        }
      }
    }
  });

  app.param('id', /.*/);

  app.get(resource, controller.index);
  app.get(resource+'/new', controller.new);
  app.post(resource, controller.create);
  app.get(resource+'/:id', controller.show);
  app.get(resource+'/:id/edit', controller.edit);
  app.put(resource+'/:id', controller.update);
  app.delete(resource+'/:id', controller.delete);

  return true;
};
