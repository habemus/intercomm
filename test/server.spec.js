import { createServer } from '../src'

import { shouldHaveRejected, wait } from './util'

describe('server', () => {
  test('should allow executing exposed methods', () => {
    expect.assertions(7)

    const sentMessages = []

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
      onSendMessage: message => sentMessages.push(message)
    })

    server.receiveMessage({
      id: 'message-1-id',
      type: 'request',
      source: 'client-1',
      payload: {
        requestId: 'request-1-id',
        method: 'someMethod',
        parameters: ['PARAM-1', 'PARAM-2']
      }
    })

    return wait(200).then(() => {
      expect(sentMessages).toHaveLength(2)

      const requestAckMessage = sentMessages[0]
      expect(requestAckMessage.type).toEqual('ack')
      expect(requestAckMessage.payload).toEqual('message-1-id')

      const responseMessage = sentMessages[1]
      expect(responseMessage.type).toEqual('response')
      expect(responseMessage.source).toEqual('server-1')
      expect(responseMessage.destination).toEqual('client-1')
      expect(responseMessage.payload).toEqual({
        requestId: 'request-1-id',
        method: 'someMethod',
        result: 'hey, received: PARAM-1 and PARAM-2',
        error: false
      })
    })
  })

  test('should respond with error METHOD_NOT_DEFINED_ERROR when executing methods that were not exposed', () => {
    expect.assertions(7)

    const sentMessages = []

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
      onSendMessage: message => sentMessages.push(message)
    })

    server.receiveMessage({
      id: 'message-1-id',
      type: 'request',
      source: 'client-1',
      payload: {
        requestId: 'request-1-id',
        method: 'someOtherMethod',
        parameters: []
      }
    })

    return wait(200).then(() => {
      expect(sentMessages).toHaveLength(2)

      const requestAckMessage = sentMessages[0]
      expect(requestAckMessage.type).toEqual('ack')
      expect(requestAckMessage.payload).toEqual('message-1-id')

      const responseMessage = sentMessages[1]
      expect(responseMessage.type).toEqual('response')
      expect(responseMessage.payload.requestId).toEqual('request-1-id')
      expect(responseMessage.payload.result.name).toEqual('METHOD_NOT_DEFINED_ERROR')
      expect(responseMessage.payload.error).toEqual('METHOD_NOT_DEFINED_ERROR')
    })
  })

  test('should reject if the invoked method rejects', () => {
    expect.assertions(8)
    const sentMessages = []

    const err = new Error('SOME_ERROR')

    const methods = {
      someMethod: (param1, param2) => {
        return wait(100).then(() => {
          throw err
        })
      }
    }
    const server = createServer({
      id: 'server-1',
      methods,
      onSendMessage: message => sentMessages.push(message)
    })

    server.receiveMessage({
      id: 'message-1-id',
      type: 'request',
      source: 'client-1',
      payload: {
        requestId: 'request-1-id',
        method: 'someMethod',
        parameters: []
      }
    })

    return wait(200).then(() => {
      expect(sentMessages).toHaveLength(2)

      const requestAckMessage = sentMessages[0]
      expect(requestAckMessage.type).toEqual('ack')
      expect(requestAckMessage.payload).toEqual('message-1-id')


      const responseMessage = sentMessages[1]
      expect(responseMessage.type).toEqual('response')
      expect(responseMessage.payload.requestId).toEqual('request-1-id')
      expect(responseMessage.payload.result.name).toEqual('Error')
      expect(responseMessage.payload.result.message).toEqual('SOME_ERROR')
      expect(responseMessage.payload.error).toEqual('Error')
    })
  })
})
