import { createClient } from './client'
import { createServer } from './server'
import { MESSAGE_TYPES, nodeIds, ipcMessageEventName } from './constants'
import { generateId } from './util'

export const createClientProxy = (client, methods) => {
  return methods.reduce((acc, methodName) => {
    return {
      ...acc,
      [methodName]: (...parameters) => client.request(methodName, parameters)
    }
  }, {})
}

export {
  MESSAGE_TYPES,
  nodeIds,
  ipcMessageEventName
}

export * from './node'
export * from './server'
export * from './client'
export * from './task-manager'
export * from './task'
export * from './backoff-algorithms'
export * from './errors'
