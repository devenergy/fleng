'use strict';

// Dependencies
var _ = require('lodash');
var Promise = require('bluebird');
var DB = require('./db');

// Expose constructor
module.exports = Controller;

/**
 *
 * @constructor
 */
function Controller() {
  this.super_ = this.constructor.super_.prototype;
};

/**
 *
 * @returns {*}
 */
Controller.prototype.find = function find(query, options, inject) {
  var dbquery = this.model.find();
  var promise = Promise.resolve();

  if (_.isFunction(query)) {
    inject = query;
    query = {};
    options = {}
  }
  else if (_.isFunction(options)) {
    inject = options;
    options = {};
  }

  query = query || {};
  options = options || {};

  dbquery.where(query);

  if ('function' === typeof inject) {
    promise = promise.then(inject(dbquery));
  }

  return promise.then(function () {
    return Promise.fromNode(dbquery.exec.bind(dbquery));
  });
};

/**
 *
 * @returns {*}
 */
Controller.prototype.findOne = function findOne(query, options, inject) {
  var dbquery = this.model.find();
  var promise = Promise.resolve();

  if (_.isFunction(query)) {
    inject = query;
    query = {};
    options = {}
  }
  else if (_.isFunction(options)) {
    inject = options;
    options = {};
  }

  query = query || {};
  options = options || {};

  dbquery.where(query);

  if ('function' === typeof inject) {
    promise = Promise.resolve(inject(dbquery));
  }

  return promise.then(function () {
    dbquery.findOne();

    return Promise.fromNode(dbquery.exec.bind(dbquery)).then(function (group) {
      if (group) {
        return Promise.resolve(group);
      }

      return Promise.reject(new Error('Could not find document'));
    });
  });
};
