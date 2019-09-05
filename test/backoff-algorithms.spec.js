import { EventEmitter } from 'events'
import { backoffExponential } from '../src'

import { unexpectedBehavior, wait } from './util'

describe('backoffExponential', () => {
  test('backoffExponential', () => {
    const backoff = backoffExponential({
      initialDelay: 50,
      factor: 2,
      maxDelay: 1000
    })

    expect([0, 1, 2, 3, 4, 5, 6].map(backoff)).toEqual([
      50,
      100,
      200,
      400,
      800,
      1000,
      1000
    ])
  })
})
