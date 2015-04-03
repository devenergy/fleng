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
 * Adds a job to the job queue of the scheduler
 *
 * @param {String} task - Name of the job
 * @param {Options} [data] — (optional) Options for job
 */
Scheduler.prototype.scheduleJob = function scheduleJob(name, data, callback) {
  var job = this.queue.create(name, data);
  return Promise.fromNode(job.save.bind(job)).nodeify(callback);
};

/**
 * Register in-process job handler
 *
 * @param {String} jobName
 * @param {Number} [concurency]
 * @param {Function} handler
 * @returns {*}
 */
Scheduler.prototype.registerJobHandler = function registerJobHandler(jobName, concurency, handler) {
  return this.queue.process.apply(this.queue, arguments);
};
