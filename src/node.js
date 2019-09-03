import {
  validateId,
  promiseTry,
  noop,
  generateId
} from './util'

import { MESSAGE_TYPES } from './constants'
import { SendMessageError } from './errors'
import { TaskManager } from './task-manager'

const logUnhandledMessage = message => {
  console.warn('UNHANDLED_MESSAGE', message)
}

export class Node {
  constructor({
    id = generateId(),
    onSendMessage,
    onReceiveMessage = noop,
    messageTypes = MESSAGE_TYPES,
    onUnhandledMessage = logUnhandledMessage,
    onAttachListener = noop,

    timeout,
  }) {
    validateId(id)

    if (typeof onSendMessage !== 'function') {
      throw new TypeError('onSendMessage MUST be a function')
    }

    this.messageTypes = messageTypes

    this.id = id
    this.onSendMessage = onSendMessage
    this.onUnhandledMessage = onUnhandledMessage

    this.taskManager = new TaskManager({
      timeout,
    })

    onAttachListener(this.receiveMessage.bind(this))
  }

  ackMessage(message) {
    return this.sendMessage({
      type: this.messageTypes.ack,
      payload: message.id,
      destination: message.source,
    })
  }

  sendMessage({ id = generateId(), ...message }, sendMessageRequestOptions) {

    message = {
      ...message,
      id,
      source: this.id,
    }

    const task = this.taskManager.create(() => {
      this.onSendMessage(message)
    }, {
      ...sendMessageRequestOptions,
      id,
      metadata: {
        taskType: 'SEND_MESSAGE',
        message,
      }
    })

    return task.attempt()
  }

  /**
   * Resolves the corresponding sendMessage task
   */
  receiveAck(message) {
    const task = this.taskManager.get(message.payload)

    if (task) {
      task.resolve()
    } else {
      this.onUnhandledMessage(message)
    }

    return true
  }

  receiveMessage(message) {
    if (message.type === this.messageTypes.ack) {
      return this.receiveAck(message)
    } else {
      this.ackMessage(message)
      return false
    }
  }
}

export const createNode = options => new Node(options)
