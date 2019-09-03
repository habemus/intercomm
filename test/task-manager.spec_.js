import { EventEmitter } from 'events'
import { TaskManager } from '../src'

import { shouldHaveRejected } from './util'

describe('TaskManager', () => {
  // test('should register reference to the task upon creation', () => {
  //   const manager = new TaskManager()

  //   const task = manager.create()

  //   expect(manager.tasks).toEqual({
  //     [task.id]: task,
  //   })
  // })

  // test('should delete reference to the task upon completion', () => {
  //   expect.assertions(3)

  //   const manager = new TaskManager()

  //   const task = manager.create(() => setTimeout(() => {
  //     task.resolve('RESOLVED')
  //   }, 500))

  //   return task.attempt().then(result => {
  //     expect(result).toEqual('RESOLVED')
  //     expect(manager.get(task.id)).toEqual(undefined)
  //     expect(manager.tasks).toEqual({})
  //   })
  // })

  // test('should delete reference to the task upon failure (rejection)', () => {
  //   expect.assertions(3)

  //   const error = new Error('SOME ERROR')

  //   const manager = new TaskManager()

  //   const task = manager.create(() => setTimeout(() => {
  //     task.reject(error)
  //   }, 500))

  //   return task.attempt().then(shouldHaveRejected, err => {
  //     expect(err).toEqual(error)
  //     expect(manager.get(task.id)).toEqual(undefined)
  //     expect(manager.tasks).toEqual({})
  //   })
  // })
})
