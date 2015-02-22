'use strict';

// Core modules
var path = require('path');

// Dependencies
var express = require('express');
var serveStatic = require('serve-static');

// Define middleware
module.exports = function (staticPath) {
  return serveStatic(staticPath);
};
