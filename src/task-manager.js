import { Task, TASK_FINISHED } from './task'

export class TaskManager {
  constructor(taskDefaultOptions) {
    this.taskDefaultOptions = taskDefaultOptions
    this.tasks = {}
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
  create(taskOptions) {
    const task = new Task({
      ...this.taskDefaultOptions,
      ...taskOptions,
    })

    this.tasks[task.id] = task

    task.once(TASK_FINISHED, () => {
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
  get(taskId) {
    return this.tasks[taskId]
  }

  upsert(taskId, taskOptions) {
    return this.get(taskId) || this.create(taskOptions)
  }
}
