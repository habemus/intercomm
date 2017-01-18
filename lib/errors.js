// native
const util = require('util');

function IntercommError(message) {
  Error.call(this, message);

  this.message = message;
}
util.inherits(IntercommError, Error);
IntercommError.prototype.name = 'IntercommError';

function MethodUndefined(method, message) {
  IntercommError.call(this, message);

  this.method = method;
}
util.inherits(MethodUndefined, IntercommError);
MethodUndefined.prototype.name = 'MethodUndefined';

function RequestTimeout(method, message) {
  IntercommError.call(this, message);

  this.method = method;
}
util.inherits(RequestTimeout, IntercommError);
RequestTimeout.prototype.name = 'RequestTimeout';

function IncorrectDestination(id, message) {
  IntercommError.call(this, message);

  this.id = id;
}
util.inherits(IncorrectDestination, IntercommError);
IncorrectDestination.prototype.name = 'IncorrectDestination';

function SendMessageError(sourceError) {
  IntercommError.call(this, sourceError.message);

  this.sourceError = sourceError;
}
util.inherits(SendMessageError, IntercommError);
SendMessageError.prototype.name = 'SendMessageError';

exports.IntercommError  = IntercommError;
exports.MethodUndefined = MethodUndefined;
exports.RequestTimeout  = RequestTimeout;
exports.IncorrectDestination = IncorrectDestination;
exports.SendMessageError = SendMessageError;
