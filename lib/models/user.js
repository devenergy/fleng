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
  var identity = _.find(this._identities || [], function (entry) {
    return entry.provider === provider
        && entry._profile
        && entry._profile.id === profile.id;
  });

  if (identity) {
    identity._data = identity._data || {};
    _.extend(identity._data, data);

    this.markModified('_identities');
  }
  else {
    this._identities.push({
      provider: provider,
      _profile: profile,
      _data: data
    });

    identity = _.last(this._identities);
  }

  return Promise.fromNode(this.save.bind(this)).return(identity);
};
