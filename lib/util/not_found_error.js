module.exports = NotFoundError;

function NotFoundError(message) {
  this.message = message;
  this.name = 'NotFoundError';
  this.status = 404;
  Error.captureStackTrace(this, NotFoundError);
}

NotFoundError.prototype = Object.create(Error.prototype);
NotFoundError.prototype.constructor = NotFoundError;
