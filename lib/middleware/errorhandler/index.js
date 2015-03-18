'use strict';

var Ouch = require('ouch');

module.exports = function () {
  var ouch = new Ouch();
  var handler = new Ouch.handlers.PrettyPageHandler('orange', 'There was an error.');

  ouch.pushHandler(handler);

  return ouch.handleException.bind(ouch);
};
