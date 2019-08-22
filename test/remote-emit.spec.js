import { intercomm } from '../src'

import { makeNodes } from './util'

describe('remoteEmit', function () {
  test('should require eventName', function () {
    const node1 = intercomm({
      id: 'node1',
      onSendMessage: message => {}
    })

    expect(() => {
      node1.remoteEmit('node2')
    }).toThrow('Invalid eventName: MUST be a non-empty string')
  })

  test('should send an `event` message', () => {
    expect.assertions(3)

    const node = intercomm({
      onSendMessage: message => {
        expect(message.source).toEqual(node.id)
        expect(message.type).toEqual('event')
        expect(message.payload).toEqual({
          name: 'some-event',
          data: {
            key: 'value'
          }
        })
      },
    })

    node.remoteEmit('node2', 'some-event', {
      key: 'value',
    })

    return new Promise(resolve => setTimeout(resolve, 100))
  })

  test('event message should be received by `onEvent` method on the other end', () => {
    expect.assertions(1)

    const {
      node1,
      node2
    } = makeNodes(2, {
      onEvent: event => {
        expect(event).toEqual({
          source: 'node1',
          name: 'some-event',
          data: {
            key: 'some-data',
          }
        })
      }
    })

    node1.remoteEmit('node2', 'some-event', {
      key: 'some-data'
    })

    return new Promise(resolve => setTimeout(resolve, 100))
  })

})
