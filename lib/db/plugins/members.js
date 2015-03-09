'use strict';

// Module dependencies
var _ = require('lodash');

// Plugin definition
module.exports = function (schema) {
  // This is to avoid circular dependency
  var BaseSchema = require('../schema');

  // Member schema definition
  var memberSchema = new BaseSchema({
    role: { type: String, default: 'member' },
    address: { type: String, required: true },
    name: { type: String }
  }, {
    _id: false,
    id: false,
    timestamps: {
      updatedAt: '_updatedAt'
    }
  });

  schema.add({
    _members: {
      type: [ memberSchema ],
      default: function () { return [] }
    }
  });

  //
  schema.index({ '_members.address': 1 });

  /**
   *
   */
  schema.virtual('author').get(function getAuthor() {
    return _.find(this._members, { role: 'author' });
  });

  /**
   *
   */
  schema.virtual('members').get(function getMembers() {
    var members = Array.prototype.slice.call(this._members);
    members.sort(function (a, b) {
      return a.role === 'author' ? -1 : 0;
    });
    return members;
  });

  /**
   *
   */
  schema.method('addMember', function addMember(address, name) {
    var member = _.find(this._members, { address: address });

    if (!member) {
      this._members.push({
        role: 'member',
        address: address,
        name: name
      });

      this.markModified('_members');
    }
  });

  schema.method('addMembers', function addMembers(members) {
    members = members || [];
    members.forEach(this.addMember.bind(this));
  });

  /**
   *
   */
  schema.method('setAuthor', function setAuthor(address, name) {
    var member = _.find(this._members, { address: address });

    if (member) {
      this._members = _.without(this._members, member);
    }

    this._members.unshift({
      role: 'author',
      address: address,
      name: name
    });

    this.markModified('_members');
  });
};
