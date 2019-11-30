import { EventEmitter } from 'events'
import { createClient, createServer, TaskDroppedError } from '../src'

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

      throw error
    })
  })

  describe('stress', () => {

    const broker1 = new EventEmitter()
    const broker2 = new EventEmitter()

    let client
    let server

    beforeEach(() => {
      const noop = () => {}
      const onUnhandledMessage = noop
      const taskManagerOptions = {
        maxTasks: 10,
        onTaskDropped: noop
      }

      client = createClient({
        id: 'client-1',
        serverId: 'server-1',
        onSendMessage: message => setTimeout(() => {
          broker1.emit('message', message)
        }, 50),
        onAttachListener: listener => broker2.on('message', listener),
        taskManagerOptions,
        onUnhandledMessage
      })

      server = createServer({
        id: 'server-1',
        onSendMessage: message => setTimeout(() => {
          broker2.emit('message', message)
        }, 50),
        onAttachListener: listener => broker1.on('message', listener),
        methods: {
          'SOME-SCOPE/METHOD-1': (param1, param2) => {
            return new Promise(resolve => setTimeout(
              resolve.bind(null, param1 + param2),
              100
            ))
          }
        },
        taskManagerOptions,
        onUnhandledMessage
      })
    })

    test('within limit', () => {
      expect.assertions(2)

      const promise = Promise.all([
        client.request('SOME-SCOPE/METHOD-1', [100, 10]),
        client.request('SOME-SCOPE/METHOD-1', [100, 20]),
        client.request('SOME-SCOPE/METHOD-1', [100, 30]),
        client.request('SOME-SCOPE/METHOD-1', [100, 40]),
        client.request('SOME-SCOPE/METHOD-1', [100, 50]),
        // maxTasks at 10 means at most 5 messages in parallell
        //
        // client.request('SOME-SCOPE/METHOD-1', [100, 90]),
        // client.request('SOME-SCOPE/METHOD-1', [100, 90]),
        // client.request('SOME-SCOPE/METHOD-1', [100, 90]),
        // client.request('SOME-SCOPE/METHOD-1', [100, 90]),
        // client.request('SOME-SCOPE/METHOD-1', [100, 90]),
      ])
      .then(results => {
        expect(results).toEqual([110, 120, 130, 140, 150])
      })

      expect(client.taskManager.taskCount).toEqual(10)

      return promise
    })

    test('exceed limit', () => {
      expect.assertions(6)

      const req_1  = client.request('SOME-SCOPE/METHOD-1', [100, 10])
      const req_2  = client.request('SOME-SCOPE/METHOD-1', [100, 20])
      const req_3  = client.request('SOME-SCOPE/METHOD-1', [100, 30])
      const req_4  = client.request('SOME-SCOPE/METHOD-1', [100, 40])
      const req_5  = client.request('SOME-SCOPE/METHOD-1', [100, 50])
      // maxTasks at 10 means at most 5 messages in parallell

      const req_6  = client.request('SOME-SCOPE/METHOD-1', [100, 60])
      const req_7  = client.request('SOME-SCOPE/METHOD-1', [100, 70])
      const req_8  = client.request('SOME-SCOPE/METHOD-1', [100, 80])
      const req_9  = client.request('SOME-SCOPE/METHOD-1', [100, 90])
      const req_10 = client.request('SOME-SCOPE/METHOD-1', [100, 100])

      return Promise.all([
        Promise.all([req_6, req_7, req_8, req_9, req_10]).then(results => {
          expect(results).toEqual([160, 170, 180, 190, 200])
        }),
        expect(req_1).rejects.toBeInstanceOf(TaskDroppedError),
        expect(req_2).rejects.toBeInstanceOf(TaskDroppedError),
        expect(req_3).rejects.toBeInstanceOf(TaskDroppedError),
        expect(req_4).rejects.toBeInstanceOf(TaskDroppedError),
        expect(req_5).rejects.toBeInstanceOf(TaskDroppedError),
      ])
    })
  })
})
