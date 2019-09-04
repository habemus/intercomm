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
  }

  /**
   * Promise interface representing completion of the task
   */
  get promise() {
    this._promise = this._promise ? this._promise : new Promise((resolve, reject) => {
      this.once('resolved', resolve)
      this.once('rejected', reject)
    })

    return this._promise
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

  cancel(reason) {
    this.reject(new CancelError(reason))
  }

  resolve(result) {
    if (this.status !== TASK_STATUS_IDLE && this.status !== TASK_STATUS_IN_PROGRESS) {
      throw new Error('Task cannot be resolved from current status')
    }

    this.clearTimeouts()
    this.status = TASK_STATUS_RESOLVED
    this.emit(TASK_RESOLVED, result)
    this.emit(TASK_FINISHED)
  }

  reject(error) {
    if (this.status !== TASK_STATUS_IDLE && this.status !== TASK_STATUS_IN_PROGRESS) {
      throw new Error('Task cannot be rejected from current status')
    }

    this.clearTimeouts()
    this.status = TASK_STATUS_REJECTED
    this.emit(TASK_REJECTED, error)
    this.emit(TASK_FINISHED)
  }
}
