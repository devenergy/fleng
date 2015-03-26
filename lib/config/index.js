'use strict';

// Core modules
var fs = require('fs');
var path = require('path');

// Dependencies
var fconf = require('fleng-config');

module.exports = function loadConfig(root) {
  var config = new fconf.Provider();
  var env = process.env.NODE_ENV || 'development';
  var configDir;
  var defaultConfigPath;
  var envConfigPath;

  root = root || process.cwd();
  configDir = path.resolve(root, 'config');
  defaultConfigPath = path.resolve(configDir, 'default.yaml');
  envConfigPath = path.resolve(configDir, env + '.yaml');

  config.set('root', root);
  config.defaults('defaults', require('./defaults.json'));
  config.add('default', defaultConfigPath);
  config.add('environment', envConfigPath);

  return config;
};
