import { createServer } from '../src'

import { shouldHaveRejected } from './util'

describe('server', () => {
  test('should allow executing exposed methods', done => {
    expect.assertions(5)

    const methods = {
      someMethod: (param1, param2) => {
        return new Promise(resolve => {
          setTimeout(resolve.bind(null, `hey, received: ${param1} and ${param2}`), 100)
        })
      }
    }
    const server = createServer({
      id: 'server-1',
      methods,
      onSendMessage: (type, message) => {
        try {
          expect(type).toEqual('rpc-response')
          expect(message.type).toEqual('rpc-response')
          expect(message.source).toEqual('server-1')
          expect(message.destination).toEqual('client-1')
          expect(message.payload).toEqual({
            requestId: 'request-1',
            result: 'hey, received: PARAM-1 and PARAM-2',
            error: false
          })

          done()
        } catch (err) {
          done(err)
        }
      }
    })

    server.receiveMessage({
      id: 'request-1',
      type: 'request',
      source: 'client-1',
      payload: {
        method: 'someMethod',
        parameters: ['PARAM-1', 'PARAM-2']
      }
    })
  })

  test('should respons with error METHOD_NOT_DEFINED_ERROR when executing methods that were not exposed', done => {
    expect.assertions(1)

    const methods = {
      someMethod: (param1, param2) => {
        return new Promise(resolve => {
          setTimeout(resolve.bind(null, `hey, received: ${param1} and ${param2}`), 100)
        })
      }
    }
    const server = createServer({
      id: 'server-1',
      methods,
      onSendMessage: (type, message) => {
        try {
          expect(message.payload).toEqual({
            requestId: 'request-1',
            result: {
              name: 'METHOD_NOT_DEFINED_ERROR',
              message: expect.any(String),
            },
            error: 'METHOD_NOT_DEFINED_ERROR',
          })

          done()
        } catch (err) {
          done(err)
        }
      }
    })

    server.receiveMessage({
      id: 'request-1',
      type: 'request',
      source: 'client-1',
      payload: {
        method: 'someOtherMethod',
        parameters: []
      }
    })
  })

  test('should reject if the invoked method rejects', done => {
    expect.assertions(1)

    const err = new Error('Some Error')

    const methods = {
      someMethod: (param1, param2) => {
        return new Promise((resolve, reject) => {
          setTimeout(reject.bind(null, err), 100)
        })
      }
    }
    const server = createServer({
      id: 'server-1',
      methods,
      onSendMessage: (type, message) => {
        try {
          expect(message.payload).toEqual({
            requestId: 'request-1',
            result: err,
            error: 'Error',
          })

          done()
        } catch (err) {
          done(err)
        }
      }
    })

    server.receiveMessage({
      id: 'request-1',
      type: 'request',
      source: 'client-1',
      payload: {
        method: 'someMethod',
        parameters: []
      }
    })
  })
})
