'use strict';

// Dependencies
var compiler = require('./ember-template-compiler');
var mincer = require('mincer');
var s = require('string');
var util = require('util');

module.exports = HBSEngine;

function HBSEngine() {
  HBSEngine.super_.apply(this, arguments);
}

util.inherits(HBSEngine, mincer.Template);

Object.defineProperty(HBSEngine, 'defaultMimeType', {
  value: 'application/javascript'
});

HBSEngine.prototype.evaluate = function evaluate(context/*, locals*/) {
  var input = compiler.precompile(this.data, false);
  var template = 'Ember.Handlebars.template(' + input + ')';
  var templatePath = context.logicalPath;

  templatePath = templatePath.split('templates/').reverse()[0];

  if (!/^components/.test(templatePath)) {
    templatePath = s(templatePath).underscore().s;
  }

  return 'Ember.TEMPLATES["' + templatePath + '"] = ' + template + ';';
};
