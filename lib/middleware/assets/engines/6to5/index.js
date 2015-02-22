'use strict';

// Core modules
var util = require('util');

// Dependencies
var mincer = require('mincer');
var to5 = require('6to5');

// Expose engine constructor
module.exports = SixToFiveEngine;

/**
 * ES6 to ES5 module transpiler using 6to5
 *
 * @constructor
 */
function SixToFiveEngine() {
  SixToFiveEngine.super_.apply(this, arguments);
}

util.inherits(SixToFiveEngine, mincer.Template);

Object.defineProperty(SixToFiveEngine, 'defaultMimeType', {
  value: 'application/javascript'
});

SixToFiveEngine.prototype.evaluate = function evaluate() {
  var result = to5.transform(this.data, {
    modules: 'amdStrict'
  });
  return result.code;
};
