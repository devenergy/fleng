'use strict';

// Dependencies
var cookieParser = require('cookie-parser');
var express = require('express');
var expressSession = require('express-session');
var fleng = require('../../../');
var MongoStore = require('connect-mongo')(expressSession);

module.exports = function (app) {
  var session = new Session(app);

  Object.defineProperty(app, 'session', {
    enumerable: true,
    value: session
  });

  return session.router;
};

function Session(app) {
  var config = app.config.get('middleware.session');
  var router = this.router = express.Router();
  var store = this.store = new MongoStore({
    mongooseConnection: fleng.db.connection,
    touchAfter: 24 * 3600
  });

  router.use(cookieParser());
  router.use(expressSession({
    key: config.cookie,
    cookie: {
      domain: config.domain,
      maxAge: config.maxAge
    },
    secret: config.secret,
    store: store,
    resave: false,
    saveUninitialized: true
  }));
}
