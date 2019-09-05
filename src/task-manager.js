import {
  Task,
  TASK_FINISHED,
  processTask,
} from './task'

import { backoffExponential } from './backoff-algorithms'

import {
  TaskDroppedError
} from './errors'

const logTaskDropped = task => {
  console.warn('Task dropped', task)
}

export class TaskManager {
  constructor({
    tasks = {},
    backoff = backoffExponential(),
    taskProcessingInterval = 100,
    taskDefaultOptions = {},

    maxTasks = 10,
    onTaskDropped = logTaskDropped,
  } = {}) {
    /**
     * Registered tasks will be processed
     * every `taskProcessingInterval` ms
     * @type {Number}
     */
    this.taskProcessingInterval = taskProcessingInterval
    this.taskProcessingIntervalId = null

    /**
     * Backoff algorithm
     */
    this.backoff = backoff

    /**
     * Default options to be used for task creation
     */
    this.taskDefaultOptions = taskDefaultOptions

    /**
     * Map of tasks by id
     *
     * @type {Array}
     */
    this.tasks = Object.keys(tasks).reduce((acc, taskId) => {
      const taskSpec = tasks[taskId]

      return {
        ...acc,
        [taskId]: taskSpec instanceof Task ? taskSpec : new Task(taskSpec)
      }
    },{})

    /**
     * Max quantity of tasks allowed to be executed in parallel.
     * Used to avoid memory leaking.
     */
    this.maxTasks = maxTasks
    this.onTaskDropped = onTaskDropped
  }

  get taskCount() {
    return Object.keys(this.tasks).length
  }

  dropTask(taskId) {
    const task = this.getTask(taskId)

    this.onTaskDropped(task)
    task.cancel(new TaskDroppedError())
  }

  processTasks(now = Date.now()) {
    const taskIds = Object.keys(this.tasks)
    const taskCount = taskIds.length
    const toDropIds = taskIds.slice(0, taskCount - this.maxTasks)
    const toProcessIds = taskIds.slice(taskCount - this.maxTasks, taskCount)

    toDropIds.forEach(taskId => this.dropTask(taskId))
    toProcessIds.forEach(taskId => {
      processTask(this.getTask(taskId), {
        now,
        backoff: this.backoff
      })
    })
  }

  startProcessingTasks() {
    if (this.taskProcessingIntervalId === null) {
      this.taskProcessingIntervalId = setInterval(
        () => this.processTasks(),
        this.interval
      )
    }
  }

  stopProcessingTasks() {
    if (this.taskProcessingIntervalId !== null) {
      clearInterval(this.taskProcessingIntervalId)
      this.taskProcessingIntervalId = null
    }
  }

  /**
   * Registers an object representing a task.
   * The task has an id which should be used for retrieving the task
   * at a moment when it should be resolved or rejected.
   *
   * @param {String} id (optional)
   * @return {Task}
   *         - id {String[randomString]}
   *         - resolve {Function}
   *         - reject {Function}
   */
  createTask(taskOptions) {
    const task = new Task({
      ...this.taskDefaultOptions,
      ...taskOptions,
    })

    this.tasks[task.id] = task

    task.once(TASK_FINISHED, () => {
      this.tasks
      delete this.tasks[task.id]
    })

    return task
  }

  /**
   * Retrieves a task given its id
   *
   * @param  {String[randomString]} taskId
   * @return {Task}
   */
  getTask(taskId) {
    return this.tasks[taskId]
  }

  upsertTask(taskId, taskOptions) {
    return this.getTask(taskId) || this.createTask(taskOptions)
  }
}
