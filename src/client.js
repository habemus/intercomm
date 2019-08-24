import {
  MESSAGE_TYPES
} from './constants'

import {
  promiseTry,
  validateId,
  validateMethodName,
  validateParameters,
  generateId,
} from './util'

import { RequestManager } from './request-manager'
import { Node } from './node'

export class Client extends Node {
  constructor({
    defaultRequestTimeout = 1000,
    messageTypes = MESSAGE_TYPES,
    onSendMessage,
    onAttachMessageListener,
    ...options
  }) {
    super({
      ...options,
      onSendMessage: message => onSendMessage(
        messageTypes.request,
        message
      ),
      onAttachMessageListener: onAttachMessageListener ?
        listener => onAttachMessageListener(
          messageTypes.response,
          listener
        ) :
        undefined,
    })

    this.messageTypes = messageTypes

    this.requestManager = new RequestManager({
      defaultRequestTimeout
    })
  }

  request(method, parameters) {
    validateMethodName(method)
    validateParameters(parameters)

    const requestId = generateId()

    const request = this.requestManager.registerRequest(requestId)

    return this.sendMessage({
      id: requestId,
      type: this.messageTypes.request,
      payload: {
        method,
        parameters,
      }
    })
    .then(() => request.promise)
  }

  receiveMessage(message) {
    const {
      payload: {
        requestId,
        result,
        error,
      }
    } = message

    validateId(requestId)

    const request = this.requestManager.getRequest(requestId)

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
}
