'use strict';

// Dependencies
var express = require('express');
var fleng; // Lazy loaded to avoid circular dependency during startup

// Define application prototype
var app = module.exports = {};

app.use = function use() {
  return express.application.use.apply(this, arguments);
};

app.log = function log() {
  this.logger.log.apply(this.logger, arguments);
};

app.scheduleJob = function scheduleJob() {
  if (!fleng) {
    fleng = require('./fleng');
  }

  fleng.scheduleJob.apply(fleng, arguments);
};

app.sendMail = function sendMail() {
  if (!fleng) {
    fleng = require('./fleng');
  }

  fleng.sendMail.apply(fleng, arguments);
};
