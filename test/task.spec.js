import { EventEmitter } from 'events'
import {
  Task,
  backoffExponential,
  processTask,

  TASK_STATUS_IDLE,
  TASK_STATUS_IN_PROGRESS,
  TASK_STATUS_RESOLVED,
  TASK_STATUS_REJECTED,
} from '../src'

import { unexpectedBehavior, wait } from './util'

describe('Task', () => {
  test('should generate an ID if not given one', () => {
    const task = new Task()

    expect(task.id).toEqual(expect.any(String))
  })

  test('should use the given id', () => {
    const task = new Task({
      id: 'some-task-id'
    })

    expect(task.id).toEqual('some-task-id')
  })

  describe('resolve(result)', () => {
    test('should emit `resolved` and `finished` event upon resolution', () => {
      expect.assertions(2)

      const task = new Task()

      task.on('resolved', result => expect(result).toEqual('EXPECTED_RESULT'))
      task.on('finished', (...args) => expect(args).toHaveLength(0))
      task.on('rejected', unexpectedBehavior('Should not have rejected'))

      setTimeout(() => task.resolve('EXPECTED_RESULT'), 10)

      return wait(30)
    })

    test('should throw if task has already been resolved', () => {
      const task = new Task()

      task.resolve()

      expect(() => task.resolve()).toThrow('Task cannot be resolved from current status')
    })

    test('should throw if task has already been rejected', () => {
      const task = new Task()

      task.reject()

      expect(() => task.resolve()).toThrow('Task cannot be resolved from current status')
    })
  })

  describe('reject(error)', () => {
    test('should emit `rejected` and `finished` event upon rejection', () => {
      expect.assertions(2)

      const task = new Task()

      task.on('resolved', unexpectedBehavior('Should not have resolved'))
      task.on('finished', (...args) => expect(args).toHaveLength(0))
      task.on('rejected', error => expect(error.message).toEqual('SOME_ERROR'))

      setTimeout(() => task.reject(new Error('SOME_ERROR')), 10)

      return wait(30)
    })

    test('should throw if task has already been resolved', () => {
      const task = new Task()

      task.resolve()

      expect(() => task.reject()).toThrow('Task cannot be rejected from current status')
    })

    test('should throw if task has already been rejected', () => {
      const task = new Task()

      task.reject()

      expect(() => task.reject()).toThrow('Task cannot be rejected from current status')
    })
  })

  describe('attempt()', () => {
    test('should emit `attempt` event upon calling attempt() method', () => {
      const task = new Task()

      const attempts = []

      task.on('attempt', currentAttemptNo => attempts.push(currentAttemptNo))

      task.attempt()

      return wait(30).then(() => {
        expect(attempts.map(attempt => attempt.number)).toEqual([0])
        expect(attempts[0].time).toEqual(expect.any(Number))
      })
    })

    test('should respect maxAttempts config', () => {
      const task = new Task({
        maxAttempts: 5,
      })
      const attempts = []
      const errors = []

      task.on('attempt', (currentAttemptNo, args) => {
        attempts.push(currentAttemptNo)
      })
      task.on('rejected', error => errors.push(error))

      task.attempt()
      task.attempt()
      task.attempt()
      task.attempt()
      task.attempt()

      task.attempt()

      return wait(30).then(() => {
        expect(attempts.map(attempt => attempt.number)).toEqual([0, 1, 2, 3, 4])
        expect(errors).toHaveLength(1)
        expect(errors[0].name).toEqual('MAX_ATTEMPTS_REACHED_ERROR')
      })
    })

    test('should throw if task has already been resolved', () => {
      const task = new Task()

      task.resolve()

      expect(() => task.attempt()).toThrow('Task cannot be attempted from current status')
    })

    test('should throw if task has already been rejected', () => {
      const task = new Task()

      task.reject(new Error())

      expect(() => task.attempt()).toThrow('Task cannot be attempted from current status')
    })
  })

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
  })

  describe('promise', () => {
    test('async task resolution', () => {
      expect.assertions(1)
      const task = new Task()

      setTimeout(() => task.resolve('EXPECTED_RESULT'), 100)

      return task.promise.then(result => {
        expect(result).toEqual('EXPECTED_RESULT')
      })
    })

    test('async task rejection', () => {
      expect.assertions(1)
      const task = new Task()

      setTimeout(() => task.reject(new Error('SOME_ERROR')), 100)

      return task.promise.then(
        unexpectedBehavior('Should have rejected'),
        error => expect(error.message).toEqual('SOME_ERROR')
      )
    })

    test('sync task resolution', () => {
      expect.assertions(1)
      const task = new Task()

      task.resolve('EXPECTED_RESULT')

      return task.promise.then(result => {
        expect(result).toEqual('EXPECTED_RESULT')
      })
    })

    test('sync task rejection', () => {
      expect.assertions(1)
      const task = new Task()

      task.reject(new Error('SOME_ERROR'))

      return task.promise.then(
        unexpectedBehavior('Should have rejected'),
        error => expect(error.message).toEqual('SOME_ERROR')
      )
    })

    describe('then(onSuccess, onError)', () => {
      test('should proxy then call to the promise (onSuccess)', () => {
        expect.assertions(1)
        const task = new Task()

        task.resolve('EXPECTED_RESULT')

        return expect(task).resolves.toEqual('EXPECTED_RESULT')
      })

      test('should proxy then call to the promise (onError)', () => {
        expect.assertions(1)
        const task = new Task()

        const err = new Error('SOME_ERROR')

        task.reject(err)

        return expect(task).rejects.toEqual(err)
      })
    })
  })

  describe('cancel(Error ?)', () => {
    test('resolves the task', () => {
      expect.assertions(1)
      const task = new Task()

      task.cancel()

      return expect(task).resolves.toEqual(undefined)
    })

    test('rejects the task if given an error', () => {
      expect.assertions(1)
      const task = new Task()

      const err = new Error('SOME_ERROR')

      task.cancel(err)

      return expect(task).rejects.toEqual(err)
    })
  })

  describe('new Task({ dependencies: [Task] })', () => {
    test('dependant task is rejected if any of its dependencies is rejected', () => {
      const err = new Error('SOME_ERROR')
      const dependency1 = new Task()
      const dependency2 = new Task()

      const dependant = new Task({
        dependencies: [dependency1, dependency2]
      })

      setTimeout(() => dependency1.reject(err), 100)

      return expect(dependant).rejects.toEqual(err)
    })
  })

  describe('processTask(task, { now, backoff })', () => {
    test('timeout', () => {
      const task = new Task({
        timeout: 100,
        maxAttempts: 1,
      })
      task.attempt()

      expect(task.status).toEqual(TASK_STATUS_IN_PROGRESS)
      expect(task.attempts).toHaveLength(1)

      processTask(task, {
        now: Date.now() + 100,
      })

      expect(task.attempts).toHaveLength(1)
      expect(task.status).toEqual(TASK_STATUS_REJECTED)
      expect(task.error.name).toEqual('TIMEOUT_ERROR')
    })

    describe('retry backoff', () => {
      test('backoff === 0 (fixed immediate)', () => {
        expect.assertions(7)
        const processTaskConfig = { backoff: 0 }
        const task = new Task({
          timeout: 100,
          maxAttempts: 2,
        })
        task.attempt()

        expect(task.status).toEqual(TASK_STATUS_IN_PROGRESS)
        expect(task.attempts).toHaveLength(1)

        return wait(100).then(() => {
          processTask(task, processTaskConfig)

          // Another attempt happened
          expect(task.attempts).toHaveLength(2)
          expect(task.status).toEqual(TASK_STATUS_IN_PROGRESS)

          return wait(100)
        })
        .then(() => {
          processTask(task, processTaskConfig)

          // No more attempts happened
          expect(task.attempts).toHaveLength(2)

          // Task rejected
          expect(task.status).toEqual(TASK_STATUS_REJECTED)
          expect(task.error.name).toEqual('TIMEOUT_ERROR')
        })
      })

      test('backoff > 0 (fixed delay)', () => {
        expect.assertions(9)
        const processTaskConfig = { backoff: 100 }
        const task = new Task({
          timeout: 100,
          maxAttempts: 2,
        })

        task.attempt()

        expect(task.status).toEqual(TASK_STATUS_IN_PROGRESS)
        expect(task.attempts).toHaveLength(1)

        return wait(100).then(() => {
          processTask(task, processTaskConfig)

          // Task attempt count should not have changed (backoff + timeout === 200)
          expect(task.attempts).toHaveLength(1)
          expect(task.status).toEqual(TASK_STATUS_IN_PROGRESS)

          return wait(100)
        })
        .then(() => {
          processTask(task, processTaskConfig)

          expect(task.attempts).toHaveLength(2)
          expect(task.status).toEqual(TASK_STATUS_IN_PROGRESS)

          return wait(100)
        })
        .then(() => {
          processTask(task, processTaskConfig)

          // No more attempts happened
          expect(task.attempts).toHaveLength(2)

          // Task rejected
          expect(task.status).toEqual(TASK_STATUS_REJECTED)
          expect(task.error.name).toEqual('TIMEOUT_ERROR')
        })
      })
    })
  })
})
