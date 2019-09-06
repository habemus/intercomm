import { createClient } from '../src'

import { shouldHaveRejected, noop } from './util'

describe('client', () => {
  describe('client#request(method, parameters)', () => {
    test('message format', () => {
      expect.assertions(12)

      const sentMessages = []

      const client = createClient({
        id: 'client-1',
        serverId: 'server-1',
        onSendMessage: message => {
          sentMessages.push(message)

          if (message.type === 'request') {

            // Emulate immediate answer
            client.receiveMessage({
              id: 'response-message-id',
              type: 'response',
              payload: {
                requestId: message.payload.requestId,
                result: 'EXPECTED_RESULT',
                error: false
              }
            })
          }
        }
      })

      return client.request('someMethod', ['parameter-1', 'parameter-2'])
        .then(result => {
          expect(sentMessages).toHaveLength(2)

          const requestMessage = sentMessages[0]
          expect(requestMessage.type).toEqual('request')
          expect(requestMessage.id).toEqual(expect.any(String))
          expect(requestMessage.payload.requestId).toEqual(expect.any(String))
          expect(requestMessage.payload.method).toEqual('someMethod')
          expect(requestMessage.payload.parameters).toEqual(['parameter-1', 'parameter-2'])
          expect(requestMessage.source).toEqual('client-1')

          const ackMessage = sentMessages[1]
          expect(ackMessage.type).toEqual('ack')
          expect(ackMessage.id).toEqual(expect.any(String))
          expect(ackMessage.payload).toEqual('response-message-id')
          expect(ackMessage.source).toEqual('client-1')

          expect(result).toEqual('EXPECTED_RESULT')
        })
    })

    test('rejects with timeout if the request takes too long', () => {
      expect.assertions(1)

      const client = createClient({
        id: 'client-1',
        serverId: 'server-1',
        onSendMessage: message => {},
        defaultRequestOptions: {
          timeout: 100,
        }
      })

      return client.request('someMethod', [])
        .then(shouldHaveRejected, err => {
          expect(err.name).toEqual('TIMEOUT_ERROR')
        })
    }, 300)
  })

  describe('client#receiveMessage(message)', () => {
    test('resolves pending request', () => {
      expect.assertions(3)

      const sentMessages = []

      const client = createClient({
        serverId: 'server-1',
        onSendMessage: message => {
          sentMessages.push(message)
        }
      })

      setTimeout(() => {
        const requestMessage = sentMessages[0]

        expect(requestMessage.type).toEqual('request')

        client.receiveMessage({
          id: 'message-id',
          type: 'response',
          payload: {
            requestId: requestMessage.payload.requestId,
            result: 'EXPECTED_RESULT',
            isError: false,
          }
        })
      }, 100)

      return client.request('someMethod', [])
        .then(res => {
          expect(res).toEqual('EXPECTED_RESULT')

          //
          // Task manager should be empty
          //
          expect(client.taskManager.tasks).toEqual({})
        })
    })

    test('rejects pending request', () => {
      expect.assertions(3)

      const client = createClient({
        serverId: 'server-1',
        onSendMessage: message => {}
      })

      setTimeout(() => {
        client.receiveMessage({
          id: 'message-id',
          type: 'response',
          payload: {
            requestId: Object.keys(client.taskManager.tasks)[0],
            result: {
              name: 'SOME_ERROR',
              message: 'Some error happened',
            },
            error: 'SOME_ERROR',
          }
        })
      }, 100)

      return client.request('someMethod', [])
        .then(shouldHaveRejected, err => {
          expect(err.name).toEqual('SOME_ERROR')
          expect(err.message).toEqual('Some error happened')
          expect(client.taskManager.tasks).toEqual({})
        })
    })
  })
})
