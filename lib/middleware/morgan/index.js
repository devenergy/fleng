'use strict';

// Dependencies
var morgan; // Lazy loaded

module.exports = function (app) {
  return function (req, res, next) {
    if (!app.parent) {
      morgan || (morgan = require('morgan')('dev'));
      morgan(req, res, next);
    }
    else {
      next();
    }
  }
};
