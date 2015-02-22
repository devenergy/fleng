'use strict';

// Module dependencies
var mongoose = require('mongoose');
var _ = require('lodash');

// Utilities
var toObjectId = require('../util/to_oid');

// Plugin definition
module.exports = function voting(schema) {
  // This is to avoid circular dependency
  var BaseSchema = require('../schema');

  // Vote schema definition
  var voteSchema = new BaseSchema({
    _user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    _value: { type: Number },
    name: { type: String },
    address: { type: String }
  }, {
    _id: false,
    id: false,
    timestamps: {
      createdAt: '_createdAt',
      updatedAt: '_updatedAt'
    }
  });

  // Only +1 and -1 are valid values for vote value
  voteSchema.path('_value').validate(function (val) {
    return Math.abs(val) === 1;
  }, 'Value of the vote can only be 1 or -1.');

  schema.add({
    _votes: {
      type: [ voteSchema ],
      'default': function () { return [] }
    }
  });

  // Virtual properties
  schema.virtual('upvotes').get(function () {
    return _.filter(this._votes, function (_vote) {
      return _vote._value === 1;
    });
  });

  schema.virtual('downvotes').get(function () {
    return _.filter(this._votes, function (_vote) {
      return _vote._value === -1;
    });
  });

  // Instance methods
  schema.method('hasVote', function (user, value) {
    var userId = toObjectId(user);
    var compareValue = !_.isUndefined(value);

    return !!_.find(this._votes, function (_vote) {
      return _vote._user.equals(userId)
        && (compareValue ? _vote._value === value : true);
    });
  });

  schema.method('userVote', function userVote(user) {
    var userId = toObjectId(user);

    return _.find(this._votes, function (_vote) {
      return _vote._user.equals(userId);
    });
  });

  schema.method('userVoteValue', function userVoteValue(user) {
    var vote = this.userVote(user);

    return vote ? vote._value : 0;
  });

  schema.method('giveVote', function (user, value) {
    var userId = toObjectId(user);

    this.revokeVote(user);

    this._votes.push({
      _user: userId,
      _value: value || 1,
      name: user.displayName,
      address: user.primaryAddress
    });

    this.markModified('_votes');
  });

  schema.method('revokeVote', function (user) {
    var userId = toObjectId(user);
    var oldLength = this._votes.length;

    _.remove(this._votes, function (_vote) {
      return _vote._user.equals(userId);
    });

    if (oldLength !== this._votes) {
      this.markModified('_votes');
    }
  });
};
