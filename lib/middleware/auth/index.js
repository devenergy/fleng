'use strict';

/*!
 * This module is inspired by loopback-component-passport
 *
 */

// Core modules
var fs = require('fs');
var path = require('path');

// Dependencies
var _ = require('lodash');
var fleng; // Lazy loaded
var Passport = require('passport').Passport;
var Promise = require('bluebird');
var s = require('string');

module.exports = exports = function (app, options) {
  fleng || (fleng = require('fleng'));

  var auth = new Auth(app, options);

  auth.init();
  auth.configureProviders();

  return auth.router;
};

exports.Auth = Auth;

/**
 *
 * @param app
 * @returns {Auth}
 * @constructor
 */
function Auth(app, options) {
  if (!(this instanceof Auth)) {
    return new Auth(app, options);
  }

  this.options = options || {};
  this.app = app;
}

/**
 * Initialize auth provider
 *
 */
Auth.prototype.init = function init() {
  var passport = this.passport = new Passport();
  var router = this.router = fleng.Router();

  router._passport = passport;

  if (this.options.initialize !== false) {
    router.use(passport.initialize());
  }

  if (this.options.session !== false) {
    router.use(passport.session());
  }

  passport.serializeUser(function (user, done) {
    done(null, user._id);
  });

  passport.deserializeUser(function (id, done) {
    fleng.models.User.findById(id, done);
  });
};

/**
 *
 */
Auth.prototype.configureProviders = function configureProviders() {
  var providers = this.app.config.get('auth.providers');
  _.each(providers, this.configureProvider.bind(this));
};

/**
 *
 * @param name
 * @param options
 */
Auth.prototype.configureProvider = function configureProvider(options, name) {
  fleng || (fleng = require('fleng'));

  // TODO: Add authSchema detection
  var authSchema = 'oAuth 2.0';
  var authType = authSchema.toLowerCase();

  var config = this.app.config;
  var root = config.get('root');
  var strategiesPath = path.resolve(root, 'auth');
  var strategyName = s(name).underscore().s;
  var strategyPath = path.resolve(strategiesPath, strategyName + '.js');

  var Strategy = require(options.module)[options.strategy || 'Strategy'];

  // TODO: This will differ for different authTypes (oauth, openid etc.)
  var strategyOptions = _.pick(options, [
    'clientID',
    'clientSecret',
    'callbackURL'
  ]);

  // TODO: This differs for different authTypes
  var strategyCallback;

  // Always pass original request to the callback
  strategyOptions.passReqToCallback = true;

  // Try to load custom callback for strategy
  if (fs.existsSync(strategyPath)) {
    strategyCallback = require(strategyPath)(this.passport, this.router);
  }

  switch (authType) {
    default:
      this.passport.use(name, new Strategy(strategyOptions,
        function (req, accessToken, refreshToken, params, profile, done) {
          var resolveUser;
          var dbquery;

          if (req.user) {
            resolveUser = Promise.resolve(req.user);
          }
          else {
            dbquery = fleng.models.User.findOne({
              _identities: {
                $elemMatch: { 'provider': name, '_profile.id': profile.id }
              }
            });

            resolveUser = Promise.resolve(dbquery.exec()).then(function (user) {
              return user || new fleng.models.User();
            });
          }

          resolveUser
            .then(function (user) {
              if ('function' === typeof strategyCallback) {
                return Promise.fromNode(strategyCallback.bind(null,
                  user, accessToken, refreshToken, params, profile
                )).return(user);
              }

              return user;
            })
            .then(function (user) {
              done(null, user);
            })
            .catch(done);
        })
      );
  }
};
