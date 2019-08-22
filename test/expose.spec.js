import { intercomm } from '../src'

import { makeNodes, shouldHaveThrown } from './util'

describe('expose', () => {
  test('should expose specific methods to the ipc api', () => {
    expect.assertions(2)

    const {
      node1,
      node2,
    } = makeNodes(2)

    const node1LocalObject = {
      exposedMethod: () => {},
      notExposedMethod: () => {},
    }

    node1.expose(['exposedMethod'], node1LocalObject)

    expect(node1.api).toEqual({
      exposedMethod: node1LocalObject.exposedMethod
    })

    return node2.remoteExec('node1', 'notExposedMethod', [])
      .then(shouldHaveThrown, err => {
        expect(err.name).toEqual('METHOD_NOT_DEFINED')
      })
  })

  test('should throw error when attempting to expose non-function values', () => {
    const node1 = intercomm({
      id: 'node1',
      onSendMessage: message => {},
    })

    const localObject = {
      method1: () => {},
      method2: () => {},

      property: '1231203',
    }

    expect(() => {
      node1.expose([
        'method1',
        'method2',
        'property'
      ], localObject)
    }).toThrow(TypeError)
  })

  test('should prevent client-only nodes from exposing apis', () => {
    const node1 = intercomm({
      roles: ['client'],
      onSendMessage: message => {},
    })

    expect(() => {
      node1.expose(['someMethod'], {
        someMethod: function() {}
      })
    }).toThrow('server role required')
  })

  test('should allow for defining a scope for the api', () => {
    expect.assertions(2)

    const {
      node1,
      node2
    } = makeNodes(2)

    node1.expose('some-scope', ['method1', 'method2'], {
      method1: () => 'some-response-1',
      method2: () => 'some-response-2'
    })

    return Promise.all([
      node2.remoteExec('node1', 'some-scope/method1'),
      node2.remoteExec('node1', 'some-scope/method2'),
    ])
    .then(([r1, r2]) => {
      expect(r1).toEqual('some-response-1')
      expect(r2).toEqual('some-response-2')
    })
  })
})
