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
  constructor({
    defaultRequestOptions = {},
    serverId,
    ...options
  }) {
    super(options)

    validateId(serverId)
    this.serverId = serverId

    this.defaultRequestOptions = defaultRequestOptions
  }

  request(method, parameters = [], { sendMessageOptions = {}, requestOptions = {} } = {}) {
    validateMethodName(method)
    validateParameters(parameters)

    const requestId = generateId(this.messageTypes.request)

    const sendMessageTask = this.sendMessage({
      id: generateId(`message-${this.messageTypes.request}`),
      type: this.messageTypes.request,
      destination: this.serverId,
      payload: {
        requestId,
        method,
        parameters
      }
    }, sendMessageOptions)

    /**
     * Task representing the rpc request.
     * Will be solved when a response message is received.
     */
    const requestTask = this.taskManager.createTask({
      ...this.defaultRequestOptions,
      ...requestOptions,
      id: requestId,
      metadata: {
        taskType: 'RPC_REQUEST',
        method,
        parameters,
      },
      dependencies: [sendMessageTask]
    })

    //
    // Ensure sendMessageTask is cancelled upon finishing of the requestTask. E.g.:
    // - requestTask has timed out
    // - requestTask has been canceled
    //
    requestTask.once('finished', () => sendMessageTask.cancel())

    //
    // Start the timeout timer
    //
    requestTask.attempt()

    return requestTask
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

    const request = this.taskManager.getTask(requestId)

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
