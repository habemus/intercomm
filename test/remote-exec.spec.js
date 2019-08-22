import { intercomm } from '../src'

import { makeNodes, shouldHaveThrown } from './util'

describe('remoteExec', () => {

  test('should require a destination as the first argument', () => {
    const node1 = intercomm({
      id: 'node1',
      onSendMessage: message => {},
    })

    expect(() => {
      node1.remoteExec(null, 'someMethod')
    }).toThrow('Invalid id: MUST be either a non-empty string or a valid number')
  })

  test('should require a method as the second argument', () => {
    const node1 = intercomm({
      id: 'node1',
      onSendMessage: message => {},
    })

    expect(() => {
      node1.remoteExec('another-node', null)
    }).toThrow('Invalid methodName: MUST be a non-empty string')
  })

  test('should send a `request` message', () => {
    expect.assertions(13)

    const node1 = intercomm({
      id: 'node1',
      onSendMessage: message => {
        expect(message.id).toEqual(expect.any(String))
        expect(message.source).toEqual('node1')
        expect(message.destination).toEqual('node2')
        expect(message.type).toEqual('request')
        expect(message.payload.method).toEqual('someMethod')
        expect(message.payload.parameters).toEqual(['param1', 'param2'])

        node2.receiveMessage(message)
      },
    })

    const node2 = intercomm({
      id: 'node2',
      onSendMessage: message => {
        expect(message.id).toEqual(expect.any(String))
        expect(message.source).toEqual('node2')
        expect(message.destination).toEqual('node1')
        expect(message.type).toEqual('response')
        expect(message.payload.result).toEqual('ok!')
        expect(message.payload.error).toEqual(false)

        node1.receiveMessage(message)
      }
    })

    node2.expose(['someMethod'], {
      someMethod: () => {
        return 'ok!'
      }
    })

    return node1
      .remoteExec('node2', 'someMethod', ['param1', 'param2'])
      .then(res => expect(res).toEqual('ok!'))
  })

  test('should execute a method defined on a remote node and allow for the api to return a promise', () => {
    expect.assertions(2)

    const {
      node1,
      node2
    } = makeNodes(2)

    // expose hello method at node2
    node2.expose(['hello'], {
      hello: function (who) {
        return new Promise(function (resolve, reject) {

          setTimeout(() => {
            resolve('hello ' + who + ' from node2')
          }, 500)
        })
      },
    })

    // execute the method on node2
    return node1.remoteExec('node2', 'hello', ['node1'])
      .then(result => {
        expect(result).toEqual('hello node1 from node2')

        // check that the sent request has been `forgotten`
        expect(Object.keys(node1.requestManager.sentRequests)).toHaveLength(0)
      })
  })

  test('should fail when executing a method that was not exposed on the remote node', () => {
    expect.assertions(2)

    const {
      node1,
      node2
    } = makeNodes(2)

    return node1.remoteExec('node2', 'methodThatDoesNotExist', [])
      .then(shouldHaveThrown, err => {
        expect(err.name).toEqual('METHOD_NOT_DEFINED')

        // check that the sent request has been `forgotten`
        expect(Object.keys(node1.requestManager.sentRequests)).toHaveLength(0)
      })
  })

  test('should fail when remote node throws an error', () => {
    expect.assertions(3)

    const {
      node1,
      node2,
    } = makeNodes(2)

    node2.expose(['throwErrorMethod'], {
      throwErrorMethod: () => {
        throw new TypeError('some type error')
      },
    })

    return node1.remoteExec('node2', 'throwErrorMethod')
      .then(shouldHaveThrown, err => {
        expect(err.name).toEqual('TypeError')
        expect(err.message).toEqual('some type error')

        // check that the sent request has been `forgotten`
        expect(Object.keys(node1.requestManager.sentRequests)).toHaveLength(0)
      })
  })

  test('should impose the request timeout', () => {
    expect.assertions(4)

    const defaultRequestTimeout = 500
    const {
      node1,
      node2
    } = makeNodes(2, {
      defaultRequestTimeout,
      onUnhandledMessage: message => {
        expect(message.type).toEqual('response')
        expect(message.payload.result).toEqual('hello node1 from node2')
      }
    })

    // expose hello method at node2
    node2.expose(['hello'], {
      hello: function (who) {
        return new Promise(resolve => {

          setTimeout(() => {
            resolve('hello ' + who + ' from node2')
          }, defaultRequestTimeout + 100)
        })
      }
    })

    // execute the method on node2
    return node1.remoteExec('node2', 'hello', ['node1'])
      .then(shouldHaveThrown, err => {
        expect(err.name).toEqual('REQUEST_TIMEOUT')

        // check that the sent request has been `forgotten`
        expect(Object.keys(node1.requestManager.sentRequests)).toHaveLength(0)

        // Delay the test so that the onUnhandledMessage callback is executed
        return new Promise(resolve => setTimeout(resolve, 200))
      })
  })

  test('should handle synchronous errors in `onSendMessage` method', () => {
    expect.assertions(1)

    const node1 = intercomm({
      id: 'node1',
      onSendMessage: message => {
        throw new Error('error sending message')
      },
    })

    // try to execute some method,
    // but the onSendMessage will fail execution
    return node1.remoteExec('some-other-node', 'someMethod')
      .then(shouldHaveThrown, err => {
        expect(err.name).toEqual('SEND_MESSAGE_ERROR')
      })
  })

  test('should handle asynchronous errors in `onSendMessage` method', () => {
    expect.assertions(1)

    const node1 = intercomm({
      id: 'node1',
      onSendMessage: message => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            reject(new Error('error sending message'))
          }, 500)
        })
      },
    })

    // try to execute some method,
    // but the onSendMessage will fail execution
    return node1.remoteExec('some-other-node', 'someMethod')
      .then(shouldHaveThrown, err => {
        expect(err.name).toEqual('SEND_MESSAGE_ERROR')
      })
  })
})
