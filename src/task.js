import { EventEmitter } from 'events'
import { generateId } from './util'
import { TimeoutError, MaxAttemptsReachedError } from './errors'
import { backoffExponential } from './backoff-algorithms'

export const TASK_ATTEMPT = 'attempt'
export const TASK_RESOLVED = 'resolved'
export const TASK_REJECTED = 'rejected'
export const TASK_CANCELLED = 'cancelled'
export const TASK_FINISHED = 'finished'

export const TASK_STATUS_IDLE = 'idle'
export const TASK_STATUS_IN_PROGRESS = 'in-progress'
export const TASK_STATUS_RESOLVED = 'resolved'
export const TASK_STATUS_REJECTED = 'rejected'

const defaultBackoff = backoffExponential()

export const processTask = (task, { now = Date.now(), backoff = defaultBackoff } = {}) => {
  const { attempts, maxAttempts, timeout } = task
  const lastAttempt = attempts[attempts.length - 1]

  switch (task.status) {
    case TASK_STATUS_IN_PROGRESS: {
      const timeSinceLastAttempt = now - lastAttempt.time
      if (timeSinceLastAttempt >= timeout) {
        if (attempts.length < maxAttempts) {
          backoff = typeof backoff === 'function'
            ? backoff(attempts.length)
            : backoff
          //
          // Should retry
          //
          if (timeSinceLastAttempt >= timeout + backoff) {
            task.attempt()
          }
        } else {
          //
          // Timeout
          //
          task.reject(new TimeoutError())
        }
      }
      break
    }
    default:
      break
  }
}

export class Task extends EventEmitter {
  constructor({
    id = generateId('task'),
    createdAt = Date.now(),
    attempts = [],
    maxAttempts = 1,
    status = TASK_STATUS_IDLE,
    timeout = 1000,
    dependencies = [],
    metadata,
  } = {}) {
    super()

    /**
     * Identifier of the task
     */
    this.id = id

    /**
     * Milliseconds for task timeout
     * @type {Number}
     */
    this.timeout = timeout

    /**
     * Attempts
     */
    this.attempts = attempts
    this.maxAttempts = maxAttempts

    /**
     * Describes the task's status:
     * - idle
     * - in-progress
     * - resolved
     * - rejected
     */
    this.status = status

    /**
     * Tasks on which this task depend on.
     *
     * If any of the dependency tasks are rejected,
     * the dependant (this) will be rejected as well.
     *
     * If the dependant task (this) is finished before
     * the dependencies, the dependency tasks are cancelled.
     */
    this.dependencies = dependencies

    this.dependencies.forEach(dep => {
      if (!(dep instanceof Task)) {
        throw new TypeError('Dependencies must be instances of Task')
      }

      dep.on('rejected', err => this.reject(err))
    })
  }

  /**
   * Promise interface representing completion of the task
   *
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get#Smart_self-overwriting_lazy_getters
   */
  get promise() {
    return this._promise = this._promise ? this._promise : new Promise((resolve, reject) => {

      switch (this.status) {
        case TASK_STATUS_RESOLVED:
          resolve(this.result)
        case TASK_STATUS_REJECTED:
          reject(this.error)
        default:
          this.once('resolved', resolve)
          this.once('rejected', reject)
      }
    })
  }

  get then() {
    return this.promise.then.bind(this.promise)
  }

  get catch() {
    return this.promise.catch.bind(this.promise)
  }

  get finally() {
    return this.promise.finally.bind(this.promise)
  }

  attempt() {
    if (this.status !== TASK_STATUS_IDLE && this.status !== TASK_STATUS_IN_PROGRESS) {
      throw new Error('Task cannot be attempted from current status')
    }

    if (this.attempts.length < this.maxAttempts) {
      const attempt = {
        number: this.attempts.length,
        time: Date.now()
      }

      this.status = TASK_STATUS_IN_PROGRESS
      this.emit(TASK_ATTEMPT, attempt)
      this.attempts = [...this.attempts, attempt]
    } else {
      this.reject(new MaxAttemptsReachedError())
    }
  }

  cancel(error = null) {
    if (this.status !== TASK_STATUS_RESOLVED &&
        this.status !== TASK_STATUS_REJECTED) {

      this.emit(TASK_CANCELLED, error)

      if (error instanceof Error) {
        this.reject(error)
      } else {
        this.resolve()
      }
    }
  }

  resolve(result) {
    if (this.status !== TASK_STATUS_IDLE &&
        this.status !== TASK_STATUS_IN_PROGRESS) {
      throw new Error('Task cannot be resolved from current status')
    }

    this.result = result
    this.status = TASK_STATUS_RESOLVED

    this.emit(TASK_RESOLVED, result)
    this.emit(TASK_FINISHED)
  }

  reject(error) {
    if (this.status !== TASK_STATUS_IDLE &&
        this.status !== TASK_STATUS_IN_PROGRESS) {
      throw new Error('Task cannot be rejected from current status')
    }

    this.error = error
    this.status = TASK_STATUS_REJECTED

    this.emit(TASK_REJECTED, error)
    this.emit(TASK_FINISHED)
  }
}
