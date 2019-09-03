import {
  MESSAGE_TYPES
} from './constants'

import {
  validateId,
  validateMethodName,
  validateParameters,
  noop,
  generateId,
} from './util'

import { Node } from './node'

export class Client extends Node {
  request(method, parameters = [], {
    requestOptions,
    messageOptions
  } = {}) {
    validateMethodName(method)
    validateParameters(parameters)

    const requestId = generateId(this.messageTypes.request)

    return this.sendMessage({
      type: this.messageTypes.request,
      payload: {
        requestId,
        method,
        parameters
      }
    }, messageOptions)
    .then(() => {
      const request = this.taskManager.create(noop, {
        ...requestOptions,
        id: requestId,
        metadata: {
          requestType: 'RPC_REQUEST',
          method,
          parameters,
        }
      })

      return request.attempt()
    })
  }

  receiveResponse(message) {
    const {
      payload: {
        requestId,
        result,
        error,
      }
    } = message

    validateId(requestId)

    const request = this.taskManager.get(requestId)

    if (!request) {
      // Ignore requests that were not found
      // They may have been timed out
      this.onUnhandledMessage(message)
      return
    }

    if (error) {
      request.reject(result)
    } else {
      request.resolve(result)
    }
  }

  receiveMessage(message) {
    if (super.receiveMessage(message)) {
      return true
    } else if (message.type === this.messageTypes.response) {
      return this.receiveResponse(message)
    } else {
      return false
    }

  }
}

export const createClient = options => new Client(options)
