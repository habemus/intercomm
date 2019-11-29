export const nodeIds = ({
  localId,
  remoteId,
}) => ({
  LOCAL_CLIENT_ID: `${localId}->${remoteId}/client`,
  LOCAL_SERVER_ID: `${localId}->${remoteId}/server`,
  REMOTE_CLIENT_ID: `${remoteId}->${localId}/client`,
  REMOTE_SERVER_ID: `${remoteId}->${localId}/server`,
})
