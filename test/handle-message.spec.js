import { intercomm } from '../src'

import { makeNodes, shouldHaveThrown } from './util'

describe('receiveMessage(message)', function () {
  test('should ignore messages whose recipients are not the node itself', () => {
    expect.assertions(1)

    const message = {
      id: 'some-message-id',
      destination: 'another-node',
      type: 'request',
      payload: {
        method: 'someMethod',
      }
    }

    const node1 = intercomm({
      id: 'node1',
      onSendMessage: message => {},
      onUnhandledMessage: unhandledMessage => {
        expect(unhandledMessage).toEqual(message)
      }
    })

    node1.expose(['someMethod'], {
      someMethod: () => {
        throw new Error('expected message to be ignored')
      }
    })

    node1.receiveMessage(message)

    return new Promise(resolve => setTimeout(resolve, 100))
  })

  test('should throw when a client-only node receives request messages', () => {
    const node1 = intercomm({
      id: 'node1',
      roles: ['client'],
      onSendMessage: message => {}
    })

    expect(() => {
      node1.receiveMessage({
        id: 'request-1',
        source: 'some-other-node',
        destination: 'node1',
        type: 'request',
        payload: {
          method: 'someMethod',
          parameters: []
        }
      })
    }).toThrow('server role required')
  })

  test('should throw when a server-only node receives response message', () => {
    const node1 = intercomm({
      id: 'node1',
      roles: ['server'],
      onSendMessage: message => {}
    })

    expect(() => {
      node1.receiveMessage({
        id: 'response-1',
        source: 'some-other-node',
        destination: 'node1',
        type: 'response',
        payload: {
          requestId: 'request-1',
        }
      })
    }).toThrow('client role required')
  })
})

