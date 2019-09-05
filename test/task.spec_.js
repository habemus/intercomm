import { EventEmitter } from 'events'
import { Task, backoffExponential } from '../src'

import { unexpectedBehavior, wait } from './util'

const expectToBeWithin = (value, min, max) => {
  expect(value).toBeGreaterThanOrEqual(min)
  expect(value).toBeLessThanOrEqual(max)
}

const expectValuesToBeWithin = (values, ranges) => {
  expect(values).toHaveLength(ranges.length)
  values.forEach((value, index) => expectToBeWithin(
    value,
    ranges[index][0],
    ranges[index][1]
  ))
}

const expectValuesToBeCloseTo = (values, targetValues, imprecision = 20) => {
  expectValuesToBeWithin(
    values,
    targetValues.map(targetValue => [
      targetValue - imprecision,
      targetValue + imprecision
    ])
  )
}

const computeDiffs = (start, values) => values.map((value, index) => {
  return index === 0
    ? value - start
    : value - values[index - 1]
})

const recordTaskEvents = task => {

  const attempts = []
  const errors = []
  const results = []

  task.on('attempt', currentAttemptNo => {
    attempts.push({
      currentAttemptNo,
      time: Date.now(),
    })
  })
  task.on('rejected', error => errors.push({
    error,
    time: Date.now()
  }))
  task.on('resolved', result => results.push({
    result,
    time: Date.now(),
  }))

  return {
    attempts,
    errors,
    results,
  }
}

describe('Task', () => {
  // test('should generate an ID if not given one', () => {
  //   const task = new Task()

  //   expect(task.id).toEqual(expect.any(String))
  // })

  // test('should use the given id', () => {
  //   const task = new Task({
  //     id: 'some-task-id'
  //   })

  //   expect(task.id).toEqual('some-task-id')
  // })

  // describe('resolve(result)', () => {
  //   test('should emit `resolved` and `finished` event upon resolution', () => {
  //     expect.assertions(2)

  //     const task = new Task()

  //     task.on('resolved', result => expect(result).toEqual('EXPECTED_RESULT'))
  //     task.on('finished', (...args) => expect(args).toHaveLength(0))
  //     task.on('rejected', unexpectedBehavior('Should not have rejected'))

  //     setTimeout(() => task.resolve('EXPECTED_RESULT'), 10)

  //     return wait(30)
  //   })

  //   test('should throw if task has already been resolved', () => {
  //     const task = new Task()

  //     task.resolve()

  //     expect(() => task.resolve()).toThrow('Task cannot be resolved from current status')
  //   })

  //   test('should throw if task has already been rejected', () => {
  //     const task = new Task()

  //     task.reject()

  //     expect(() => task.resolve()).toThrow('Task cannot be resolved from current status')
  //   })
  // })

  // describe('reject(error)', () => {
  //   test('should emit `rejected` and `finished` event upon rejection', () => {
  //     expect.assertions(2)

  //     const task = new Task()

  //     task.on('resolved', unexpectedBehavior('Should not have resolved'))
  //     task.on('finished', (...args) => expect(args).toHaveLength(0))
  //     task.on('rejected', error => expect(error.message).toEqual('SOME_ERROR'))

  //     setTimeout(() => task.reject(new Error('SOME_ERROR')), 10)

  //     return wait(30)
  //   })

  //   test('should throw if task has already been resolved', () => {
  //     const task = new Task()

  //     task.resolve()

  //     expect(() => task.reject()).toThrow('Task cannot be rejected from current status')
  //   })

  //   test('should throw if task has already been rejected', () => {
  //     const task = new Task()

  //     task.reject()

  //     expect(() => task.reject()).toThrow('Task cannot be rejected from current status')
  //   })
  // })

  // describe('attempt(...args)', () => {
  //   test('should emit `attempt` event upon calling attempt() method', () => {
  //     const task = new Task()

  //     const attempts = []

  //     task.on('attempt', currentAttemptNo => attempts.push(currentAttemptNo))

  //     task.attempt()

  //     return wait(30).then(() => {
  //       expect(attempts).toEqual([0])
  //     })
  //   })

  //   test('should respect maxAttempts config', () => {
  //     const task = new Task({
  //       maxAttempts: 5,
  //     })
  //     const attempts = []
  //     const errors = []

  //     task.on('attempt', (currentAttemptNo, args) => {
  //       attempts.push(currentAttemptNo)
  //     })
  //     task.on('rejected', error => errors.push(error))

  //     task.attempt()
  //     task.attempt()
  //     task.attempt()
  //     task.attempt()
  //     task.attempt()

  //     task.attempt()

  //     return wait(30).then(() => {
  //       expect(attempts).toEqual([0, 1, 2, 3, 4])
  //       expect(errors).toHaveLength(1)
  //       expect(errors[0].name).toEqual('MAX_ATTEMPTS_REACHED_ERROR')
  //     })
  //   })

  //   test('should throw if task has already been resolved', () => {
  //     const task = new Task()

  //     task.resolve()

  //     expect(() => task.attempt()).toThrow('Task cannot be attempted from current status')
  //   })

  //   test('should throw if task has already been rejected', () => {
  //     const task = new Task()

  //     task.reject(new Error())

  //     expect(() => task.attempt()).toThrow('Task cannot be attempted from current status')
  //   })
  // })

  // describe('backoff algorithms', () => {
  //   test('backoffExponential', () => {
  //     const backoff = backoffExponential({
  //       initialDelay: 50,
  //       factor: 2,
  //       maxDelay: 1000
  //     })

  //     expect([0, 1, 2, 3, 4, 5, 6].map(backoff)).toEqual([
  //       50,
  //       100,
  //       200,
  //       400,
  //       800,
  //       1000,
  //       1000
  //     ])
  //   })
  // })

  describe('startAttempting(...args)', () => {
    test('retry with no backoff (backoff = 0)', () => {
      const TIMEOUT = 50
      const TIMEOUT_IMPRECISION = 20

      const task = new Task({
        maxAttempts: 5,
        timeout: TIMEOUT,
        backoff: 0,
      })

      const { attempts, errors, results } = recordTaskEvents(task)

      const start = Date.now()
      task.startAttempting()

      return wait(500).then(() => {
        const timeDiffs = computeDiffs(start, [
          ...attempts.map(attempt => attempt.time),
          ...errors.map(error => error.time),
        ])

        expectValuesToBeCloseTo(timeDiffs, [
          0,
          TIMEOUT,
          TIMEOUT,
          TIMEOUT,
          TIMEOUT,
          TIMEOUT,
        ], TIMEOUT_IMPRECISION)

        expect(attempts).toHaveLength(5)
        expect(errors).toHaveLength(1)
        expect(errors[0].error.name).toEqual('TIMEOUT_ERROR')
        expect(results).toHaveLength(0)
        expect(task.status).toEqual('rejected')
      })
    })

    test('retry with list-based backoff', () => {
      const TIMEOUT = 50
      const TIMEOUT_IMPRECISION = 20
      const BACKOFF = [50, 100, 150, 200]
      const MAX_ATTEMPTS = 5

      const task = new Task({
        maxAttempts: MAX_ATTEMPTS,
        timeout: TIMEOUT,
        backoff: BACKOFF
      })

      const { attempts, errors, results } = recordTaskEvents(task)

      const start = Date.now()
      task.startAttempting()

      return wait(2000).then(() => {
        const timeDiffs = computeDiffs(start, [
          ...attempts.map(attempt => attempt.time),
          ...errors.map(error => error.time),
        ])

        expectValuesToBeWithin(timeDiffs, [
          // Immediate attempt
          [0, TIMEOUT_IMPRECISION],

          // Retry attempts
          ...BACKOFF.map(attemptBackoff => [
            TIMEOUT + attemptBackoff,
            TIMEOUT + attemptBackoff + TIMEOUT_IMPRECISION,
          ]),

          // Error
          [0, TIMEOUT + TIMEOUT_IMPRECISION]
        ])

        expect(attempts).toHaveLength(5)
        expect(errors).toHaveLength(1)
        expect(errors[0].error.name).toEqual('TIMEOUT_ERROR')
        expect(results).toHaveLength(0)
        expect(task.status).toEqual('rejected')
      })
    })

    test('retry with backoffExponential', () => {
      const TIMEOUT = 50
      const TIMEOUT_IMPRECISION = 20
      const BACKOFF = backoffExponential({
        initialDelay: 50,
        factor: 2,
        maxDelay: 1000
      })
      const MAX_ATTEMPTS = 5

      const task = new Task({
        maxAttempts: MAX_ATTEMPTS,
        timeout: TIMEOUT,
        backoff: BACKOFF
      })

      const { attempts, errors, results } = recordTaskEvents(task)

      const start = Date.now()
      task.startAttempting()

      return wait(2000).then(() => {
        const timeDiffs = computeDiffs(start, [
          ...attempts.map(attempt => attempt.time),
          ...errors.map(error => error.time),
        ])

        expectValuesToBeWithin(timeDiffs, [
          // Immediate attempt
          [0, TIMEOUT_IMPRECISION],

          // Retry attempts
          ...[0, 1, 2, 3].map(retryAttemptNo => [
            TIMEOUT + BACKOFF(retryAttemptNo),
            TIMEOUT + BACKOFF(retryAttemptNo) + TIMEOUT_IMPRECISION
          ]),

          // Error
          [0, TIMEOUT + TIMEOUT_IMPRECISION]
        ])

        expect(results).toHaveLength(0)
        expect(task.status).toEqual('rejected')
      })
    })

    describe('resolve(result)', () => {
      test('task should emit `resolved` event upon resolution and no further attempts should be made', () => {
        const TIMEOUT = 50
        const TIMEOUT_IMPRECISION = 20
        const BACKOFF = [50, 100, 150, 200]
        const MAX_ATTEMPTS = 5

        const task = new Task({
          maxAttempts: MAX_ATTEMPTS,
          timeout: TIMEOUT,
          backoff: BACKOFF
        })

        const { attempts, errors, results } = recordTaskEvents(task)

        const start = Date.now()
        task.startAttempting()

        const RESOLVE_IN = 200

        return wait(RESOLVE_IN).then(() => {
          task.resolve('EXPECTED_RESULT')

          return wait(1000)
        })
        .then(() => {
          const timeDiffs = computeDiffs(start, [
            ...attempts.map(attempt => attempt.time),
            ...results.map(result => result.time)
          ])

          expectValuesToBeCloseTo(timeDiffs, [
            // Immediate attempt
            0,

            // Retries
            TIMEOUT + BACKOFF[0],

            // Result
            start + RESOLVE_IN - attempts[attempts.length - 1].time,
          ])

          expect(attempts).toHaveLength(2)
          expect(errors).toHaveLength(0)
          expect(results).toHaveLength(1)
          expect(results[0].result).toEqual('EXPECTED_RESULT')
        })
      })
    })

    describe('reject(error)', () => {
      test('task should emit `rejected` event upon rejection and no further attempts should be made', () => {
        const TIMEOUT = 50
        const TIMEOUT_IMPRECISION = 20
        const BACKOFF = [50, 100, 150, 200]
        const MAX_ATTEMPTS = 5

        const task = new Task({
          maxAttempts: MAX_ATTEMPTS,
          timeout: TIMEOUT,
          backoff: BACKOFF
        })

        const { attempts, errors, results } = recordTaskEvents(task)

        const start = Date.now()
        task.startAttempting()

        const REJECT_IN = 200

        return wait(REJECT_IN).then(() => {
          task.reject(new Error('SOME_ERROR'))

          return wait(1000)
        })
        .then(() => {
          const timeDiffs = computeDiffs(start, [
            ...attempts.map(attempt => attempt.time),
            ...errors.map(result => result.time)
          ])

          expectValuesToBeCloseTo(timeDiffs, [
            // Immediate attempt
            0,

            // Retry attempts
            TIMEOUT + BACKOFF[0],

            // Rejection
            start + REJECT_IN - attempts[attempts.length - 1].time,
          ])

          expect(attempts).toHaveLength(2)
          expect(errors).toHaveLength(1)
          expect(errors[0].error.message).toEqual('SOME_ERROR')
          expect(results).toHaveLength(0)
        })
      })
    })
  })

  // describe('promise', () => {
  //   test('async task resolution', () => {
  //     expect.assertions(1)
  //     const task = new Task()

  //     setTimeout(() => task.resolve('EXPECTED_RESULT'), 100)

  //     return task.promise.then(result => {
  //       expect(result).toEqual('EXPECTED_RESULT')
  //     })
  //   })

  //   test('async task rejection', () => {
  //     expect.assertions(1)
  //     const task = new Task()

  //     setTimeout(() => task.reject(new Error('SOME_ERROR')), 100)

  //     return task.promise.then(
  //       unexpectedBehavior('Should have rejected'),
  //       error => expect(error.message).toEqual('SOME_ERROR')
  //     )
  //   })

  //   test('sync task resolution', () => {
  //     expect.assertions(1)
  //     const task = new Task()

  //     task.resolve('EXPECTED_RESULT')

  //     return task.promise.then(result => {
  //       expect(result).toEqual('EXPECTED_RESULT')
  //     })
  //   })

  //   test('sync task rejection', () => {
  //     expect.assertions(1)
  //     const task = new Task()

  //     task.reject(new Error('SOME_ERROR'))

  //     return task.promise.then(
  //       unexpectedBehavior('Should have rejected'),
  //       error => expect(error.message).toEqual('SOME_ERROR')
  //     )
  //   })

  //   describe('then(onSuccess, onError)', () => {
  //     test('should proxy then call to the promise (onSuccess)', () => {
  //       expect.assertions(1)
  //       const task = new Task()

  //       task.resolve('EXPECTED_RESULT')

  //       return expect(task).resolves.toEqual('EXPECTED_RESULT')
  //     })

  //     test('should proxy then call to the promise (onError)', () => {
  //       expect.assertions(1)
  //       const task = new Task()

  //       const err = new Error('SOME_ERROR')

  //       task.reject(err)

  //       return expect(task).rejects.toEqual(err)
  //     })
  //   })
  // })

  // describe('cancel(Error ?)', () => {
  //   test('resolves the task', () => {
  //     expect.assertions(1)
  //     const task = new Task()

  //     task.cancel()

  //     return expect(task).resolves.toEqual(undefined)
  //   })

  //   test('rejects the task if given an error', () => {
  //     expect.assertions(1)
  //     const task = new Task()

  //     const err = new Error('SOME_ERROR')

  //     task.cancel(err)

  //     return expect(task).rejects.toEqual(err)
  //   })
  // })

  // describe('new Task({ dependencies: [Task] })', () => {
  //   test('dependant task is rejected if any of its dependencies is rejected', () => {
  //     const err = new Error('SOME_ERROR')
  //     const dependency1 = new Task()
  //     const dependency2 = new Task()

  //     const dependant = new Task({
  //       dependencies: [dependency1, dependency2]
  //     })

  //     setTimeout(() => dependency1.reject(err), 100)

  //     return expect(dependant).rejects.toEqual(err)
  //   })
  // })
})
