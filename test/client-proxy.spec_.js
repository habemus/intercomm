import { EventEmitter } from 'events'
import { createClient, createServer, createClientAndServer, createClientProxy } from '../src'

import { shouldHaveRejected } from './util'

describe('createClientProxy', () => {
  test('should create a proxy that makes rpc usage simpler', () => {
    expect.assertions(1)

    const messageBroker = new EventEmitter()

    const client = createClient({
      id: 'client-1',
      onSendMessage: (type, message) => messageBroker.emit(type, message),
      onAttachMessageListener: (type, listener) => messageBroker.on(type, listener),
    })

    const server = createServer({
      id: 'server-1',
      onSendMessage: (type, message) => messageBroker.emit(type, message),
      onAttachMessageListener: (type, listener) => messageBroker.on(type, listener),
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

  test('should facilitate proxying requests from one server to another', () => {
    expect.assertions(2)

    const mainBroker = new EventEmitter()
    const rendererBroker = new EventEmitter()

    const main = createClientAndServer({
      id: 'main',
      onSendMessage: (type, message) => mainBroker.emit(type, message),
      onAttachMessageListener: (type, listener) => mainBroker.on(type, listener),
      methods: {
        sum: (a, b) => {
          return a + b
        },
        multiply: (a, b) => {
          return a * b
        },
        exponentiate: (a, b) => {
          return Math.pow(a, b)
        }
      }
    })

    const renderer = createClientAndServer({
      id: 'renderer',
      onSendMessage: (type, message) => rendererBroker.emit(type, message),
      onAttachMessageListener: (type, listener) => rendererBroker.on(type, listener),
      methods: {
        ...createClientProxy(main.client, [
          // 'sum', sum is not proxied, thus not available to renderer.client
          'multiply',
          'exponentiate',
        ]),

        subtract: (a, b) => {
          return a - b
        }
      }
    })

    return Promise.all([
      renderer.client.request('multiply', [3, 3]),
      renderer.client.request('exponentiate', [3, 3]),
      renderer.client.request('subtract', [3, 3]),
    ])
    .then(results => {
      expect(results).toEqual([9, 27, 0])

      return renderer.client.request('sum', [3, 3])
    })
    .then(shouldHaveRejected, err => {
      expect(err.name).toEqual('METHOD_NOT_DEFINED_ERROR')
    })
  })
})
