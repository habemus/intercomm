import { Node } from './node'
import { MESSAGE_TYPES } from './constants'

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
    methods,
    ...options
  }) {
    super(options)

    this.methods = methods
  }

  receiveRequest({ source, payload: { requestId, method, parameters } }) {
    validateId(requestId)
    validateId(source)
    validateMethodName(method)
    validateParameters(parameters)

    const onSuccess = result => {
      this.sendMessage({
        type: this.messageTypes.response,
        payload: {
          requestId,
          result,
          error: false
        }
      }, source)
    }

    const onError = error => {
      this.sendMessage({
        type: this.messageTypes.response,
        payload: {
          requestId,
          result: error,
          error: error.name || 'Error',
        }
      }, source)
    }

    let task = this.taskManager.get(requestId)

    if (!task) {
      //
      // Refers to a new request
      //
      task = this.taskManager.create(noop, {
        id: requestId
      })

      const fn = this.methods[method]

      if (typeof fn !== 'function') {
        task.reject(new MethodNotDefinedError(method))
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
      return this.receiveRequest(message)
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
