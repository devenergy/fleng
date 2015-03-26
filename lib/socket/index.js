'use strict';

// Dependencies
var SocketIO = require('socket.io');

module.exports = function (app) {
  return new Io(app);
};

function Io(app, options) {
  var socket = new SocketIO(app.server, app.config.get('socketio') || {});

  Object.defineProperty(this, 'socket', {
    enumerable: true,
    value: socket
  });
};

Io.prototype.configure = function configure(fn) {
  fn(this.socket);
};

Io.prototype.on = function on() {
  this.socket.on.apply(this.socket, arguments);
};
