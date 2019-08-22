export const promiseTry = (fn, args = []) => {
  return new Promise((resolve, reject) => {
    try {
      resolve(fn.apply(null, args))
    } catch (err) {
      reject(err)
    }
  })
}

const isValidId = id => {
  switch (typeof id) {
    case 'string':
      return id !== ''
    case 'number':
      return !Number.isNaN(id)
    default:
      return false
  }
}

export const validateId = id => {
  if (!isValidId(id)) {
    throw new Error('Invalid id: MUST be either a non-empty string or a valid number')
  }
}

export const validateMethodName = methodName => {
  if (typeof methodName !== 'string' && methodName !== '') {
    throw new Error('Invalid methodName: MUST be a non-empty string')
  }
}

export const validateEventName = eventName => {
  if (typeof eventName !== 'string' && eventName !== '') {
    throw new Error('Invalid eventName: MUST be a non-empty string')
  }
}

export const validateParameters = parameters => {
  if (!Array.isArray(parameters)) {
    throw new Error('Invalid parameters: MUST be an array')
  }
}

export const REQUEST_MESSAGE_TYPE = 'request'
export const RESPONSE_MESSAGE_TYPE = 'response'
export const EVENT_MESSAGE_TYPE = 'event'

export const CLIENT_ROLE = 'client'
export const SERVER_ROLE = 'server'

export const requireClientRole = roles => {
  if (!roles.includes(CLIENT_ROLE)) {
    throw new Error(`${CLIENT_ROLE} role required`)
  }
}

export const requireServerRole = roles => {
  if (!roles.includes(SERVER_ROLE)) {
    throw new Error(`${SERVER_ROLE} role required`)
  }
}

export const setImmediate = setImmediate ? setImmediate : fn => setTimeout(fn, 0)

export const noop = () => {}
