import { createClient } from './client'
import { createServer } from './server'
import { MESSAGE_TYPES } from './constants'
import { generateId } from './util'

export const createClientAndServer = ({ id = generateId(), ...options }) => ({
  client: createClient({ ...options, id }),
  server: createServer({ ...options, id })
})

export const createClientProxy = (client, methods) => {
  return methods.reduce((acc, methodName) => {
    return {
      ...acc,
      [methodName]: (...parameters) => client.request(methodName, parameters)
    }
  }, {})
}

export {
  MESSAGE_TYPES
}

export * from './node'
export * from './server'
export * from './client'
export * from './task-manager'
export * from './task'
