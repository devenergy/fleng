'use strict';

// Core modules
var url = require('url');

// Dependencies
var _ = require('lodash');
var Assets = require('./assets');
var express = require('express');
var Promise = require('bluebird');

// Define middleware
module.exports = function (root, options) {
  if (_.isPlainObject(root)) {
    options = root;
    root = void 0;
  }

  options = parseOptions(options || {});

  var assets = new Assets(root, options);
  var app = express();
  var compileAssets = Promise.fromNode(assets.compile.bind(assets));

  options.helperContext.stylesheet = assets.helper(tagWriters.stylesheet, 'css');
  options.helperContext.script = assets.helper(tagWriters.script, 'js');
  options.helperContext.assetPath = assets.helper(tagWriters.noop);

  app.use(function (req, res, next) {
    var path = parseUrl(req.url).pathname.replace(/^\//, '');

    if (path.toLowerCase().indexOf(options.localServePath.toLowerCase()) === 0) {
      compileAssets.then(function () {
        assets.serveAsset(req, res, next);
      }, next);
    }
    else {
      next();
    }
  });

  app.set('assets', assets);

  return app;
};

var parseOptions = function parseOptions(options) {
  var isProduction = process.env.NODE_ENV === 'production';
  var isDevelopment = !isProduction;
  var servePath = options.servePath || 'assets';

  options.paths = arrayify(options.paths || options.src || [ 'assets' ]);
  options.helperContext = options.helperContext || global;
  options.servePath = servePath.replace(/^\/|\/$/g, '');
  options.localServePath = options.localServePath || parseUrl(servePath).pathname.replace(/^\//, '');
  options.precompile = arrayify(options.precompile || [ '*.*' ]);
  options.build = options.build != null ? options.build : isProduction;
  options.buildDir = options.buildDir != null ? options.buildDir : isDevelopment ? false : 'public/assets';
  options.compile = options.compile != null ? options.compile : true;
  options.compress = options.compress != null ? options.compress : isProduction;
  options.gzip = options.gzip != null ? options.gzip : false;

  if (options.buildDir.replace) {
    options.buildDir = options.buildDir.replace(/^\/|\/$/g, '');
  }

  return options;
};

var arrayify = function (target) {
  return (target instanceof Array) ? target : [ target ];
};

var pasteAttr = function (attributes) {
  return !!attributes ? ' ' + attributes : '';
};

var parseUrl = function (string) {
  var parseQueryString = false;
  var allowUrlWithoutProtocol = true;
  return url.parse(string, parseQueryString, allowUrlWithoutProtocol);
};

var tagWriters = {
  stylesheet: function (url, attr) { return '<link rel="stylesheet" href="' + url + '"' + pasteAttr(attr) + ' />'; },
  script: function (url, attr) { return '<script src="' + url + '"' + pasteAttr(attr) + '></script>'; },
  noop: function (url) { return url; }
};
