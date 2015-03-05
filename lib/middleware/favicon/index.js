'use strict';

// Core modules
var path = require('path');

// Dependencies
var serveFavicon = require('serve-favicon');

module.exports = function (app) {
  var config = app.config.get('middleware.favicon');
  var faviconPath = config.path;

  if (faviconPath) {
    faviconPath = path.resolve(faviconPath)
  }
  else {
    faviconPath = path.resolve(__dirname, 'favicon.ico');
  }

  return serveFavicon(faviconPath);
};
