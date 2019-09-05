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

    sendMessageDefaultOptions = {}
  }) {
    validateId(id)

    if (typeof onSendMessage !== 'function') {
      throw new TypeError('onSendMessage MUST be a function')
    }

    this.messageTypes = messageTypes

    this.id = id
    this.onSendMessage = onSendMessage
    this.onUnhandledMessage = onUnhandledMessage
    this.sendMessageDefaultOptions = sendMessageDefaultOptions

    this.taskManager = new TaskManager()
    this.taskManager.startProcessingTasks()

    onAttachListener(this.receiveMessage.bind(this))
  }

  acknowledgeMessageReceived(message) {
    //
    // Ensure onSendMessage is always called on next tick
    //
    Promise.resolve().then(() => this.onSendMessage({
      type: this.messageTypes.ack,
      id: generateId(this.messageTypes.ack),
      payload: message.id,
      destination: message.source,
      source: this.id,
    }))
  }

  sendMessage({ id = generateId(), ...message }, sendMessageOptions) {

    message = {
      ...message,
      id,
      source: this.id,
    }

    const sendMessageTask = this.taskManager.createTask({
      ...this.sendMessageDefaultOptions,
      ...sendMessageOptions,
      id,
      metadata: {
        taskType: 'SEND_MESSAGE',
        message
      }
    })

    sendMessageTask.on('attempt', () => this.onSendMessage(message))

    //
    // Ensure onSendMessage is always called on next tick
    //
    Promise.resolve().then(() => sendMessageTask.attempt())

    return sendMessageTask
  }

  /**
   * Resolves the corresponding sendMessage task
   */
  receiveAck(message) {
    const sendMessageTask = this.taskManager.getTask(message.payload)

    if (sendMessageTask) {
      sendMessageTask.resolve()
    } else {
      this.onUnhandledMessage(message)
    }

    return true
  }

  receiveMessage(message) {
    if (message.type === this.messageTypes.ack) {
      return this.receiveAck(message)
    } else {
      this.acknowledgeMessageReceived(message)
      return false
    }
  }

  destroy() {
    this.taskManager.stopProcessingTasks()
  }
}

export const createNode = options => new Node(options)
