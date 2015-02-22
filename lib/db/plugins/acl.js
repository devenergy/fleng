'use strict';

// Dependencies
var _ = require('lodash');
var mongoose = require('mongoose');
var toObjectId = require('../util/to_oid');

module.exports = function acl(schema, options) {
  // This is to avoid circular dependency
  var BaseSchema = require('../schema');

  // Member schema definition
  var entrySchema = new BaseSchema({
    role: { type: String, required: true },
    user: { type: mongoose.SchemaTypes.ObjectId }
  }, {
    _id: false,
    id: false
  });

  schema.add({
    _acl: {
      type: [ entrySchema ],
      default: function () { return [] }
    }
  });

  schema.index({ '_acl.role': 1 });
  schema.index({ '_acl.user': 1 });


  /**
   * Adds actor to the model
   *
   * @params {ObjectId} userId
   * @params {String} role
   */
  schema.method('addActor', function addActor(user, role) {
    var actor = _.find(this._acl, function (entry) {
      return user._id.equals(entry.user);
    });

    if (actor) {
      this._acl = _.without(this._acl, actor);
    }

    this._acl.push({
      role: role,
      user: user._id
    });

    this.markModified('_acl');
  });

  /**
   * Checks if the object has such an actor
   *
   * @param {Object} user
   * @param {String} [role]
   */
  schema.method('hasActor', function hasActor(user, role) {
    return !!_.find(this._acl, function (entry) {
      var checkRole = true;

      if (role) {
        checkRole = entry.role === role;
      }

      return checkRole && user._id.equals(entry.user);
    });
  });

  /**
   *
   */
  schema.static('findByActor', function findByActor(actor) {
    return this.find({
      '_acl.user': toObjectId(actor)
    });
  });
};
