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

props({
  config: function () {
    return loadConfig();
  },

  logger: new winston.Logger({
    transports: [ new winston.transports.Console({ colorize: 'all' }) ]
  }),

  db: function () {
    var config = fleng.config.get.bind(fleng.config);
    DB.mongoose.set('debug', config('database.debug'));
    return new DB(config('root'), config('database'));
  },

  models: function () {
    return require('./models')(fleng)
  },

  controllers: function () {
    return require('./controllers')(fleng)
  },

  scheduler: function () {
    return new Scheduler(fleng.config.get('scheduler'));
  },

  mailer: function () {
    return new Mailer(fleng.config.get('mailer'));
  },

  scheduleJob: function scheduleJob() {
    return this.scheduler.scheduleJob.apply(this.scheduler, arguments);
  },

  sendMail: function () {
    return this.mailer.sendMail.apply(this.mailer, arguments);
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
fleng.socket = require('./socket');
fleng.static = require('./middleware/static');

function prop(propertyName, getter) {
  var privatePropertyName;
  var descriptor = {
    enumerable: true
  };

  if ('function' === typeof getter) {
    privatePropertyName = '__' + propertyName + '__';
    descriptor.get = function () {
      var property = fleng[ privatePropertyName ];

      if (!property) {
        property = getter.call(fleng);
        Object.defineProperty(fleng, privatePropertyName, { value: property });
      }

      return property;
    };
  }
  else {
    descriptor.value = getter;
  }

  Object.defineProperty(fleng, propertyName, descriptor);
}

function props(obj) {
  Object.keys(obj).forEach(function (key) {
    prop(key, obj[key]);
  });
}
