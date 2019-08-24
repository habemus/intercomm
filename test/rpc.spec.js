import { EventEmitter } from 'events'
import { createClient, createServer } from '../src'

import { shouldHaveRejected } from './util'

describe('rpc', () => {
  test('using an EventEmitter as message broker', () => {
    expect.assertions(2)

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
        'SOME-SCOPE/METHOD-1': (param1, param2) => {
          return new Promise(resolve => setTimeout(resolve.bind(null, param1 + param2)))
        }
      }
    })

    return Promise.all([
      client.request('SOME-SCOPE/METHOD-1', [100, 90]),
      client.request('HEARTBEAT'),
    ]).then(([method1Res, hearbeatRes]) => {
      expect(method1Res).toEqual(190)
      expect(hearbeatRes.id).toEqual('server-1')
    })
  })
})
