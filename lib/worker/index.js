'use strict';

// Core modules
var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var path = require('path');
var util = require('util');

// Dependencies
var fleng = require('fleng');
var kue = require('kue');
var Promise = require('bluebird');
var s = require('string');

module.exports = exports = function createWorker(root) {
  return new Worker(root);
};

exports.Worker = Worker;

function Worker(root) {
  var config = fleng.config.get('scheduler');
  var prefix = s(config.prefix || 'fleng').ensureRight(':jobs').s;
  var directory = path.resolve(root, config.jobsDirectory);
  var queue = kue.createQueue({ prefix: prefix });

  EventEmitter.call(this);

  Object.defineProperties(this, {
    root: { value: root },
    config: { value: config },
    prefix: { value: prefix },
    directory: { value: directory },
    queue: { value: queue }
  });

  process.once( 'SIGTERM', function ( sig ) {
    queue.shutdown( 5000, function(err) {
      console.log( 'Worker is shut down. ', err || '' );
      process.exit(0);
    });
  });

  this._registerJobHandlers();
}

util.inherits(Worker, EventEmitter);

Worker.prototype._registerJobHandlers = function _registerJobHandlers() {
  var _this = this;
  var directory = this.directory;

  Promise.fromNode(fs.readdir.bind(fs, directory))
    .map(function (file) {
      try {
        var handlerPath = path.resolve(directory, file);
        var handler = require(handlerPath);
      }
      catch (ex) {
        return Promise.reject(ex);
      }

      var jobName = handler.jobName || s(file).dasherize().s;
      var jobConcurency = handler.jobConcurency || _this.config.defaultConcurency || 1;

      _this.queue.process(jobName, jobConcurency, handler);
    })
    .catch(function (err) {
      _this.emit('error', err);
    })
    .done();
};

/*
// Init queue
var queue = kue.createQueue({
  prefix: prefix
});

// Jobs directory
var jobsDir = path.resolve(fleng.config.get('root'), config.jobsDirectory);

// Register job handlers from the 'jobs' directory
Promise.fromNode(fs.readdir.bind(fs, jobsDir))
  .then(function (files) {
    files.forEach(function (file) {
      try {
        var handlerPath = path.resolve(jobsDir, file);
        var handler = require(handlerPath);
      }
      catch (ex) {
        return Promise.reject(ex);
      }

      var jobName = handler.jobName || s(file).dasherize().s;
      var jobConcurency = handler.jobConcurency || config.defaultConcurency || 1;

      queue.process(jobName, jobConcurency, handler);
    });
  })
  .catch(function (err) {
    console.error(err);
    console.trace(err);
    process.exit(1);
  })
  .done();

process.once('SIGTERM', function (sig) {
  queue.shutdown(function (err) {
    console.log('Jobs queue is shut down.', err || '');
    process.exit(0);
  }, 5000 );
});
*/
