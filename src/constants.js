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
  LOCAL_CLIENT_ID: `[local:${localId}]->[remote:${remoteId}]/client`,
  LOCAL_SERVER_ID: `[local:${localId}]->[remote:${remoteId}]/server`,
  REMOTE_CLIENT_ID: `[local:${remoteId}]->[remote:${localId}]/client`,
  REMOTE_SERVER_ID: `[local:${remoteId}]->[remote:${localId}]/server`,
})

/**
 * Generates an ipc message event name given source and destination ids
 */
export const ipcMessageEventName = ({
  sourceId,
  destinationId
}) => `[from:${sourceId}]->[to:${destinationId}]/message`
