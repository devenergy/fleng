'use strict';

// Dependencies
var Emitter = require('socket.io-emitter');
var redis = require('socket.io-redis');
var Server = require('socket.io');

/**
 *
 * @param app
 * @returns {*}
 */
module.exports = exports = function (app) {
  var config = app.config.get('emitter');
  var io = new Server();

  io.serveClient(false);
  io.adapter(redis({
    host: config.host,
    port: config.port
  }));

  return io;
};

/**
 *
 * @param app
 */
exports.emitter = function (app) {
  var config = app.config.get('emitter');
  var emitter = new Emitter({
    host: config.host,
    port: config.port
  });

  return emitter;
};
