import { EventEmitter } from 'events'
import { Request, RequestManager, exponentialBackoff } from '../src'

import { shouldHaveRejected } from './util'

describe('Request', () => {
  test('should resolve promise when resolve method is called', () => {
    const request = new Request(() => {})

    setTimeout(() => {
      request.resolve('RESPONSE')
    }, 100)

    return expect(request.promise).resolves.toEqual('RESPONSE')
  })

  test('should reject promise when reject method is called', () => {
    const err = new Error('ERROR')
    const request = new Request(() => {})

    setTimeout(() => {
      request.reject(err)
    }, 100)

    return expect(request.promise).rejects.toEqual(err)
  })

  test('should timeout', () => {
    expect.assertions(1)

    const request = new Request(() => {}, {
      timeout: 100
    })

    request.attempt()

    return request.promise.then(shouldHaveRejected, err => {
      expect(err.name).toEqual('REQUEST_TIMEOUT_ERROR')
    })
  })

  test('should retry on timeout respecting timeoutBackoff algorithm provided', () => {
    const START = Date.now()
    const attempts = []

    const timeoutBackoff = exponentialBackoff({
      initialDelay: 50,
      factor: 2
    })

    const request = new Request(() => {
      attempts.push(Date.now())

      if (attempts.length > 4) {
        request.resolve('FINALLY RESOLVED')
      }
    }, {
      timeoutBackoff,
      timeout: 10,
      timeoutMaxRetryAttempts: 5,
    })

    request.attempt()

    const expectToBeWithin = (value, min, max) => {
      expect(value).toBeGreaterThanOrEqual(min)
      expect(value).toBeLessThanOrEqual(max)
    }

    return request.promise.then(res => {
      const IMPRECISION = 50

      expect(res).toEqual('FINALLY RESOLVED')
      expect(attempts).toHaveLength(5)

      const idlePeriods = attempts.map((attempt, attemptCount) => {
        return attemptCount === 0 ?
          attempt - START : attempt - attempts[attemptCount - 1]
      })

      idlePeriods.forEach((idle, attemptCount) => {
        if (attemptCount === 0) {
          expect(idle).toBeLessThan(IMPRECISION)
        } else {
          expect(idle).toBeGreaterThanOrEqual(timeoutBackoff(attemptCount - 1))
          expect(idle).toBeLessThan(timeoutBackoff(attemptCount - 1) + IMPRECISION)
        }
      })
    })
  })
})
