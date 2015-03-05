'use strict';

// Core modules
var path = require('path');

// Dependencies
var express = require('express');
var serveStatic = require('serve-static');

// Define middleware
module.exports = function (app) {
  var root = app.config.get('root');
  var config = app.config.get('middleware.static') || {};
  var paths = config.paths || [];
  var router = express.Router();

  paths.forEach(function (staticPath) {
    staticPath = path.resolve(root, staticPath);
    router.use(serveStatic(staticPath));
  });

  return router;
};
