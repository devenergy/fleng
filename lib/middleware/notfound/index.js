'use strict';

module.exports = function urlNotFound() {
  return function raiseUrlNotFoundError(req, res, next) {
    var error = new Error('Cannot ' + req.method + ' ' + req.url);
    error.status = 404;
    next(error);
  };
}
