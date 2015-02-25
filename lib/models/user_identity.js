exports.name = 'UserIdentity';

exports.attributes = {
  provider: { type: String },
  _profile: {},
  _data: {},

  displayName: function () {
    try {
      return this._profile.displayName;
    }
    catch (err) {
      return '';
    }
  },

  addresses: function () {
    try {
      return this._profile.emails.map(function (email) {
        return email.value
      });
    }
    catch (err) {
      return [];
    }
  },

  _picture: function () {
    try {
      return this._profile._json.picture;
    }
    catch (err) {
      return null;
    }
  }
};

exports.options = {
  _id: false,
  id: false,
  collection: null,
  timestamps: {
    createdAt: '_createdAt',
    updatedAt: false
  }
};
