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

export const unexpectedBehavior = message => () => {
  throw new Error('Unexpected behavior: ' + message)
}

export const shouldHaveRejected = unexpectedBehavior('Should have rejected')

export const createClientServerPair = () => {
  return []
}

export const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
