import { nodeIds, ipcMessageEventName } from '../src'

describe('constants', () => {
  describe('nodeIds', () => {
    test('should return a set of nodeIds given a localId and a remoteId', () => {
      expect(nodeIds({
        localId: 'some-local-id',
        remoteId: 'some-remote-id'
      }))
      .toEqual({
        LOCAL_CLIENT_ID: '[local:some-local-id]->[remote:some-remote-id]/client',
        LOCAL_SERVER_ID: '[local:some-local-id]->[remote:some-remote-id]/server',
        REMOTE_CLIENT_ID: '[local:some-remote-id]->[remote:some-local-id]/client',
        REMOTE_SERVER_ID: '[local:some-remote-id]->[remote:some-local-id]/server',
      })
    })
  })

  describe('ipcMessageEventName', () => {
    test('should generate an event name given sourceId and destinationId', () => {
      expect(ipcMessageEventName({
        sourceId: 'some-source-id',
        destinationId: 'some-destination-id'
      }))
      .toEqual('[from:some-source-id]->[to:some-destination-id]/message')
    })
  })
})
