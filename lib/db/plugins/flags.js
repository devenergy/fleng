'use strict';

// Dependencies
var _ = require('lodash');

// Util
var toObjectId = require('../util/to_oid');

// Default options
var defaults = {
    flags: [],
    userFlags: [],
    privateFlags: [ 'deleted' ]
};

/*!
 * Flags plugin
 *
 */
module.exports = function flags(schema, options) {
    var addFlags;
    var addUserFlags;
    var addPrivateFlags;
    var validFlags;
    var validUserFlags;
    var validPrivateFlags;

    options = _.defaults({}, options, defaults);

    addFlags = options.flags !== false;
    addUserFlags = options.userFlags !== false;
    addPrivateFlags = options.privateFlags !== false;
    validFlags = _.isArray(options.flags) ? options.flags : [];
    validUserFlags = _.isArray(options.userFlags) ? options.userFlags : [];
    validPrivateFlags = _.isArray(options.privateFlags) ? options.privateFlags : [ 'deleted', 'archived' ];

    if (addFlags) {
        // Add global flags field
        schema.add({
            _flags: {
                type: [ String ],
                'default': function () { return []; }
            }
        });

        // Define index
        schema.index({ _id: 1, _flags: 1 }, { unique: true, sparse: true });

        /**
         * Checks if the document has a specified flag
         *
         * @param {String} flag
         * @returns {Boolean}
         */
        schema.method('hasFlag', function hasFlag(flag) {
            return _.contains(this._flags, flag.toLowerCase());
        });

        /**
         * Checks if the flag can be set on the document
         *
         * @param {String} flag
         * @returns {Boolean}
         */
        schema.method('flagAllowed', function flagAllowed(flag) {
            return _.contains(validFlags, flag);
        });

        /**
         * Sets a flag on document unless it already set
         *
         * @param {String} flag
         */
        schema.method('setFlag', function setFlag(flag) {
            if (!this.hasFlag(flag) && this.flagAllowed(flag)) {
                this._flags.push(flag.toLowerCase());
                this.markModified('_flags');
            }
        });

        /**
         * Unsets flag on document if the flag presents
         *
         * @param {String} flag
         */
        schema.method('unsetFlag', function unsetFlag(flag) {
            if (this.hasFlag(flag)) {
                _.remove(this._flags, function (_flag) {
                    return _flag === flag.toLowerCase();
                });
                this.markModified('_flags');
            }
        });
    }

    if (addUserFlags) {
        // Add user flags field
        schema.add({
            _userFlags: {
                type: [],
                'default': function () { return []; }
            }
        });

        // Define index
        schema.index({
            _id: 1,
            '_userFlags.user': 1,
            '_userFlags.flag': 1
        }, {
            unique: true,
            sparse: true
        });

        /**
         * Checks if the document has a specified flag
         *
         * @param {String} flag
         * @param {String|ObjectId|Document} user
         * @returns {Boolean}
         */
        schema.method('hasUserFlag', function hasUserFlag(flag, user) {
            var userId = toObjectId(user);

            flag = flag.toLowerCase();

            return !!_.find(this._userFlags, function (_flag) {
                return _flag.user.equals(userId) && _flag.flag === flag;
            });
        });

        /**
         * Checks if the user flag can be set on the document
         *
         * @param {String} flag
         * @returns {Boolean}
         */
        schema.method('userFlagAllowed', function userFlagAllowed(flag) {
            return _.contains(validUserFlags, flag.toLowerCase());
        });

        /**
         * Sets user flag on document
         *
         * @param {String} flag
         * @param {String|ObjectId|Document} user
         */
        schema.method('setUserFlag', function setUserFlag(flag, user) {
            if (!this.hasUserFlag(flag, user) && this.userFlagAllowed(flag)) {
                this._userFlags.push({
                    user: toObjectId(user),
                    flag: flag.toLowerCase()
                });
                this.markModified('_userFlags');
            }
        });

        /**
         * Unsets user flag on document
         *
         * @param {String} flag
         * @param {String|ObjectId|Document} user
         */
        schema.method('unsetUserFlag', function unsetUserFlag(flag, user) {
            var userId = toObjectId(user);

            if (this.hasUserFlag(flag, user)) {
                flag = flag.toLowerCase();

                _.remove(this._userFlags, function (_flag) {
                    return _flag.user.equals(userId) && _flag.flag === flag;
                });
                this.markModified('_userFlags');
            }
        });

        /**
         * Returns an array of flags (both globals and user's)
         * set on document
         *
         * @param {String|ObjectId|Document} user
         * @returns {Array}
         */
        schema.method('getUserFlags', function getUserFlags(user) {
            var _flags = (this._flags || []).slice();
            var userId = toObjectId(user);

            _.each(this._userFlags, function (_flag) {
                var flag;

                if (_flag.user.equals(userId)) {
                    flag = _flag.flag.toLowerCase();

                    if (_flags.indexOf(flag) < 0) {
                        _flags.push(flag);
                    }
                }
            });

            return _flags;
        });
    }

    if (addPrivateFlags) {
        // Add global flags field
        schema.add({
            _privateFlags: {
                type: [],
                'default': function () { return []; }
            }
        });

        // Define index
        schema.index({
            _id: 1,
            '_privateFlags.user': 1,
            '_privateFlags.flag': 1
        });

        /**
         * Checks if the document has a specified private flag
         *
         * @param {String} flag
         * @param {String|ObjectId|Document} user
         * @returns {Boolean}
         */
        schema.method('hasPrivateFlag', function hasPrivateFlag(flag, user) {
            var userId = toObjectId(user);

            flag = flag.toLowerCase();

            return !!_.find(this._privateFlags, function (_flag) {
                return _flag.user.equals(userId) && _flag.flag === flag;
            });
        });

        /**
         * Checks if the private flag can be set on the document
         *
         * @param {String} flag
         * @returns {Boolean}
         */
        schema.method('privateFlagAllowed', function privateFlagAllowed(flag) {
            return _.contains(validPrivateFlags, flag.toLowerCase());
        });

        /**
         * Sets a private flag on document
         *
         * @param {String} flag
         * @param {String|ObjectId|Document} user
         */
        schema.method('setPrivateFlag', function setPrivateFlag(flag, user) {
            if (!this.hasPrivateFlag(flag, user) && this.privateFlagAllowed(flag)) {
                this._privateFlags.push({
                    user: toObjectId(user),
                    flag: flag.toLowerCase()
                });
                this.markModified('_privateFlags');
            }
        });

        /**
         * Unsets a private flag on document
         *
         * @param {String} flag
         * @param {String|ObjectId|Document} user
         */
        schema.method('unsetPrivateFlag', function unsetPrivateFlag(flag, user) {
            var userId = toObjectId(user);

            if (this.hasPrivateFlag(flag, user)) {
                flag = flag.toLowerCase();

                _.remove(this._privateFlags, function (_flag) {
                    return _flag.user.equals(userId) && _flag.flag === flag;
                });
                this.markModified('_privateFlags');
            }
        });
    }

    /**
     * Resets global flags and user flags
     *
     */
    schema.method('resetFlags', function () {
        if (addFlags) {
            this._flags = [];
        }

        if (addUserFlags) {
            this._userFlags = [];
        }
    });

    /**
     * Mass apply flags. User flags take precedence
     *
     * @param {Array|String} _flags
     * @param {Mongoose.Model} [user]
     */
    schema.method('applyFlags', function applyFlags(_flags, user) {
        if (!_flags) {
            return;
        }

        if ('string' === typeof _flags) {
            _flags = [ _flags ];
        }

        if (!_.isArray(_flags)) {
            return;
        }

        this.resetFlags();

        _flags.forEach(function (_flag) {
            if (addUserFlags && this.userFlagAllowed(_flag) && user) {
                this.setUserFlag(_flag, user);
            }
            else if (addFlags && this.flagAllowed(_flag)) {
                this.setFlag(_flag);
            }
            else {
                throw new Error('Flag ' + _flag + ' is not allowed for ' + schema);
            }
        }.bind(this));
    });
};
