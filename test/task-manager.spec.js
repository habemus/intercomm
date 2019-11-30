import { EventEmitter } from 'events'
import { TaskManager, TASK_STATUS_REJECTED } from '../src'

import { shouldHaveRejected, wait } from './util'

describe('TaskManager', () => {
  describe('createTask(taskOptions)', () => {
    test('should register reference to the task upon creation', () => {
      const manager = new TaskManager()

      const task = manager.createTask()

      expect(manager.tasks).toEqual({
        [task.id]: task
      })
    })

    test('should delete reference to the task upon completion', () => {
      expect.assertions(3)

      const manager = new TaskManager()

      const task = manager.createTask()

      setTimeout(() => {
        task.resolve('RESOLVED')
      }, 50)

      return task.then(result => {
        expect(result).toEqual('RESOLVED')
        expect(manager.getTask(task.id)).toEqual(undefined)
        expect(manager.tasks).toEqual({})
      })
    })

    test('should delete reference to the task upon failure (rejection)', () => {
      expect.assertions(3)

      const error = new Error('SOME ERROR')

      const manager = new TaskManager()

      const task = manager.createTask()

      setTimeout(() => {
        task.reject(error)
      }, 50)

      return task.then(shouldHaveRejected, err => {
        expect(err).toEqual(error)
        expect(manager.getTask(task.id)).toEqual(undefined)
        expect(manager.tasks).toEqual({})
      })
    })
  })

  describe('dropTask(taskId)', () => {
    test('expect task to be cancelled and removed from the task manager', () => {
      expect.assertions(3)

      const manager = new TaskManager({
        onTaskDropped: () => {}
      })

      const task1 = manager.createTask({ id: 'task1' })

      return manager.dropTask('task1').then(() => {

        expect(task1.status).toEqual(TASK_STATUS_REJECTED)
        expect(task1.error.name).toEqual('TASK_DROPPED_ERROR')
        expect(manager.taskCount).toEqual(0)
      })
    })
  })

  describe('processTasks(now ?)', () => {
    test('should process task timeout', () => {
      const manager = new TaskManager()

      const task1 = manager.createTask({ id: 'task1', timeout: 100, maxAttempts: 1 })
      const task2 = manager.createTask({ id: 'task2', timeout: 200, maxAttempts: 1 })
      const task3 = manager.createTask({ id: 'task3', timeout: 300, maxAttempts: 1 })

      task1.attempt()
      task2.attempt()
      task3.attempt()

      expect(manager.taskCount).toEqual(3)

      manager.processTasks(Date.now() + 100)
      expect(manager.taskCount).toEqual(2)

      manager.processTasks(Date.now() + 100)
      expect(manager.taskCount).toEqual(2) // No changes, as only one task timed out

      manager.processTasks(Date.now() + 200)
      expect(manager.taskCount).toEqual(1)

      manager.processTasks(Date.now() + 300)
      expect(manager.taskCount).toEqual(0)
    })

    test('should drop tasks that exceed maxTasks config', () => {
      expect.assertions(4)

      const manager = new TaskManager({
        maxTasks: 5,
        onTaskDropped: task => {
          expect(['task1', 'task2']).toContain(task.id)
        }
      })

      const task1 = manager.createTask({ id: 'task1' })
      const task2 = manager.createTask({ id: 'task2' })
      const task3 = manager.createTask({ id: 'task3' })
      const task4 = manager.createTask({ id: 'task4' })
      const task5 = manager.createTask({ id: 'task5' })
      const task6 = manager.createTask({ id: 'task6' })
      const task7 = manager.createTask({ id: 'task7' })

      expect(manager.taskCount).toEqual(7)

      return manager.processTasks().then(() => {
        expect(manager.taskCount).toEqual(5)
      })
    })
  })
})
