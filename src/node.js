import {
  validateId,
  promiseTry,
  noop,
  generateId
} from './util'

import { SendMessageError } from './errors'

const logUnhandledMessage = message => {
  console.warn('Unhandled message:', message)
}

export class Node {
  constructor({
    id = generateId(),
    onSendMessage,
    onUnhandledMessage = logUnhandledMessage,
    onAttachMessageListener = noop,
  }) {
    validateId(id)

    if (typeof onSendMessage !== 'function') {
      throw new TypeError('onSendMessage MUST be a function')
    }

    this.id = id
    this.onSendMessage = onSendMessage
    this.onUnhandledMessage = onUnhandledMessage

    onAttachMessageListener(this.receiveMessage.bind(this))
  }

  sendMessage(message, destination) {
    return promiseTry(this.onSendMessage, [{
      ...message,
      source: this.id,
      destination,
    }])
    .then(
      () => undefined,
      error => {
        // Do not allow consumer to have access
        // to the source error object
        throw new SendMessageError()
      }
    )
  }
}
