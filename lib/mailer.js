'use strict';

// Core modules
var path = require('path');

// Dependencies
var mkdirp; // Lazy loaded
var nodemailer = require('nodemailer');
var Promise = require('bluebird');
var templates = require('email-templates');

// Expose constructor
module.exports = Mailer;

/**
 * Mailer constructor
 *
 * @param {Object} app
 * @constructor
 */
function Mailer(options) {
  Object.defineProperty(this, 'options', { value: options });
}

/**
 *
 * @returns {Promise}
 * @private
 */
Mailer.prototype._initTemplates = function _initTemplates() {
  var promise = this._templatesPromise;
  var root;
  var templatesDir;
  var templatesPath;

  if (!promise) {
    root = this.app.config.get('root');
    templatesDir = this.app.config.get('mailer.templates') || 'email_templates';
    templatesPath = path.resolve(root, templatesDir);
    promise = Promise.fromNode(templates.bind(null, templatesPath));

    Object.defineProperty(this, '_templatesPromise', { value: promise });
  }

  return promise;
};

/**
 * Creates an email transport
 *
 * @param {Function} [callback]
 * @returns {Promise}
 * @private
 */
Mailer.prototype._getTransport = function _getTransport(callback) {
  var pickupTransport;
  var promise;
  var outboxDir;

  if (this.app.get('env') === 'development') {
    mkdirp = require('mkdirp');
    pickupTransport = require('nodemailer-pickup-transport');
    outboxDir = path.resolve(process.cwd(), 'outbox');

    promise = Promise.fromNode(mkdirp.bind(null, outboxDir)).then(function () {
      return nodemailer.createTransport(pickupTransport({
        directory: outboxDir
      }));
    });
  }
  else {
    promise = Promise.reject(new Error('Real transport support is not yet ready'));
  }

  return promise.nodeify(callback);
};

/**
 * Renders a template and returns ready html
 *
 * @param {String} template
 * @returns {Promise}
 */
Mailer.prototype.render = function render(template, locals, callback) {
  return this._initTemplates().spread(function (html) {
    return html;
  }).nodeify(callback);
};

/**
 * Actually sends email via transport
 *
 * @param {String} template — Template name
 * @param {Object} [locals] - locals for template
 * @param {Function} [callback] — (optional) Callback
 * @returns {Promise}
 */
Mailer.prototype.send = function send(template, locals, callback) {
  var _this = this;
  var render = this.render(template, locals);
  var getTransport = this._getTransport();

  return Promise.all([ render, getTransport ]).spread(function (html, transport) {
    var mail = {
      html: html
    };

    return Promise.fromNode(transport.sendMail.bind(transport, mail));
  }).nodeify(callback);
};
