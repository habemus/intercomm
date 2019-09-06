import { EventEmitter } from 'events'
import { backoffExponential, backoffFromValues } from '../src'

import { unexpectedBehavior, wait } from './util'

describe('backoff algorithms', () => {
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

  test('backoffFromValues', () => {
    const backoff = backoffFromValues([50, 50, 60, 60, 70, 100])

    expect(backoff(0)).toEqual(50)
    expect(backoff(1)).toEqual(50)
    expect(backoff(2)).toEqual(60)
    expect(backoff(3)).toEqual(60)
    expect(backoff(4)).toEqual(70)
    expect(backoff(5)).toEqual(100)
    expect(backoff(6)).toEqual(100)
    expect(backoff(7)).toEqual(100)
  })
})
