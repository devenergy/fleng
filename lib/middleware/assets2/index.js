'use strict';

// Dependencies
var Assets = require('./assets');

module.exports = function (app) {
  var config = app.config;
  var root = config.get('root');
  var options = config.get('middleware:assets');
  var assets = new Assets(root, options);

  // Template helpers
  app.locals.stylesheet = assets.helper(function (url, attr) {
    return '<link rel="stylesheet" href="' + url + '" />';
  }, 'css');

  app.locals.script = assets.helper(function (url, attr) {
    return '<script src="' + url + '"></script>';
  }, 'js');

  app.locals.assetPath = assets.helper(function (url) {
    return url;
  });

  return assets.router;
};
