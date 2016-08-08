// native
const EventEmitter = require('events');
const util         = require('util');

// third-party
const Bluebird   = require('bluebird');
const json       = require('json-message');
const objectPath = require('object-path');

// constants
const DEFAULT_ERROR_DATA = {
  name: true,
  message: true
};

const DEFAULT_REQUEST_TIMEOUT = 10000;

const errors = require('./errors');

/**
 * Auxiliary function that creates a defer object.
 * It optionally takes a timeoutMs argument that
 * is used to automatically timeoutMs the promise
 * 
 * @param  {Number} timeoutMs
 * @return {Object}
 */
function _defer(timeoutMs) {

  if (!timeoutMs) {
    throw new Error('timeoutMs is required');
  }

  var _resolve;
  var _reject;

  var _promise = new Bluebird(function(resolve, reject) {

    var _timeout = setTimeout(function () {
      var error = new errors.RequestTimeout();

      reject(error);
    }, timeoutMs);

    _resolve = function (result) {
      clearTimeout(_timeout);

      resolve(result);
    };

    _reject = function (err) {
      clearTimeout(_timeout);

      reject(err);
    };
  });

  return {
    resolve: _resolve,
    reject: _reject,
    promise: _promise
  };
}

/**
 * Intercomm constructor.
 * Represents a node in a broader network of processes
 * that communicate and expose methods to each other.
 * @param {Object} options
 */
function Intercomm(options) {

  /**
   * A semver valid version to be used for the messaging API
   * @type {SemVer}
   * @required
   */
  this.apiVersion = options.apiVersion || this.apiVersion;

  /**
   * Intercomm id used for identifying the source and destination
   * of messages
   * @type {String}
   * @required
   */
  this.id = options.id || this.id;

  /**
   * Indicates the type of the Intercomm instance
   * may be 'client', 'server' or 'both'
   * @type {String}
   * @required
   */
  this.type = options.type || this.type;

  /**
   * Method responsible for integrating with underlying message
   * routing system.
   * @type {Function}
   * @required
   */
  this.sendMessage = options.sendMessage || this.sendMessage;

  /**
   * Method responsible for loading the response message with data
   * from a result
   * @type {Function}
   * @optional
   */
  this.loadResponseData = options.loadResponseData || this.loadResponseData;

  /**
   * Method responsible for loading the response message with data
   * from an event
   * @type {Function}
   * @optional
   */
  this.loadEventData = options.loadEventData || this.loadEventData;

  /**
   * Method responsible for loading the response message with data
   * from an error
   * @type {Function}
   * @optional
   */
  this.loadErrorData = options.loadErrorData || this.loadErrorData;

  /**
   * Miliseconds after which any request MUST be rejected with a RequestTimeoutError
   * @type {Number}
   */
  this.requestTimeout = options.requestTimeout || this.requestTimeout;

  // check for required options
  if (!this.apiVersion) { throw new Error('apiVersion is required'); }
  if (!this.id) { throw new Error('id is required'); }
  if (!this.type) { throw new Error('type is required'); }
  if (!this.sendMessage) { throw new Error('sendMessage method must be implemented'); }

  /**
   * Message factory
   * @type {Object}
   */
  this.messageAPI = json(this.apiVersion);

  /**
   * The `handleMessage` is bound to the intercomm instance
   * so that it can be easily passed around
   * @type {Function}
   */
  this.handleMessage = this.handleMessage.bind(this);

  if (this.type === 'server' || this.type === 'both') {
    this.api = {};
  }

  if (this.type === 'client' || this.type === 'both') {
    this._sentRequests = {};
  }
}

util.inherits(Intercomm, EventEmitter);

/**
 * Statics
 */
Intercomm.errors = errors;

/**
 * Amount of miliseconds after which a request MUST be timed out
 * @type {Number}
 */
Intercomm.prototype.requestTimeout = DEFAULT_REQUEST_TIMEOUT;

/**
 * Executes a method on the remote server.
 * @param  {String} at id of the node on which the method should be executed
 * @param  {String} method
 * @param  {Array} parameters
 * @return {Promise}
 */
Intercomm.prototype.exec = function (at, method, parameters) {

  if (this.type === 'server') {
    throw new Error('server intercomm cannot execute any remote methods');
  }

  if (!at) { throw new Error('at is required'); }
  if (!method) { throw new Error('method is required'); }

  var self = this;

  var request = this.messageAPI.request.rpc(method, parameters);

  request.from = this.id;
  request.to   = at;

  this.sendMessage(request);

  // create a defer object
  var defer = _defer(this.requestTimeout);

  // json-message assures the defer property won't be stringified
  request.defer = defer;

  this._sentRequests[request.id] = request;

  // whenever the promise is either rejected or resolve,
  // remove the request object from the `_sentRequests` hash
  defer.promise
    .then(function () {
      delete self._sentRequests[request.id];
    }, function () {
      delete self._sentRequests[request.id];
    });

  // return the promise
  return defer.promise;
};

/**
 * Emits an event on remote nodes
 * @param  {String} eventName 
 * @param  {Object} data
 */
Intercomm.prototype.publish = function (eventName, data) {

  if (!eventName) { throw new Error('eventName is required'); }

  var eventMsg = this.messageAPI.notification.event(eventName);

  this.loadEventData(eventMsg, data);

  eventMsg.from = this.id;

  this.sendMessage(eventMsg);
};

/**
 * Handles 
 * @param  {String|Object} message
 */
Intercomm.prototype.handleMessage = function (message) {

  if (!message) { return; }

  // make sure the message is in object format
  message = (typeof message === 'string') ? JSON.parse(message) : message;

  var messageIsForThisNode = false;

  if (!message.to) {
    // the message's recipient was not explicitly defined
    messageIsForThisNode = true;
  } else {
    messageIsForThisNode = (message.to === this.id);
  }

  if (messageIsForThisNode) {
    // check for the type of the message
    switch (message.type) {
      case 'rpc-request':
        if (this.type === 'client') {
          // ignore
        } else {
          return this.handleRequestMessage(message);
        }
        break;
      case 'response':
        return this.handleResponseMessage(message);
        break;
      case 'event':
        return this.handleEventMessage(message);
        break;
    }
  } else {

    return Bluebird.reject(new errors.IncorrectDestination(
      message.to,
      'received message not destinated to this node'
    ));
  }
};

/**
 * Handles a response
 * @param  {Object} response
 */
Intercomm.prototype.handleResponseMessage = function (response) {
  // retrieve original request for the response
  var request = this._sentRequests[response.id];

  if (!request) {
    // console.warn('could not find the original request for %s', response.id);
    return;
  }

  if (response.error) {
    request.defer.reject(response.error);
  } else {
    request.defer.resolve(response.data);
  }

  // resolve immediately
  return Bluebird.resolve();
};

/**
 * Handles a request
 * @param  {Object} request
 */
Intercomm.prototype.handleRequestMessage = function (request) {
  var self = this;

  // get the function
  var fn = objectPath.get(this.api, request.method);

  if (typeof fn !== 'function') {

    var error = new errors.MethodUndefined(
      request.method,
      'Method ' + request.method + ' is not defined.'
    );

    // process next tick
    process.nextTick(function () {

      // method does not exist in the exposed api
      var response = self.messageAPI.response.error(request);

      // set response metadata
      response.from = self.id;
      response.to   = request.from;

      // load the error response data
      self.loadErrorData(request, response, error);

      self.sendMessage(response);
    });

    return Bluebird.reject(error);

  } else {

    return new Bluebird(function (resolve, reject) {

      var result;

      try {
        result = fn.apply(null, request.params);
      } catch (err) {
        reject(err);

        return;
      }

      resolve(result);

    })
    .then(function (result) {
      var response = self.messageAPI.response.item(request);

      response.from = self.id;
      response.to   = request.from;

      // call user defined `loadResponseData` method
      // to load the result into the response object
      self.loadResponseData(request, response, result);

      self.sendMessage(response);
    })
    .catch(function (err) {
      var response = self.messageAPI.response.error(request);

      response.from = self.id;
      response.to   = request.from;

      self.loadErrorData(request, response, err);

      self.sendMessage(response);
    });
  }

};

/**
 * The default error data loader
 * Loads name and message onto the response
 * @param  {JSONRequestMessage}  request
 * @param  {JSONMessageResponse} response
 * @param  {Error}
 */
Intercomm.prototype.loadErrorData = function (request, response, err) {
  response.load({
    name: err.name,
    message: err.message,
  }, DEFAULT_ERROR_DATA);
};

/**
 * Default response data loader
 * By default it sets the data property of the response object directly
 * @param  {JSONRequestMessage} request
 * @param  {JSONResponseMessage} response
 * @param  {*} data
 */
Intercomm.prototype.loadResponseData = function (request, response, data) {
  response.data = data;
};

/**
 * Default event data loader
 * @param  {JSONEventMessage} eventMessage
 * @param  {*} data
 */
Intercomm.prototype.loadEventData = function (eventMessage, data) {
  eventMessage.data = data;
};

/**
 * Handles an event message.
 * Emits an event with the eventName and its data.
 */
Intercomm.prototype.handleEventMessage = function (eventMsg) {

  // emit the event locally
  this.emit(eventMsg.eventName, eventMsg.data);
};

/**
 * Exposes methods to be used by remote client
 */
Intercomm.prototype.expose = function () {
  if (this.type === 'client') {
    throw new Error('client Intercomm instance is not capable of exposing api');
  }

  if (arguments.length === 1 && typeof arguments[0] === 'object') {
    // get all methods from the object and expose them
    // only expose functions
    for (var methodName in arguments[0]) {
      if (arguments[0].hasOwnProperty(methodName) && typeof arguments[0][methodName] === 'function') {
        this.api[methodName] = arguments[0][methodName];
      }
    }
    
  } else {
    this.api[arguments[0]] = arguments[1];
  }
}

module.exports = Intercomm;