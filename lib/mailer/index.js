'use strict';

// Core modules
var path = require('path');

// Dependencies
var _ = require('lodash');
var mkdirp; // Lazy loaded
var nodemailer = require('nodemailer');
var Promise = require('bluebird');
var templates = require('email-templates');

// Expose constructor
module.exports = Mailer;

/**
 * Mailer constructor
 *
 * @param {Object} options
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
  var templatesDir;
  var templatesPath;

  if (!promise) {
    templatesDir = this.options.templatesDir || path.resolve('email_templates');
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
Mailer.prototype._getTransport = function _getTransport(authData, callback) {
  var pickupTransport;
  var promise;
  var outboxDir;

  if (_.isFunction(authData)) {
    callback = authData;
    authData = {};
  }

  authData || (authData = {});

  if (process.env.NODE_ENV === 'production') {
    promise = Promise.resolve(nodemailer.createTransport({
      service: 'Gmail',
      auth: authData
    }));
  }
  else {
    mkdirp || (mkdirp = require('mkdirp'));
    pickupTransport = require('nodemailer-pickup-transport');
    outboxDir = path.resolve('outbox');

    promise = Promise.fromNode(mkdirp.bind(null, outboxDir)).then(function () {
      return nodemailer.createTransport(pickupTransport({
        directory: outboxDir
      }));
    });
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
  return this._initTemplates()
    .then(function (templates) {
      return Promise.fromNode(templates.bind(templates, template, locals));
    })
    .spread(function (html) {
      return html;
    })
    .nodeify(callback);
};

/**
 * Actually sends email via transport
 *
 * @param {String} template — Template name
 * @param {Object} [locals] - locals for template
 * @param {Function} [callback] — (optional) Callback
 * @returns {Promise}
 */
Mailer.prototype.send = function send(template, mailData, callback) {
  var templateData = {
    subject: mailData.subject,
    content: mailData.content
  };

  var render = this.render(template, templateData);
  var getTransport = this._getTransport(mailData.auth);

  return Promise.join(render, getTransport, function (html, transport) {
    var mail = {
      from: mailData.from,
      to: mailData.to,
      subject: mailData.subject,
      html: html,
      attachments: mailData.files,
      messageId: mailData.messageId,
      encoding: 'base64',
      date: mailData.date
    };

    return Promise.fromNode(transport.sendMail.bind(transport, mail));
  }).nodeify(callback);
};
