'use strict';

// Core modules
var fork = require('child_process').fork;
var http = require('http');
var path = require('path');

// Dependencies
var express = require('express');
var mergeDescriptors = require('merge-descriptors');
var winston = require('winston');
var proto = require('./application');
var loadConfig = require('./config/index');
var DB = require('./db');
var Scheduler = require('./scheduler');
var Mailer = require('./mailer');

// Expose application factory
var fleng = module.exports = createApplication;

Object.defineProperties(fleng, {
  config: {
    enumerable: true,
    get: function () {
      var config = this.__config__;

      if (!config) {
        config = loadConfig();
        Object.defineProperty(this, '__config__', { value: config });
      }

      return config;
    }
  },
  logger: {
    enumerable: true,
    value: new winston.Logger({
      transports: [ new winston.transports.Console({ colorize: 'all' }) ]
    })
  },
  db: {
    enumerable: true,
    get: function () {
      var config = this.config;
      var db = this.__db__;

      DB.mongoose.set('debug', config.get('database.debug'));

      if (!db) {
        db = new DB(config.get('root'), config.get('database'));
        Object.defineProperty(this, '__db__', { value: db });
      }

      return db;
    }
  },
  models: {
    enumerable: true,
    get: function () {
      var models = this.__models__;

      if (!models) {
        models = require('./models')(this);
        Object.defineProperty(this, '__models__', { value: models });
      }

      return models;
    }
  },
  controllers: {
    enumerable: true,
    get: function () {
      var controllers = this.__controllers__;

      if (!controllers) {
        controllers = require('./controllers')(this);
        Object.defineProperty(this, '__controllers__', { value: controllers });
      }

      return controllers;
    }
  },
  scheduler: {
    enumerable: true,
    get: function () {
      var scheduler = this.__scheduler__;

      if (!scheduler) {
        scheduler = new Scheduler(this.config.get('scheduler'));
        Object.defineProperty(this, '__scheduler__', { value: scheduler });
      }

      return scheduler;
    }
  },
  mailer: {
    enumerable: true,
    get: function () {
      var mailer = this.__mailer__;

      if (!mailer) {
        mailer = new Mailer(this.config.get('mailer'));

        Object.defineProperty(this, '__mailer__', { value: mailer });
      }

      return mailer;
    }
  },

  scheduleJob: {
    enumerable: true,
    value: function scheduleJob() {
      return this.scheduler.scheduleJob.apply(this.scheduler, arguments);
    }
  },
  sendMail: {
    enumerable: true,
    value: function () {
      return this.mailer.sendMail.apply(this.mailer, arguments);
    }
  }
});

/**
 * FLEng application factory
 *
 */
function createApplication(root) {
  /**
   * Adds unconfigurable property to the app
   *
   * @param {String} name
   * @param {*} value
   */
  function prop(name, value) {
    Object.defineProperty(app, name, {
      configurable: false,
      writable: false,
      enumerable: true,
      value: value
    });
  }

  /**
   * Adds a property that tries to resolve its value from the parent
   * (if any), otherwise will invoke the provided getter and cache its result
   *
   * @param {String} name
   * @param {Function} fn
   */
  function inheritProperty(name, fn) {
    function getter() {
      var privatePropertyName = '__' + name + '__';
      var privateProperty = this[privatePropertyName];

      if (!privateProperty) {
        if (this.parent && this.parent[name]) {
          privateProperty = this.parent[name];
        }
        else {
          privateProperty = fn.call(this);
        }

        Object.defineProperty(this, privatePropertyName, {
          writable: false,
          configurable: false,
          enumerable: false,
          value: privateProperty
        })
      }

      return privateProperty;
    }

    Object.defineProperty(app, name, {
      configurable: false,
      enumerable: true,
      get: getter
    });
  }

  var app = express();
  var config;

  mergeDescriptors(app, proto);

  config = loadConfig(root);
  config.defaults('global', fleng.config.get());

  prop('config', config);

  app.once('mount', function (parent) {
    var views = app.get('views');
    var parentViews = parent.get('views');

    if (!Array.isArray(parentViews)) {
      parentViews = [parentViews];
    }

    // Add parent app's views locations
    app.set('views', [views].concat(parentViews));

    // Add parent reference as a property to the app
    prop('parent', parent);

    // When mounted then add parent fleng application's config as
    // an additional store
    if (parent.config && 'function' === typeof parent.config.get) {
      config.defaults('parent', parent.config.get());
    }
  });

  app.set('views', path.resolve(config.get('root'), 'views'));
  app.set('view engine', 'jade');

  // We are okay with one logger across the tree of flengs
  inheritProperty('logger', function () {
    return new winston.Logger({
      transports: [ new winston.transports.Console({ colorize: 'all' }) ]
    });
  });

  // We are also good with one http.Server
  inheritProperty('server', function () { return http.Server(this) });

  // Development mode logging middleware
  if (app.get('env') !== 'production' && config.get('middleware.morgan.disabled') !== true) {
    app.use(fleng.morgan(app));
  }

  // Static files serving middleware
  if (config.get('middleware.static.disabled') !== true) {
    app.use(fleng.static(app));
  }

  // Favicon serving middleware
  if (config.get('middleware.favicon.disabled') !== true) {
    app.use(fleng.favicon(app));
  }

  /**
   * Starts the application by starting the underlying http.Server instance
   *
   */
  app.start = function start() {
    // 404 handling middleware
    app.use(fleng.notFound(app));

    if (app.get('env') !== 'production') {
      // Development mode error handler
      // Displays stack trace in case of errors
      app.use(fleng.errorhandler(app));
    }

    // Notify about successful start
    app.server.once('listening', function () {
      app.emit('started');
      app.log('info', 'FLEng started');
      app.log(
        'info',
        'Web server listening at http://%s:%s',
        config.get('http.hostname'),
        config.get('http.port')
      );
    });

    // Start the application
    app.server.listen(config.get('http.port'), config.get('http.hostname'));
  };

  return app;
}

fleng.DB = DB;
fleng.Router = express.Router;
fleng.Controller = require('./controller');

// Middleware
fleng.assets = require('./middleware/assets');
fleng.auth = require('./middleware/auth');
fleng.errorhandler = require('./middleware/errorhandler');
fleng.favicon = require('./middleware/favicon');
fleng.morgan = require('./middleware/morgan');
fleng.notFound = require('./middleware/notfound');
fleng.session = require('./middleware/session');
fleng.static = require('./middleware/static');
