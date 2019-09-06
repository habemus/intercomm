import { EventEmitter } from 'events'
import { createClient, createServer } from '../src'

import { shouldHaveRejected } from './util'

describe('rpc', () => {
  test('using an EventEmitter as message broker', () => {
    expect.assertions(1)

    const broker1 = new EventEmitter()
    const broker2 = new EventEmitter()

    const client = createClient({
      id: 'client-1',
      serverId: 'server-1',
      onSendMessage: message => broker1.emit('message', message),
      onAttachListener: listener => broker2.on('message', listener),
    })

    const server = createServer({
      id: 'server-1',
      onSendMessage: message => broker2.emit('message', message),
      onAttachListener: listener => broker1.on('message', listener),
      methods: {
        'SOME-SCOPE/METHOD-1': (param1, param2) => {
          return new Promise(resolve => setTimeout(
            resolve.bind(null, param1 + param2),
            100
          ))
        }
      }
    })

    return client.request('SOME-SCOPE/METHOD-1', [100, 90]).then(result => {
      expect(result).toEqual(190)
    }, error => {
      console.log(error)
    })
  })
})
