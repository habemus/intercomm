import { EventEmitter } from 'events'
import { Node, MESSAGE_TYPES } from '../src'

import { shouldHaveRejected } from './util'

describe('Node', () => {
  test('sendMessage should wait for ack to be resolved', () => {
    expect.assertions(8)

    const broker1 = new EventEmitter()
    const broker2 = new EventEmitter()

    const node1 = new Node({
      id: 'node1',
      onSendMessage: message => {
        broker1.emit('message', message)
      },
      onAttachListener: listener => broker2.on('message', message => {
        expect(message.id).toEqual(expect.any(String))
        expect(message.type).toEqual(MESSAGE_TYPES.ack)
        expect(message.payload).toEqual(expect.any(String))
        expect(message.source).toEqual('node2')

        listener(message)
      }),
    })

    const node2 = new Node({
      id: 'node2',
      onSendMessage: message => {
        broker2.emit('message', message)
      },
      onAttachListener: listener => broker1.on('message', message => {
        expect(message.id).toEqual(expect.any(String))
        expect(message.type).toEqual('test-message-type')
        expect(message.payload).toEqual({
          value: 'SOME_VALUE'
        })
        expect(message.source).toEqual('node1')

        listener(message)
      }),
    })

    return node1.sendMessage({
      type: 'test-message-type',
      payload: {
        value: 'SOME_VALUE'
      }
    })
  })
})
