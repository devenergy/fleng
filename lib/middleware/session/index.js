'use strict';

// Dependencies
var cookieParser = require('cookie-parser');
var express = require('express');
var expressSession = require('express-session');
var fleng = require('../../../');
var MongoStore = require('connect-mongo')(expressSession);

// Define middleware
module.exports = function session(app) {
  var router = express.Router();
  var config = app.config.get('middleware.session');
  var store = new MongoStore({
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

  return router;
};
