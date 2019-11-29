import { nodeIds } from '../src'

describe('nodeIds', () => {
  test('should return a set of nodeIds given a localId and a remoteId', () => {
    expect(nodeIds({ localId: 'local', remoteId: 'remote' })).toEqual({
      LOCAL_CLIENT_ID: 'local->remote/client',
      LOCAL_SERVER_ID: 'local->remote/server',
      REMOTE_CLIENT_ID: 'remote->local/client',
      REMOTE_SERVER_ID: 'remote->local/server',
    })
  })
})
