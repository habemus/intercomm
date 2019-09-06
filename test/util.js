export const unexpectedBehavior = message => () => {
  throw new Error('Unexpected behavior: ' + message)
}

export const shouldHaveRejected = unexpectedBehavior('Should have rejected')

export const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
