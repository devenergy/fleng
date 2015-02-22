'use strict';

// Dependencies
var _ = require('lodash');
var Promise = require('bluebird');

exports.name = 'User';

exports.attributes = {
  accounts: function () {
    return this._identities;
  }
};

exports.relations = {
  _identities: [ 'UserIdentity' ]
};

exports.options = {
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: '_updatedAt'
  }
};

exports.linkIdentity = function linkIdentity(provider, profile, data) {
  var existingIdentity = _.find(this._identities || [], function (entry) {
    return entry.provider === provider
      && entry._profile
      && entry._profile.id === profile.id;
  });

  if (!existingIdentity) {
    this._identities.push({
      provider: provider,
      _profile: profile,
      _data: data
    });
  }

  return new Promise(function (resolve, reject) {
    this.save(function (err, user) {
      if (err) {
        reject(err);
      }
      else {
        resolve(user);
      }
    });
  }.bind(this));
}
