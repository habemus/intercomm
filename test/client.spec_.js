import { createClient } from '../src'

import { shouldHaveRejected, noop } from './util'

describe('client', () => {
  describe('client#request(method, parameters)', () => {
    test('message format', () => {
      expect.assertions(5)

      const client = createClient({
        id: 'client-1',
        onSendMessage: message => {
          expect(message.type).toEqual('rpc-request')
          expect(message.id).toEqual(expect.any(String))
          expect(message.payload).toEqual({
            method: 'someMethod',
            parameters: ['parameter-1', 'parameter-2']
          })
          expect(message.source).toEqual('client-1')

          client.receiveMessage({
            id: 'response-message-id',
            type: 'rpc-response',
            payload: {
              requestId: message.id,
              result: 'Hey',
              error: false
            }
          })
        }
      })

      return client.request('someMethod', ['parameter-1', 'parameter-2'])
        .then(result => {
          expect(result).toEqual('Hey')
        })
    })

    test('rejects with timeout if the request takes too long', () => {
      expect.assertions(2)

      const client = createClient({
        id: 'client-1',
        defaultRequestTimeout: 100,
        onSendMessage: message => {}
      })

      return client.request('someMethod', [])
        .then(shouldHaveRejected, err => {
          expect(err.name).toEqual('REQUEST_TIMEOUT_ERROR')
          expect(err.message).toEqual('REQUEST_TIMEOUT_ERROR')
        })
    })
  })

  describe.skip('client#receiveMessage(message)', () => {
    test('resolves pending request', () => {
      expect.assertions(2)

      const client = createClient({
        onSendMessage: message => {}
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
        onSendMessage: message => {}
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
