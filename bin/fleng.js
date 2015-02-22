#!/usr/bin/env node

// Dependencies
var program = require('commander');
var pkg = require('../package.json');

program.version(pkg.version);

program
  .command('new [app]')
  .description('Create a new fleng application')
  .action(function (app, options) {
    console.log(app, options);
  });

program.parse(process.argv);
