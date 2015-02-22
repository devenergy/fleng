'use strict';

// Dependencies
var express = require('express');

// Define application prototype
var app = module.exports = {};

app.use = function use() {
  return express.application.use.apply(this, arguments);
};

app.log = function log() {
  this.logger.log.apply(this.logger, arguments);
};
