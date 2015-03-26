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
   * Adds member to document if it  isn't already present in document
   *
   * @param {String|Object} address|member
   * @param {String} name
   * @returns {undefined}
   */
  schema.method('addMember', function addMember(address, name) {
    var member;

    if (_.isPlainObject(address)) {
      name = address.name;
      address = address.address;
    }

    member = _.find(this._members, function (entry) {
      return entry.address === address;
    });

    if (member) {
      if (member.name !== name) {
        member.name = name;
      }
    }
    else {
      this._members.push({
        role: 'member',
        address: address,
        name: name
      });
    }

    this.markModified('_members');
  });

  schema.method('addMembers', function addMembers(members) {
    members = members || [];
    members.forEach(this.addMember.bind(this));
  });

  /**
   *
   */
  schema.method('setAuthor', function setAuthor(address, name) {
    if (_.isPlainObject(address)) {
      name = address.name;
      address = address.address;
    }

    var member = _.find(this._members, function (_member) {
      return _member.address === address;
    });

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
