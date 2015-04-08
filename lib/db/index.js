'use strict';

// Core modules
var fs = require('fs');
var path = require('path');
var url = require('url');
var util = require('util');

// Dependencies
var _ = require('lodash');
var mongoose = require('mongoose');
var Promise = require('bluebird');
var s = require('string');

// Enable DB logging on dev
mongoose.set('debug', process.env.NODE_ENV !== 'production');

// Expose DB constructor
module.exports = DB;

/**
 *
 * @param config
 * @returns {DB}
 * @constructor
 */
function DB(root, config) {
  this.root = root;
  this.config = config;

  this.models = {};
  this.controllers = {};

  this.init();

  return this;
}

/**
 *
 */
DB.prototype.init = function init() {
  var uri = url.format({
    protocol: 'mongodb:',
    slashes: true,
    hostname: this.config.hostname,
    port: this.config.port,
    pathname: this.config.name
  });

  // Init DB connection
  var connection = mongoose.createConnection();
  var connectionPromise = new Promise(function (resolve, reject) {
    var options = {
      db: { native_parser: true },
      server: { keepAlive: true, poolSize: 5 }
    };

    connection.open(uri, options, function (err) {
      if (err) reject(err);
      else resolve(connection);
    });
  });

  this.connection = connection;

  this.then = this.ready = connectionPromise.then.bind(connectionPromise);
  this.catch = this.fail = connectionPromise.catch.bind(connectionPromise);
};

/**
 *
 * @param name
 * @param obj
 * @param options
 * @returns {*}
 */
DB.prototype.model = function registerModel(name, schema) {
  this.connection.model(name, schema);
  return this.models[name] = this.connection.model(name);
};

// Exports
DB.util = require('./util');
DB.BaseSchema = require('./schema');
DB.plugins = require('./plugins');
DB.mongoose = mongoose;
DB.SchemaTypes = mongoose.SchemaTypes;

DB.ObjectNotFoundError = function () {};
DB.ObjectNotFoundError.prototype = Object.create(Error.prototype);
