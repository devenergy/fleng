'use strict';

// Core modules
var path = require('path');

// Dependencies
var _ = require('lodash');
var connectAssets = require('connect-assets');

module.exports = function (app, callback) {
  var isProduction = process.env.NODE_ENV === 'production';
  var root = app.config.get('root');
  var config = app.config.get('middleware.assets');

  var paths = _.map(config.paths || [], function (assetPath) {
    return path.resolve(root, assetPath);
  });

  if ('function' !== typeof callback) {
    callback = function () {};
  }

  return connectAssets({
    paths: paths,
    helperContext: app.locals,
    servePath: config.servePath,
    precompile: config.precompile,
    build: isProduction,
    buildDir: config.buildDir != null ? path.join(path.relative(process.cwd(), root), config.buildDir) : null,
    compile: config.compile,
    compress: config.compress,
    gzip: isProduction,
    fingerprinting: isProduction
  }, callback);
};
