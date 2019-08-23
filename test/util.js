// import { createClient, createServer } from '../src'

// export const makeNodes = (count, options = {}) => {
//   const nodes = {}

//   let nodeCount = count

//   while (nodeCount > 0) {
//     const id = `node${nodeCount}`

//     nodes[id] = intercomm({
//       ...options,
//       id,
//       onSendMessage: message => nodes[message.destination].receiveMessage(message),
//     })

//     nodeCount --
//   }

//   return nodes
// }

export const shouldHaveRejected = () => {
  throw new Error('shouldHaveRejected')
}

export const createClientServerPair = () => {
  return []
}
