const util = require('util');
const Intercomm = require('./lib/intercomm');

/**
 * Intercom that enforces the 'client' type
 * @param {Object} options
 */
function IntercommClient(options) {
  options.type = 'client';

  Intercomm.call(this, options);
}
util.inherits(IntercommClient, Intercomm);

/**
 * Intercomm that enforces the 'server' type
 * @param {Object} options
 */
function IntercommServer(options) {
  options.type = 'server';

  Intercomm.call(this, options);
}
util.inherits(IntercommServer, Intercomm);

module.exports = Intercomm;
module.exports.Client = IntercommClient;
module.exports.Server = IntercommServer;
