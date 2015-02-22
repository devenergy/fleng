'use strict';

// Core modules
var util = require('util');

// Module dependencies
var mongoose = require('mongoose');
var shortid = require('shortid');
var timestamps = require('./plugins/timestamps');

// Expose constructor
module.exports = Schema;

/**
 *
 * @type {Function}
 */
function Schema(obj, options) {
  obj = obj || {};
  options = options || {};

  if (!obj.id && (options.id !== false)) {
    obj.id = {
      type: String,
      unique: true,
      sparse: true,
      'default': shortid.generate
    };
  }

  Schema.super_.call(this, obj, options);

  // Set options for toJSON method
  this.set('toJSON', {
    virtuals: true,
    minimize: true,

    transform: function (doc, ret) {
      Object.keys(ret).forEach(function (key) {
        if (key.charAt(0) === '_') {
          delete ret[ key ];
        }
      });
    }
  });

  if (options.timestamps !== false) {
    this.plugin(timestamps, options.timestamps);
  }

  return this;
}

util.inherits(Schema, mongoose.Schema);
