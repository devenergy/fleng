'use strict';

// Dependencies
var mongoose = require('mongoose');
var MongooseError = mongoose.Error;
var oid = mongoose.Types.ObjectId;

/**
 *
 * @param {String|ObjectId|Document} val
 * @returns {ObjectId}
 */
module.exports = function toObjectId(val) {
  if (val == null || val instanceof oid) {
    return val;
  }

  if (val._id && val._id instanceof oid)
    return val._id;

  if (val.toString) {
    try {
      return oid.createFromHexString(val.toString());
    } catch (err) {
      throw new MongooseError('Cast to ObjectId failed for value "' + val);
    }
  }

  throw new MongooseError('Cast to ObjectId failed for value "' + val);
};
