'use strict';

// Module dependencies
var _ = require('lodash');

// Plugin definition
module.exports = function(schema, options) {
  schema.add({ _meta: { type: {}, default: function () { return {} } } });

  schema.method('meta', function (key, value) {
    if (arguments.length > 1) {
      if (value === null) {
        delete this._meta[key];
      }
      else {
        this._meta[key] = value;
      }

      this.markModified('_meta');
    }

    return this._meta[key];
  });
};
