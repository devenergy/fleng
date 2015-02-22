'use strict';

// Core modules
var fs = require('fs');
var path = require('path');

// Dependencies
var nconf = require('nconf');
var yaml = require('js-yaml');

// YAML format for nconf
nconf.formats.yaml = {
  stringify: function (obj) {
    return yaml.safeDump(obj);
  },
  parse: function (str) {
    return yaml.safeLoad(str);
  }
};

// Expose configuration
module.exports = function loadConfig(root) {
  var config = new nconf.Provider();
  var env = process.env.NODE_ENV || 'development';
  var configDir;
  var defaultConfigPath;
  var envConfigPath;

  root = root || process.cwd();
  configDir = path.resolve(root, 'config');
  defaultConfigPath = path.resolve(configDir, 'default.yaml');
  envConfigPath = path.resolve(configDir, env + '.yaml');

  Object.defineProperties(config, {
    argv: { enumerable: true, value: nconf.argv },
    env: { enumerable: true, value: nconf.env }
  });

  // Store root
  config.overrides({ root: root });

  // Load config from environment and script arguments
  config.env();
  config.argv();

  // Try to load environment specific configuration
  if (fs.existsSync(envConfigPath)) {
    config.use(env, {
      type: 'file',
      file: envConfigPath,
      format: nconf.formats.yaml
    });
  }

  // Try to load default.yaml
  if (fs.existsSync(defaultConfigPath)) {
    config.use('default', {
      type: 'file',
      file: defaultConfigPath,
      format: nconf.formats.yaml
    });
  }

  // Defaults
  config.defaults(require('./defaults.json'));

  return config;
};
