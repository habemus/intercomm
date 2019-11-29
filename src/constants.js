export const MESSAGE_TYPES = {
  request: 'request',
  response: 'response',
  ack: 'ack',
}

/**
 * Generates a set of node ids given a local and remote setup
 */
export const nodeIds = ({
  localId,
  remoteId,
}) => ({
  // LOCAL_CLIENT_ID: `[local:${localId}]->[remote:${remoteId}]/client`,
  LOCAL_CLIENT_ID: clientNodeId({ clientId: localId, serverId: remoteId }),
  // LOCAL_SERVER_ID: `[local:${localId}]->[remote:${remoteId}]/server`,
  LOCAL_SERVER_ID: serverNodeId({ clientId: remoteId, serverId: localId }),
  // REMOTE_CLIENT_ID: `[local:${remoteId}]->[remote:${localId}]/client`,
  REMOTE_CLIENT_ID: clientNodeId({ clientId: remoteId, serverId: localId }),
  // REMOTE_SERVER_ID: `[local:${remoteId}]->[remote:${localId}]/server`,
  REMOTE_SERVER_ID: serverNodeId({ clientId: localId, serverId: remoteId }),
})

export const serverNodeId = ({
  serverId,
  clientId
}) => `[local:${serverId}]->[remote:${clientId}]/server`

export const clientNodeId = ({
  serverId,
  clientId
}) => `[local:${clientId}]->[remote:${serverId}]/client`

/**
 * Generates an ipc message event name given source and destination ids
 */
export const ipcMessageEventName = ({
  sourceId,
  destinationId
}) => `[from:${sourceId}]->[to:${destinationId}]/message`
