import uuidv4 from 'uuid/v4'
import { Client } from './client'
import { Server } from './server'
import { MESSAGE_TYPES } from './constants'

export const createClient = options => {
  return new Client(options)
}

export const createServer = options => {
  return new Server(options)
}

export const createClientAndServer = ({ id = uuidv4(), ...options }) => ({
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
