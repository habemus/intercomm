// native
const EventEmitter = require('events')

// third-party
const json       = require('json-message')
const objectPath = require('object-path')

// constants
const DEFAULT_ERROR_DATA = {
  name: true,
  message: true
}

const DEFAULT_REQUEST_TIMEOUT = 10000

const errors = require('./errors')
const promiseTry = require('./promise-try')
const {
  RequestManager,
  RequestTimeoutError
} = require('./request-manager')

/**
 * Intercomm constructor.
 * Represents a node in a broader network of processes
 * that communicate and expose methods to each other.
 * @param {Object} options
 */
class Intercomm extends EventEmitter {
  constructor(options) {
    super()

    /**
     * A semver valid version to be used for the messaging API
     * @type {SemVer}
     * @required
     */
    this.apiVersion = options.apiVersion || this.apiVersion

    /**
     * Intercomm id used for identifying the source and destination
     * of messages
     * @type {String}
     * @required
     */
    this.id = options.id || this.id

    /**
     * Indicates the type of the Intercomm instance
     * may be 'client', 'server' or 'both'
     * @type {String}
     * @required
     */
    this.type = options.type || this.type

    /**
     * Method responsible for integrating with underlying message
     * routing system.
     * @type {Function}
     * @required
     */
    this.sendMessage = options.sendMessage || this.sendMessage

    /**
     * Method responsible for loading the response message with data
     * from a result
     * @type {Function}
     * @optional
     */
    this.loadResponseData = options.loadResponseData || this.loadResponseData

    /**
     * Method responsible for loading the response message with data
     * from an event
     * @type {Function}
     * @optional
     */
    this.loadEventData = options.loadEventData || this.loadEventData

    /**
     * Method responsible for loading the response message with data
     * from an error
     * @type {Function}
     * @optional
     */
    this.loadErrorData = options.loadErrorData || this.loadErrorData

    /**
     * Miliseconds after which any request MUST be rejected with a RequestTimeoutError
     * @type {Number}
     */
    this.requestTimeout = options.requestTimeout || this.requestTimeout || DEFAULT_REQUEST_TIMEOUT

    // check for required options
    if (!this.apiVersion) { throw new Error('apiVersion is required') }
    if (!this.id) { throw new Error('id is required') }
    if (!this.type) { throw new Error('type is required') }
    if (!this.sendMessage) { throw new Error('sendMessage method must be implemented') }

    /**
     * Message factory
     * @type {Object}
     */
    this.messageAPI = json(this.apiVersion)

    /**
     * The `handleMessage` is bound to the intercomm instance
     * so that it can be easily passed around
     * @type {Function}
     */
    this.handleMessage = this.handleMessage.bind(this)

    if (this.type === 'server' || this.type === 'both') {
      this.api = {}
    }

    if (this.type === 'client' || this.type === 'both') {
      this.requestManager = new RequestManager({
        requestTimeout: this.requestTimeout,
      })
    }
  }

  /**
   * Executes a method on the remote server.
   * @param  {String} at id of the node on which the method should be executed
   * @param  {String} method
   * @param  {Array} parameters
   * @return {Promise}
   */
  exec(at, method, parameters) {

    if (this.type === 'server') {
      throw new Error('server intercomm cannot execute any remote methods')
    }

    if (!at) { throw new Error('at is required') }
    if (!method) { throw new Error('method is required') }

    var requestData = this.messageAPI.rpcRequest(method, parameters)

    requestData.from = this.id
    requestData.to   = at

    try {
      let request = this.requestManager.registerRequest(requestData.id)

      // send the message and then return the request's promise
      return Promise.resolve(this.sendMessage(requestData))
        .catch(err => {
          // Only catch sendMessage's errors.
          // Other errors should be considered operational
          // and out of intercomm's scope
          return Promise.reject(new errors.SendMessageError(err))
        })
        .then(() => {
          // Return the promise intercepting and modifying `RequestTimeoutError`s
          return request.promise.catch(err => {
            if (err instanceof RequestTimeoutError) {
              return Promise.reject(new errors.RequestTimeout(method, 'Request timeout'))
            } else {
              return Promise.reject(err)
            }
          })
        })

    } catch (err) {
      return Promise.reject(new errors.SendMessageError(err))
    }
  }

  /**
   * Emits an event on remote nodes
   * @param  {String} eventName 
   * @param  {Object} data
   */
  publish(eventName, data) {

    if (!eventName) { throw new Error('eventName is required') }

    var eventMsg = this.messageAPI.event(eventName)

    this.loadEventData(eventMsg, data)

    eventMsg.from = this.id

    this.sendMessage(eventMsg)
  }

  /**
   * Handles an incoming message
   * @param  {String|Object} message
   */
  handleMessage(message) {

    if (!message) { return }

    // make sure the message is in object format
    message = (typeof message === 'string') ? JSON.parse(message) : message

    var messageIsForThisNode = false

    if (!message.to) {
      // the message's recipient was not explicitly defined
      messageIsForThisNode = true
    } else {
      messageIsForThisNode = (message.to === this.id)
    }

    if (messageIsForThisNode) {
      // check for the type of the message
      switch (message.type) {
        case 'rpc-request':
          if (this.type === 'client') {
            // ignore
          } else {
            return this.handleRequestMessage(message)
          }
          break
        case 'response':
          return this.handleResponseMessage(message)
          break
        case 'event':
          return this.handleEventMessage(message)
          break
      }
    } else {
      return Promise.reject(new errors.IncorrectDestination(
        message.to,
        'received message not destinated to this node'
      ))
    }
  }

  /**
   * Handles a response message
   * @param  {Object} response
   */
  handleResponseMessage(response) {
    // retrieve original request for the response
    const request = this.requestManager.getRequest(response.requestId, { error: false })

    if (!request) {
      // Ignore requests that were not found
      return
    }

    if (response.error) {
      request.reject(response.error)
    } else {
      request.resolve(response.data)
    }

    // resolve immediately
    return Promise.resolve()
  }


  /**
   * Handles a request
   * @param  {Object} request
   */
  handleRequestMessage(request) {
    const fn = objectPath.get(this.api, request.method)

    if (typeof fn !== 'function') {

      let error = new errors.MethodUndefined(
        request.method,
        `Method '${request.method}' is not defined.`
      )

      // process next tick
      process.nextTick(() => {

        // method does not exist in the exposed api
        const response = this.messageAPI.errorResponse(request.id)

        // set response metadata
        response.from = this.id
        response.to   = request.from

        // load the error response data
        this.loadErrorData(request, response, error)

        this.sendMessage(response)
      })

      return Promise.resolve()

    } else {

      return promiseTry(fn, request.params).then(result => {
        var response = this.messageAPI.itemResponse(request.id)

        response.from = this.id
        response.to   = request.from

        // call user defined `loadResponseData` method
        // to load the result into the response object
        this.loadResponseData(request, response, result)

        this.sendMessage(response)
      })
      .catch(err => {
        var response = this.messageAPI.errorResponse(request.id)

        response.from = this.id
        response.to   = request.from

        this.loadErrorData(request, response, err)

        this.sendMessage(response)
      })
    }
  }

  /**
   * The default error data loader
   * Loads name and message onto the response
   * @param  {JSONRequestMessage}  request
   * @param  {JSONMessageResponse} response
   * @param  {Error}
   */
  loadErrorData(request, response, err) {
    response.load({
      name: err.name,
      message: err.message,
    }, DEFAULT_ERROR_DATA)
  }

  /**
   * Default response data loader
   * By default it sets the data property of the response object directly
   * @param  {JSONRequestMessage} request
   * @param  {JSONResponseMessage} response
   * @param  {*} data
   */
  loadResponseData(request, response, data) {
    if (typeof data.toJSON === 'function') {
      data = data.toJSON()
    }

    response.data = data
  }

  /**
   * Default event data loader
   * @param  {JSONEventMessage} eventMessage
   * @param  {*} data
   */
  loadEventData(eventMessage, data) {
    if (typeof data.toJSON === 'function') {
      data = data.toJSON()
    }

    eventMessage.data = data
  }

  /**
   * Handles an event message.
   * Emits an event with the eventName and its data.
   */
  handleEventMessage(eventMsg) {

    // emit the event locally
    this.emit(eventMsg.eventName, eventMsg.data)
  }

  /**
   * Exposes methods to be used by remote client
   */
  expose(source, options = { methods: [] }) {
    if (this.type === 'client') {
      throw new Error('client Intercomm instance is not capable of exposing api')
    }

    let scope
    let methods

    if (Array.isArray(options)) {
      methods = options
    } else {
      scope = options.scope
      methods = options.methods
    }

    if (methods.length === 0) {
      console.warn('expose called with no methods')
    }

    const exposedMethods = methods.reduce((acc, method) => {
      let fn = source[method]

      if (typeof fn === 'function') {
        return Object.assign({
          [method]: fn
        }, acc)
      } else {
        return acc
      }

    }, {})

    let exposedAPI = {}

    if (scope) {
      objectPath.set(exposedAPI, scope, exposedMethods)
    } else {
      exposedAPI = exposedMethods
    }

    this.api = Object.assign({}, this.api, exposedAPI)
  }
}

/**
 * Statics
 */
Intercomm.errors = errors

module.exports = Intercomm
