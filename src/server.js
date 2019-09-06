import { Node } from './node'
import { MESSAGE_TYPES } from './constants'

import { MethodNotDefinedError } from './errors'

import {
  validateId,
  validateMethodName,
  validateParameters,
  promiseTry,
  generateId,
  noop,
} from './util'

export class Server extends Node {
  constructor({
    handleRequestTimeout = Infinity,
    methods = {},
    ...options
  }) {
    super(options)

    /**
     * Methods exposed by the server
     */
    this.methods = methods

    /**
     * Milliseconds after which a function handling the request
     * should be timed out.
     *
     * default: Infinity
     */
    this.handleRequestTimeout = handleRequestTimeout
  }

  handleRequest(source, requestId, methodName, parameters) {
    validateId(requestId)
    validateId(source)
    validateMethodName(methodName)
    validateParameters(parameters)

    const onSuccess = result => {
      this.sendMessage({
        id: generateId(`message-${this.messageTypes.response}`),
        type: this.messageTypes.response,
        destination: source,
        payload: {
          requestId,
          result,
          error: false
        }
      })
    }

    const onError = error => {
      this.sendMessage({
        id: generateId(`message-${this.messageTypes.response}`),
        type: this.messageTypes.response,
        destination: source,
        payload: {
          requestId,
          result: error,
          error: error.name || 'Error',
        }
      })
    }

    const taskId = `${source}/${requestId}`
    let task = this.taskManager.getTask(taskId)

    if (!task) {
      //
      // Refers to a new request
      //
      task = this.taskManager.createTask({
        id: taskId,
        timeout: this.handleRequestTimeout,
      })

      const fn = this.methods[methodName]

      if (typeof fn !== 'function') {
        task.reject(new MethodNotDefinedError(methodName))
      } else {
        promiseTry(fn, parameters).then(
          result => task.resolve(result),
          error => task.reject(error)
        )
      }
    }

    //
    // The request has already been received and is in execution
    // Wait for the request to be resolved.
    //
    task.promise.then(onSuccess, onError)

    return true
  }

  receiveMessage(message) {
    if (super.receiveMessage(message)) {
      return true
    } else if (message.type === this.messageTypes.request) {
      return this.handleRequest(
        message.source,
        message.payload.requestId,
        message.payload.method,
        message.payload.parameters
      )
    } else {
      return false
    }
  }

  expose(methods) {
    Object.keys(methods).forEach(methodName => {
      if (this.methods[methodName]) {
        console.warn(`Overwriting method: ${methodName}`)
      }

      this.methods[methodName] = methods[methodName]
    })
  }
}

export const createServer = options => new Server(options)
