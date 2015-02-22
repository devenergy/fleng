'use strict';

// Dependencies
var ConnectAssets = require('connect-assets/lib/assets');
var mincer = require('mincer');

// Override connect-assets constructor in order to support root path
var Assets = module.exports = function Assets(root, options) {
  if ('object' === typeof root) {
    options = root;
    root = void 0;
  }

  this.options = options;

  if (this.options.compile) {
    this.environment = new mincer.Environment(root);

    this.environment.ContextClass.defineAssetPath(this.helper(function (url) {
      return url;
    }));

    if (this.options.compress) {
      this.environment.cssCompressor = "csswring";
      this.environment.jsCompressor = "uglify";
    }

    this.options.paths.forEach(this.environment.appendPath, this.environment);

    if (this.options.buildDir) {
      this.manifest = new mincer.Manifest(this.environment, this.options.buildDir);
    }
  }
  else {
    this.manifest = new mincer.Manifest(null, this.options.buildDir);
  }
};

Assets.prototype = Object.create(ConnectAssets.prototype, {
  constructor: {
    writable: true,
    configurable: true,
    enumerable: false,
    value: Assets
  }
});
