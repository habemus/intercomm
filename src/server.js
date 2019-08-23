import uuidv4 from 'uuid/v4'
import { Node } from './node'
import { MESSAGE_TYPES } from './constants'

import {
  validateId,
  validateMethodName,
  validateParameters,
  promiseTry,
} from './util'

export class Server extends Node {
  constructor({
    methods = {},
    messageTypes = MESSAGE_TYPES,
    onSendMessage,
    onAttachMessageListener,
    ...options
  }) {
    super({
      ...options,
      onSendMessage: message => onSendMessage(
        messageTypes.response,
        message
      ),
      onAttachMessageListener: onAttachMessageListener ?
        listener => onAttachMessageListener(
          messageTypes.request,
          listener
        ) :
        undefined,
    })

    this.methods = methods
    this.messageTypes = messageTypes
  }

  receiveMessage({ id: requestId, source, payload: { method, parameters } }) {
    validateId(requestId)
    validateId(source)
    validateMethodName(method)
    validateParameters(parameters)

    const fn = this.methods[method]

    if (typeof fn !== 'function') {
      //
      // Wrap in Promise.resolve() so that
      // message is never sent synchronously
      //
      Promise.resolve().then(() => {
        this.sendMessage({
          id: uuidv4(),
          type: this.messageTypes.response,
          payload: {
            requestId,
            result: {
              name: 'METHOD_NOT_DEFINED_ERROR',
              message: `Method '${method}' is not defined`,
            },
            error: 'METHOD_NOT_DEFINED_ERROR'
          }
        }, source)
      })
    } else {
      promiseTry(fn, parameters).then(result => {
        this.sendMessage({
          id: uuidv4(),
          type: this.messageTypes.response,
          payload: {
            requestId,
            result,
            error: false
          }
        }, source)
      }, error => {
        this.sendMessage({
          id: uuidv4(),
          type: this.messageTypes.response,
          payload: {
            requestId,
            result: error,
            error: error.name || 'Error',
          }
        }, source)
      })
    }
  }

  expose(methods) {
    this.methods = {
      ...this.methods,
      ...methods
    }
  }
}
