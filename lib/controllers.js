'use strict';

// Core modules
var fs = require('fs');
var path = require('path');
var util = require('util');

// Dependencies
var _ = require('lodash');
var s = require('string');
var Controller = require('./controller');

// Expose function
module.exports = loadControllers;

/**
 * Loads controllers
 *
 */
function loadControllers(fleng) {
  var controllersDir = path.resolve(fleng.config.get('root'), 'controllers');
  var controllers = {};

  _.each(fs.readdirSync(controllersDir), function (moduleName) {
    var modulePath = path.resolve(controllersDir, moduleName);
    var spec = require(modulePath);
    var Class;

    spec.name = spec.name || s(moduleName).chompRight('.js').capitalize().camelize().s;

    if (spec.model) {
      Class = function ModelController() {
        this.modelName = spec.model;
        this.model = fleng.models[this.modelName];

        Class.super_.apply(this, arguments);
      };

      util.inherits(Class, Controller);
    }
    else {
      Class = function Controller() {};
    }

    _.extend(Class.prototype, _.omit(spec, 'model'));

    controllers[spec.name] = new Class();
  });

  return controllers;
}
