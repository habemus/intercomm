import { EventEmitter } from 'events'
import { createClient, createServer, createClientAndServer, createClientProxy } from '../src'

import { shouldHaveRejected } from './util'

describe('createClientProxy', () => {
  test('should create a proxy that makes rpc usage simpler', () => {
    expect.assertions(1)

    const messageBroker = new EventEmitter()

    const client = createClient({
      id: 'client-1',
      serverId: 'server-1',
      onSendMessage: message => messageBroker.emit('client-1/message', message),
      onAttachListener: listener => messageBroker.on('server-1/message', listener),
    })

    const server = createServer({
      id: 'server-1',
      onSendMessage: message => messageBroker.emit('server-1/message', message),
      onAttachListener: listener => messageBroker.on('client-1/message', listener),
      methods: {
        sum: (a, b) => {
          return a + b
        },
        multiply: (a, b) => {
          return a * b
        }
      }
    })

    const proxy = createClientProxy(client, ['sum', 'multiply'])

    return Promise.all([
      proxy.sum(10, 20),
      proxy.multiply(10, 20)
    ])
    .then(results => {
      expect(results).toEqual([30, 200])
    })
  })
})
