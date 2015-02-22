'use strict';

// Module dependencies
var _ = require('lodash');

// Default options
var defaults = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

// Plugin definition
module.exports = function timestamps(schema, options) {
  var createdAt;
  var updatedAt;
  var hasCreatedAt;
  var hasUpdatedAt;

  options = _.defaults(options || {}, defaults);

  createdAt = options.createdAt;
  updatedAt = options.updatedAt;
  hasCreatedAt = createdAt !== false && _.isString(createdAt) && createdAt.length;
  hasUpdatedAt = updatedAt !== false && _.isString(updatedAt) && updatedAt.length;

  schema.add({
    _timestamps: {
      type: {},
      'default': function () { return {} }
    }
  });

  /**
   * Timestamps getter/setter
   *
   * @param {String} key
   * @param {Date} [value]
   * @returns {Date}
   */
  schema.method('timestamp', function (key, value) {
    if (arguments.length > 1 && (value instanceof Date)) {
      this._timestamps[ key ] = value;
      this.markModified('_timestamps');
    }

    return this._timestamps[ key ];
  });

  if (hasCreatedAt) {
    schema.virtual(createdAt)
      .get(function () {
        return this.timestamp(createdAt);
      })
      .set(function (value) {
        return this.timestamp(createdAt, value);
      })
    ;

    schema.pre('save', function (next) {
      if (this.isNew && !this[ createdAt ]) {
        this[ createdAt ] = new Date();
      }

      next();
    });
  }

  if (hasUpdatedAt) {
    schema.virtual(updatedAt)
      .get(function () {
        return this.timestamp(updatedAt);
      })
      .set(function (value) {
        return this.timestamp(updatedAt, value);
      })
    ;

    schema.pre('save', function (next) {
      if (this.isNew) {
        if (hasCreatedAt && this[ createdAt ]) {
          this[ updatedAt ] = this[ createdAt ];
        }
      }
      else {
        this[ updatedAt ] = new Date();
      }

      next();
    });
  }
};
