'use strict';

// Dependencies
var _ = require('lodash');
var fleng = require('../../../');
var Passport = require('passport').Passport;
var Promise = require('bluebird');

// Define middleware
module.exports = function (app) {
  return new Auth(app);
};

function Auth(app) {
  if (!(this instanceof Auth)) {
    return new Auth(app);
  }

  var router = this.router = fleng.Router();

  this.config = app.config.get('auth') || {};
  this.init();

  return router;
}

Auth.prototype.init = function init() {
  var passport = this.router.passport = new Passport();

  passport.serializeUser(function (user, done) {
    done(null, user._id);
  });

  passport.deserializeUser(function (id, done) {
    fleng.models.User.findById(id, done);
  });

  this.passport = passport;
  this.router.use(passport.initialize());
  this.router.use(passport.session());

  _.each(this.config.providers || [], this.configureProvider.bind(this));
};

Auth.prototype.configureProvider = function configureProvider(options, name) {
  var _this = this;
  var passport = this.passport;
  var router = this.router;

  options = options || {};

  var authSchema = options.authScheme;
  if (!authSchema) {
    // Guess the authentication scheme
    if (options.consumerKey) {
      authSchema = 'oAuth1';
    } else if (options.realm) {
      authSchema = 'OpenID';
    } else if (options.clientID) {
      authSchema = 'oAuth 2.0';
    } else if (options.usernameField) {
      authSchema = 'local';
    } else {
      authSchema = 'local';
    }
  }

  var AuthStrategy = require(options.module)[options.strategy || 'Strategy'];
  var clientID = options.clientID;
  var clientSecret = options.clientSecret;
  var callbackURL = options.callbackURL;
  var authPath = options.authPath !== false ? options.authPath || '/auth/' + name : void 0;
  var callbackPath = options.callbackPath !== false ? options.callbackPath || '/auth/' + name + '/callback' : void 0;
  var successRedirect = options.successRedirect || '/auth/landing';
  var failureRedirect = options.failureRedirect || '/auth/landing';
  var authType = authSchema.toLowerCase();

  switch (authType) {
    case 'local':
    case 'oauth':
    case 'oauth1':
    case 'oauth 1.0':
    case 'openid':
    case 'openid connect':
      throw new Error('Not implemented');
      break;

    default:
      passport.use(name, new AuthStrategy(_.defaults({
          clientID: clientID,
          clientSecret: clientSecret,
          callbackURL: callbackURL,
          passReqToCallback: true
        }, options),
        function (req, accessToken, refreshToken, profile, done) {
          var dbquery;

          // Connect a new account (if not yet) to the current user
          if (req.user) {
            req.user.linkIdentity(name, profile, {
              accessToken: accessToken,
              refreshToken: refreshToken
            }).then(function (user) {
              done(null, user)
            }).catch(done);
          }

          // Create (if not yet) and login a user
          else {
            dbquery = fleng.models.User.findOne({
              '_identities': {
                $elemMatch: { 'provider': name, '_profile.id': profile.id }
              }
            });

            Promise.resolve(dbquery.exec()).then(function (user) {
              if (!user) {
                user = new fleng.models.User();
              }

              return user.linkIdentity(name, profile, {
                accessToken: accessToken,
                refreshToken: refreshToken
              }).then(function (user) {
                done(null, user)
              });
            }).catch(done);
          }
        }
      ));
  }

  if (authType === 'local') {
    throw new Error('Not implemented');
  }
  else {
    if (authPath) {
      router.get(authPath, passport.authenticate(name, options.authParams));
    }

    if (callbackPath) {
      router.get(callbackPath, passport.authenticate(name, {
        successRedirect: successRedirect,
        failureRedirect: failureRedirect
      }));
    }
  }

  router.get('/auth/landing', function (req, res) {
    res.redirect('/');
  });
};
