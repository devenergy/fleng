'use strict';

// Core modules
var fork = require('child_process').fork;

// Dependencies
var kue = require('kue');
var Promise = require('bluebird');
var s = require('string');

// Expose constructor
module.exports = Scheduler;

/**
 * Scheduler for fleng-based applications
 *
 * @param {fleng.Application} app
 * @constructor
 */
function Scheduler(options) {
  var _this = this;
  var worker;

  Object.defineProperty(this, 'options', { value: options });

  this._initQueue();
  this._initWorker();
};

/**
 *
 * @private
 */
Scheduler.prototype._initQueue = function _initQueue() {
  var prefix = s(this.options.prefix || 'fleng').ensureRight(':jobs');

  Object.defineProperty(this, 'queue', {
    enumerable: true,
    value: kue.createQueue({ prefix: prefix })
  });

  return this;
};

/**
 *
 * @private
 */
Scheduler.prototype._initWorker = function _initWorker() {
  var _this = this;

  function forkWorker() {
    var worker = fork(__dirname + '/worker.js', {
      cwd: process.cwd(),
      env: process.env
    });

    worker.once('exit', function (code, signal) {
      console.log(code, signal);
      // If process has ended with error
      if (code !== 0) {
        forkWorker();
      }
    });

    worker.unref();

    return _this.worker = worker;
  }

  return forkWorker();
};

/**
 * Adds a job to the job queue of the scheduler
 *
 * @param {String} task - Name of the job
 * @param {Options} [data] — (optional) Options for job
 */
Scheduler.prototype.scheduleJob = function scheduleJob(name, data, callback) {
  var job = this.queue.create(name, data);
  return Promise.fromNode(job.save.bind(job)).nodeify(callback);
};
