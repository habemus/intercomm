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

export const noop = () => {}

const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min)) + min
}

//
// TODO: substitute for some uuid/v4 module.
//
export const generateId = () => getRandomInt(0, 9999999999)
