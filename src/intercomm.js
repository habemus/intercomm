import uuidv4 from 'uuid/v4'

import {
  RequestManager
} from './request-manager'

import {
  promiseTry,
  validateId,
  validateMethodName,
  validateEventName,
  validateParameters,

  REQUEST_MESSAGE_TYPE,
  RESPONSE_MESSAGE_TYPE,
  EVENT_MESSAGE_TYPE,

  CLIENT_ROLE,
  SERVER_ROLE,

  requireClientRole,
  requireServerRole,

  setImmediate,
  noop,
} from './util'

class SendMessageError extends Error {
  constructor(message) {
    message = typeof message === 'string' ? message : 'SEND_MESSAGE_ERROR'
    super(message)

    this.name = 'SEND_MESSAGE_ERROR'
  }
}

const defaultHandleUnhandledMessage = message => console.warn(`unhandled message`, message)

export class Intercomm {
  constructor({
    onSendMessage,
    id = uuidv4(),
    roles = [CLIENT_ROLE, SERVER_ROLE],

    defaultRequestTimeout = 1000,
    onEvent = noop,
    onUnhandledMessage = defaultHandleUnhandledMessage,
    onCustomMessageType = null,
  }) {
    validateId(id)

    if (typeof onSendMessage !== 'function' || onSendMessage.length !== 1) {
      throw new Error('invalid onSendMessage function: must be a function that takes exactly 1 argument')
    }

    this.id = id
    this.onSendMessage = onSendMessage
    this.onEvent = onEvent
    this.onUnhandledMessage = onUnhandledMessage
    this.roles = roles
    this.onCustomMessageType = onCustomMessageType

    if (roles.includes(CLIENT_ROLE)) {
      this.requestManager = new RequestManager({
        defaultRequestTimeout
      })
    }

    if (roles.includes(SERVER_ROLE)) {
      this.api = {}
    }
  }

  receiveMessage(message) {
    const {
      type,
      destination,
      payload = {},
    } = message

    validateId(destination)

    if (destination !== this.id) {
      this.onUnhandledMessage(message)
      return
    }

    switch (type) {
      case REQUEST_MESSAGE_TYPE:
        this._onRequestMessage(payload, message)
        break
      case RESPONSE_MESSAGE_TYPE:
        this._onResponseMessage(payload, message)
        break
      case EVENT_MESSAGE_TYPE:
        this._onEventMessage(payload, message)
        break
      default:
        if (this.onCustomMessageType) {
          this.onCustomMessageType(payload, message)
        } else {
          this.onUnhandledMessage(message)
        }
        break
    }
  }

  _onRequestMessage({
    method,
    parameters,
  }, {
    id: requestId,
    source
  }) {
    validateId(requestId)
    validateId(source)
    requireServerRole(this.roles)
    validateMethodName(method)
    validateParameters(parameters)

    const fn = this.api[method]

    if (typeof fn !== 'function') {
      setImmediate(() => this.sendMessage(RESPONSE_MESSAGE_TYPE, source, {
        requestId,
        result: {
          name: 'METHOD_NOT_DEFINED',
          message: `Method ${method} is not defined`,
        },
        error: 'METHOD_NOT_DEFINED'
      }))

      // setImmediate(() => this.onSendMessage({
      //   type: RESPONSE_MESSAGE_TYPE,
      //   requestId,
      //   id: uuidv4(),
      //   source: this.id,
      //   destination: source,
      //   payload: {
      //     result: {
      //       name: 'METHOD_NOT_DEFINED',
      //       message: `Method ${method} is not defined`,
      //     },
      //     error: 'METHOD_NOT_DEFINED'
      //   }
      // }))
    } else {
      promiseTry(fn, parameters)
        .then(result => {
          this.sendMessage(RESPONSE_MESSAGE_TYPE, source, {
            requestId,
            result,
            error: false
          })
          // this.onSendMessage({
          //   type: RESPONSE_MESSAGE_TYPE,
          //   requestId,
          //   id: uuidv4(),
          //   destination: source,
          //   source: this.id,
          //   payload: {
          //     result,
          //     error: false
          //   }
          // })
        }, error => {
          this.sendMessage(RESPONSE_MESSAGE_TYPE, source, {
            requestId,
            result: error,
            error: error.name || 'Error',
          })
          // this.onSendMessage({
          //   type: RESPONSE_MESSAGE_TYPE,
          //   requestId,
          //   id: uuidv4(),
          //   destination: source,
          //   source: this.id,
          //   payload: {
          //     result: error,
          //     error: error.name || 'Error',
          //   }
          // })
        })
    }
  }

  _onResponseMessage({
    requestId,
    result,
    error,
  }, message) {
    validateId(requestId)
    requireClientRole(this.roles)

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

  _onEventMessage({ name, data }, { source }) {
    this.onEvent({
      source,
      name,
      data
    })
  }

  sendMessage(...args) {
    let message

    if (typeof args[0] === 'string') {
      const [type, destination, payload] = args

      message = {
        id: uuidv4(),
        source: this.id,
        type,
        destination,
        payload,
      }
    } else {
      const { id = uuidv4() } = args[0]
      message = {
        ...args[0],
        source: this.id,
        id,
      }
    }

    return promiseTry(this.onSendMessage, [message])
      .then(
        () => undefined,
        err => {
          // Do not allow consumer to have access
          // to the error
          throw new SendMessageError(err.message)
        }
      )
  }

  remoteExec(destination, method, parameters = []) {
    validateId(destination)
    validateMethodName(method)
    validateParameters(parameters)

    const id = uuidv4()

    const request = this.requestManager.registerRequest(id)

    return this.sendMessage({
      id,
      destination,
      type: REQUEST_MESSAGE_TYPE,
      payload: {
        method,
        parameters,
      }
    })
    .then(() => request.promise)
  }

  remoteEmit(destination, name, data) {
    validateId(destination)
    validateEventName(name)

    this.sendMessage(EVENT_MESSAGE_TYPE, destination, {
      name,
      data
    })
  }

  expose(...args) {
    let scope
    let methods
    let source

    if (args.length === 3) {
      scope = args[0]
      methods = args[1]
      source = args[2]
    } else if (args.length === 2) {
      scope = false
      methods = args[0]
      source = args[1]
    }

    requireServerRole(this.roles)

    if (!Array.isArray(methods) || methods.length === 0) {
      throw new Error('methods must be a non empty array of method names')
    }

    this.api = methods.reduce((acc, methodName) => {
      validateMethodName(methodName)
      const fn = source[methodName]

      if (typeof fn !== 'function') {
        throw new TypeError(`${methodName} must refer to a function`)
      }

      const exposedMethodName = scope ? `${scope}/${methodName}` : methodName

      return {
        ...acc,
        [exposedMethodName]: fn
      }
    }, this.api)
  }
}

export const intercomm = arg => {
  return typeof arg === 'function' ?
    new Intercomm({ onSendMessage: arg }) :
    new Intercomm(arg)
}

export {
  REQUEST_MESSAGE_TYPE,
  RESPONSE_MESSAGE_TYPE,
  EVENT_MESSAGE_TYPE,

  CLIENT_ROLE,
  SERVER_ROLE,
}
