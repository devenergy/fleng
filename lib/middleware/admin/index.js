'use strict';

// Dependencies
var express = require('express');

// Define middleware
var app = module.exports = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.get('/', function (req, res) {
  res.render('index');
});
