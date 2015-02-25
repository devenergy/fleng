'use strict';

// Core modules
var fs = require('fs');
var path = require('path');

// Dependencies
var _ = require('lodash');
var s = require('string');
var Promise = require('bluebird');

// Expose function
module.exports = loadModels;

/**
 * Loads models
 *
 */
function loadModels(fleng) {
  var modelsDir = path.resolve(fleng.config.get('root'), 'models');
  var schemas = {};
  var models = {};
  var schemaRelations = {};
  var modelsMap = {};

  function createSchema(spec) {
    var schema = schemas[spec.name];

    if (!schema) {
      schema = schemas[spec.name] = new fleng.DB.BaseSchema(null, spec.options);
    }

    _.each(spec.attributes || {}, function (attribute, name) {
      var field = {}

      if (_.isFunction(attribute)) {
        schema.virtual(name).get(attribute).set(attribute);
      }
      else {
        field[name] = attribute;
        schema.add(field);
      }
    });

    if (spec.relations) {
      _.each(spec.relations, function (relation, path) {
        schemaRelations[spec.name] = schemaRelations[spec.name] || {};
        schemaRelations[spec.name][path] = relation;
      });
    }

    if (spec.indexes) {
      _.each(spec.indexes, schema.index, schema);
    }

    // Apply plugins
    if (spec.plugins) {
      _.each(spec.plugins, function (options, name) {
        if (options === false) return;
        if (!fleng.DB.plugins[name]) {
          throw new Error('Cannot find plugin: ' + name);
        }

        schema.plugin(fleng.DB.plugins[name], options);
      });
    }

    // Create instance methods
    _.each(spec, function (property, name) {
      if (_.isFunction(property)) {
        schema.method(name, property);
      }
    });

    return schema;
  }

  // Create schemas for built-in models
  // It will allow to override them later
  schemas.User = createSchema(require('./models/user'));
  schemas.UserIdentity = createSchema(require('./models/user_identity'));

  // Load customer models
  _.each(fs.readdirSync(modelsDir), function (modelFile) {
    var filePath = path.resolve(modelsDir, modelFile);
    var spec = require(filePath);
    var schema;

    spec.name = spec.name || s(modelFile).chompRight('.js').capitalize().camelize().s;
    spec.options = spec.options || {};

    schema = createSchema(spec);

    // User model will be created separately
    if (spec.name !== 'User' && spec.options.collection !== null) {
      models[ spec.name ] = schema;
    }
  });

  _.each(schemaRelations, function (relations, schemaName) {
    var schema = schemas[schemaName];

    _.each(relations, function (relation, path) {
      var field = {};

      // [ 'EmbeddedArray' ]
      if (_.isArray(relation)) {
        field[path] = { type: [ schemas[ relation[ 0 ] ] ] };
      }
      // 'EmbeddedSchema'
      else {
        field[path] = { type: schemas[ relation ] };
      }

      schema.add(field);
    });
  });

  models.User = schemas.User;

  _.each(models, function (schema, name) {
    modelsMap[name] = fleng.db.model(name, schema);
  });

  return modelsMap;
}
