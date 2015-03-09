'use strict';

// Core modules
var fs = require('fs');
var path = require('path');

// Dependencies
var fleng = require('fleng');
var kue = require('kue');
var Promise = require('bluebird');
var s = require('string');

// Scheduler config
var config = fleng.config.get('scheduler');
var prefix = s(config.prefix || 'fleng').ensureRight(':jobs');

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
