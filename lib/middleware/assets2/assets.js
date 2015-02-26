'use strict';

// Dependencies
var express = require('express');
var mincer = require('mincer');

// Expose constructor
module.exports = Assets;

/**
 *
 * @param {String} root
 * @param {Object} options
 * @returns {Router}
 * @constructor
 */
function Assets(root, options) {
  this.root = root;
  this.options = this.defaults(options);
  this.environment = new mincer.Environment(root);
  this.router = express.Router();

  if (options.minify) {
    this.environment.cssCompressor = 'csswring';
    this.environment.jsCompressor = 'uglify';
  }

  options.paths.forEach(function (path) {
    this.environment.appendPath(path);
  });

  this.router.use('/assets', mincer.createServer(this.environment));
}

/**
 * Apply default options
 *
 * @param {Object} [options]
 * @returns {Object}
 */
Assets.prototype.defaults = function defaults(options) {
  var isProduction = process.env.NODE_ENV === 'production';

  options = options || {};

  options.paths = options.paths != null ? options.paths : [ 'assets' ];
  options.compress = options.compress != null ? options.compress : isProduction;

  return options;
};

/**
 * @param {Function} tagWriter
 * @param {String} [ext]
 */
Assets.prototype.helper = function helper(tagWriter, ext) {
  var _this = this;

  return function (path, options) {
    var asset;
    var assets;
    var tags;

    path = path.replace(new RegExp('(?:\\.' + ext + ')?$', 'i'), '.' + ext);

    asset = _this.environment.findAsset(path);

    if (!asset) {
      throw new Error('Asset `' + path + '` not found');
    }

    if (asset.type === 'bundled') {
      assets = asset.toArray();
      tags = assets.map(tagWriter);
    }
    else {
      return tagWriter(path);
    }
  };
};
