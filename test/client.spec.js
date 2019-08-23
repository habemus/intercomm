import { createClient } from '../src'

import { shouldHaveRejected } from './util'

describe('client', () => {
  describe('client#request(method, parameters)', () => {
    test('message format', done => {
      expect.assertions(4)

      const client = createClient({
        id: 'client-1',
        onSendMessage: (type, message) => {
          expect(type).toEqual('rpc-request')
          expect(message.type).toEqual('rpc-request')
          expect(message.payload).toEqual({
            method: 'someMethod',
            parameters: ['parameter-1', 'parameter-2']
          })
          expect(message.source).toEqual('client-1')

          done()
        }
      })

      client.request('someMethod', ['parameter-1', 'parameter-2'])
    })

    test('rejects with SendMessageError error upon onSendMessage sync error', () => {
      expect.assertions(2)

      const client = createClient({
        id: 'client-1',
        onSendMessage: (type, message) => {
          throw new Error('Some API error')
        }
      })

      return client.request('someMethod', ['parameter-1', 'parameter-2'])
        .then(shouldHaveRejected, err => {
          expect(err.message).toEqual('SEND_MESSAGE_ERROR')
          expect(err.name).toEqual('SEND_MESSAGE_ERROR')
        })
    })

    test('rejects with SendMessageError error upon onSendMessage async error', () => {
      expect.assertions(2)

      const client = createClient({
        id: 'client-1',
        onSendMessage: (type, message) => {
          return new Promise((resolve, reject) => setTimeout(reject, 100))
        }
      })

      return client.request('someMethod', ['parameter-1', 'parameter-2'])
        .then(shouldHaveRejected, err => {
          expect(err.message).toEqual('SEND_MESSAGE_ERROR')
          expect(err.name).toEqual('SEND_MESSAGE_ERROR')
        })

    })

    test('rejects with timeout if the request takes too long', () => {
      expect.assertions(2)

      const client = createClient({
        id: 'client-1',
        defaultRequestTimeout: 500,
        onSendMessage: (type, message) => {}
      })

      return client.request('someMethod', [])
        .then(shouldHaveRejected, err => {
          expect(err.name).toEqual('REQUEST_TIMEOUT_ERROR')
          expect(err.message).toEqual('REQUEST_TIMEOUT_ERROR')
        })
    })
  })

  describe('client#receiveMessage(message)', () => {
    test('resolves pending request', () => {
      expect.assertions(2)

      const client = createClient({
        onSendMessage: (type, message) => {}
      })

      setTimeout(() => {
        client.receiveMessage({
          id: 'message-id',
          type: 'response',
          payload: {
            requestId: Object.keys(client.requestManager.sentRequests)[0],
            result: 'Lorem ipsum dolor',
            isError: false,
          }
        })
      }, 100)

      return client.request('someMethod', [])
        .then(res => {
          expect(res).toEqual('Lorem ipsum dolor')
          expect(Object.keys(client.requestManager.sentRequests)).toHaveLength(0)
        })
    })

    test('rejects pending request', () => {
      expect.assertions(3)

      const client = createClient({
        onSendMessage: (type, message) => {}
      })

      setTimeout(() => {
        client.receiveMessage({
          id: 'message-id',
          type: 'response',
          payload: {
            requestId: Object.keys(client.requestManager.sentRequests)[0],
            result: {
              name: 'SomeError',
              message: 'Some error happened',
            },
            error: 'SomeError',
          }
        })
      }, 100)

      return client.request('someMethod', [])
        .then(shouldHaveRejected, err => {
          expect(err.name).toEqual('SomeError')
          expect(err.message).toEqual('Some error happened')
          expect(Object.keys(client.requestManager.sentRequests)).toHaveLength(0)
        })
    })
  })
})
