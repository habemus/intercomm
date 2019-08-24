import { Client } from './client'
import { Server } from './server'
import { MESSAGE_TYPES } from './constants'
import { generateId } from './util'

export const createClient = options => {
  return new Client(options)
}

export const createServer = options => {
  return new Server(options)
}

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
  Client,
  Server,
  MESSAGE_TYPES
}

export * from './request-manager'
