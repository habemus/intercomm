import { EventEmitter } from 'events'
import { generateId } from './util'
import { TimeoutError, CancelError, MaxAttemptsReachedError } from './errors'

export const TASK_ATTEMPT = 'attempt'
export const TASK_RESOLVED = 'resolved'
export const TASK_REJECTED = 'rejected'
export const TASK_FINISHED = 'finished'

export const TASK_STATUS_IDLE = 'idle'
export const TASK_STATUS_IN_PROGRESS = 'in-progress'
export const TASK_STATUS_RESOLVED = 'resolved'
export const TASK_STATUS_REJECTED = 'rejected'

export const backoffExponential = ({
  initialDelay = 100,
  factor = 2,
  maxDelay = 10000,
} = {}) => retryAttemptCount => Math.min(
  initialDelay * (factor ** retryAttemptCount),
  maxDelay
)

export const backoffFromValues = values => retryAttemptCount => values[Math.min(
  values.length - 1,
  retryAttemptCount
)]

export class Task extends EventEmitter {
  constructor({
    id = generateId(),
    maxAttempts = 1,
    timeout = 1000,
    backoff = backoffExponential(),
    dependencies = [],
    metadata,
  } = {}) {
    super()

    this.id = id
    this.maxAttempts = maxAttempts
    this.timeout = timeout
    this.backoff = Array.isArray(backoff)
      ? backoffFromValues(backoff)
      : typeof backoff === 'number'
        ? () => backoff
        : backoff
    this.metadata = metadata

    /**
     * Number of attempts
     */
    this.attemptCount = 0

    /**
     * ID that refers to the setTimeout call
     * that will timeout the current attempt
     */
    this.currentAttemptTimeoutId = null

    /**
     * ID that refers to the setTimeout call
     * that will emit a 'retry' call
     */
    this.retryBackoffTimeoutId = null

    /**
     * Describes the task's status:
     * - idle
     * - in-progress
     * - resolved
     * - rejected
     */
    this.status = TASK_STATUS_IDLE

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

  clearTimeouts() {
    if (this.currentAttemptTimeoutId) {
      clearTimeout(this.currentAttemptTimeoutId)
      this.currentAttemptTimeoutId = null
    }

    if (this.retryBackoffTimeoutId) {
      clearTimeout(this.retryBackoffTimeoutId)
      this.retryBackoffTimeoutId = null
    }
  }

  attempt(...args) {
    if (this.status !== TASK_STATUS_IDLE && this.status !== TASK_STATUS_IN_PROGRESS) {
      throw new Error('Task cannot be attempted from current status')
    }

    if (this.attemptCount < this.maxAttempts) {
      this.status = TASK_STATUS_IN_PROGRESS
      this.emit(TASK_ATTEMPT, this.attemptCount, ...args)
      this.attemptCount++
    } else {
      this.reject(new MaxAttemptsReachedError())
    }
  }

  startAttempting(...args) {
    this.clearTimeouts()
    this.attempt(...args)

    this.currentAttemptTimeoutId = setTimeout(() => {
      // current attempt timed out
      if (this.attemptCount < this.maxAttempts) {
        // retry in...
        this.retryBackoffTimeoutId = setTimeout(
          () => this.startAttempting(...args),
          this.backoff(this.attemptCount - 1)
        )
      } else {
        this.reject(new TimeoutError())
      }
    }, this.timeout)
  }

  cancel(error = null) {
    if (this.status !== TASK_STATUS_RESOLVED && this.status !== TASK_STATUS_REJECTED) {
      if (error instanceof Error) {
        this.reject(error)
      } else {
        this.resolve()
      }
    }
  }

  resolve(result) {
    if (this.status !== TASK_STATUS_IDLE && this.status !== TASK_STATUS_IN_PROGRESS) {
      throw new Error('Task cannot be resolved from current status')
    }

    this.clearTimeouts()
    this.result = result
    this.status = TASK_STATUS_RESOLVED

    this.emit(TASK_RESOLVED, result)
    this.emit(TASK_FINISHED)
  }

  reject(error) {
    if (this.status !== TASK_STATUS_IDLE && this.status !== TASK_STATUS_IN_PROGRESS) {
      throw new Error('Task cannot be rejected from current status')
    }

    this.clearTimeouts()
    this.error = error
    this.status = TASK_STATUS_REJECTED

    this.emit(TASK_REJECTED, error)
    this.emit(TASK_FINISHED)
  }
}
