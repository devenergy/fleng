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

// Expose application factory
var fleng = module.exports = createApplication;

// Load global config
Object.defineProperty(fleng, 'config', {
  configurable: false,
  enumerable: true,
  get: function () {
    var config = this.__config__;

    if (!config) {
      config = loadConfig();

      Object.defineProperty(this, '__config__', {
        configurable: false,
        writable: false,
        enumerable: false,
        value: config
      });
    }

    return config;
  }
});

// Instantiate global db interface
Object.defineProperty(fleng, 'db', {
  configurable: false,
  enumerable: true,
  get: function () {
    var config = this.config;
    var db = this.__db__;

    if (!db) {
      db = new DB(config.get('root'), config.get('database'));

      Object.defineProperty(this, '__db__', {
        configurable: false,
        writable: false,
        enumerable: false,
        value: db
      });
    }

    return db;
  }
});

// Shorthand for db.models
Object.defineProperty(fleng, 'models', {
  configurable: false,
  enumerable: true,
  get: function () {
    var models = this.__models__;

    if (!models) {
      models = require('./models')(this);

      Object.defineProperty(this, '__models__', {
        configurable: false,
        writable: false,
        enumerable: false,
        value: models
      });
    }

    return models;
  }
});

// Shorthand for db.controllers
Object.defineProperty(fleng, 'controllers', {
  configurable: false,
  enumerable: true,
  get: function () {
    var controllers = this.__controllers__;

    if (!controllers) {
      controllers = require('./controllers')(this);

      Object.defineProperty(this, '__controllers__', {
        configurable: false,
        writable: false,
        enumerable: false,
        value: controllers
      });
    }

    return controllers;
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
    Object.defineProperty(app, name, { configurable: false, value: value });
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
      get: getter
    });
  }

  var app = express();
  var config;

  mergeDescriptors(app, proto);

  // If this is the root application
  // then use global config as ours
  if (root === fleng.config.get('root')) {
    config = fleng.config;
  }
  // Otherwise load own config
  // and add global config as an additional store
  else {
    config = loadConfig(root);
    config.add('global', { type: 'literal', store: fleng.config.get() });
  }

  prop('config', config);

  app.once('mount', function (parent) {
    // Add parent reference as a property to the app
    prop('parent', parent);

    // When mounted then add parent fleng application's config as
    // an additional store
    if (parent.config && 'function' === typeof parent.config.get) {
      config.add('parent', { type: 'literal', store: parent.config.get() });
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

  /*if (config.get('socket.io:enabled') !== false) {
    inheritProperty('io', function () {
      return require('socket.io')(this.server, this.config.get('socket.io'));
    });
  }*/

  if (app.get('env') !== 'production' && config.get('middleware:morgan:enabled') !== false) {
    app.use(require('morgan')('dev'));
  }

  if (config.get('middleware:favicon:enabled') !== false) {
    app.use(fleng.favicon(app));
  }

  if (config.get('middleware:assets:enabled') !== false) {
    app.use(fleng.assets(config.get('root'), config.get('middleware:assets')));
  }

  if (config.get('middleware:static:enabled') !== false) {
    (app.config.get('middleware:static:paths') || []).forEach(function (staticPath) {
      staticPath = path.resolve(config.get('root'), staticPath);
      app.use(fleng.static(staticPath));
    });
  }

  app.use(fleng.session(app));
  app.use(fleng.auth(app));

  app.start = function start() {
    app.use(fleng.notFound(app));

    if ('production' !== app.get('env')) {
      app.use(fleng.errorhandler(app));
    }

    // Notify about successful start
    app.server.once('listening', function () {
      app.emit('started');
      app.log('info', 'FLEng started');
      app.log(
        'info',
        'Web server listening at http://%s:%s',
        config.get('http:hostname'),
        config.get('http:port')
      );
    });

    // Start the application
    app.server.listen(config.get('http:port'), config.get('http:hostname'));

    // TODO: Move scheduler to the separate module
    /*if (config.get('scheduler:enabled') !== false) {
      fork(path.resolve(__dirname, 'scheduler.js'));
    }*/
  };

  return app;
}

fleng.DB = DB;
fleng.Router = express.Router;
fleng.Controller = require('./controller');

// Middleware
fleng.auth = require('./middleware/auth');
fleng.assets = require('./middleware/assets');
fleng.session = require('./middleware/session');
fleng.static = require('./middleware/static');
fleng.favicon = require('./middleware/favicon');
fleng.notFound = require('./middleware/notfound');
fleng.errorhandler = require('./middleware/errorhandler');
