import { generateId } from './util'
import { RequestTimeoutError } from './errors'

const DEFAULT_MAX_DELAY = 10000
const DEFAULT_INITIAL_DELAY = 100

export const exponentialBackoff = ({
  initialDelay = DEFAULT_INITIAL_DELAY,
  maxDelay = DEFAULT_MAX_DELAY,
  factor = 2,
} = {}) => currentAttemptCount => Math.min(
  initialDelay * factor ** currentAttemptCount,
  maxDelay
)

export const linearBackoff = ({
  initialDelay = DEFAULT_INITIAL_DELAY,
  maxDelay = DEFAULT_MAX_DELAY
} = {}) => currentAttemptCount => Math.min(
  initialDelay * (currentAttemptCount + 1),
  maxDelay
)

export class Request {
  constructor(fn, {
    id = generateId(),
    timeout = 1000,
    timeoutMaxRetryAttempts = 0,
    timeoutBackoff = exponentialBackoff()
  } = {}) {
    if (typeof fn !== 'function') {
      throw new Error(`Invalid request function ${fn}`)
    }

    this.fn = fn
    this.id = id

    this.timeoutRetryAttemptCount = 0
    this.timeoutMaxRetryAttempts = timeoutMaxRetryAttempts
    this.timeoutBackoff = timeoutBackoff

    this.timeout = timeout
    this.timeoutId = null

    this.promise = new Promise((_resolve, _reject) => {
      this.resolve = result => {
        clearTimeout(this.timeoutId)
        _resolve(result)
      }

      this.reject = err => {
        clearTimeout(this.timeoutId)
        _reject(err)
      }
    })
  }

  attempt() {
    clearTimeout(this.timeoutId)
    this.timeoutId = setTimeout(() => {
      if (this.timeoutRetryAttemptCount < this.timeoutMaxRetryAttempts) {
        setTimeout(() => {
          this.attempt()
          ++this.timeoutRetryAttemptCount
        }, this.timeoutBackoff(this.timeoutRetryAttemptCount))
      } else {
        this.reject(new RequestTimeoutError())
      }
    }, this.timeout)

    return this.fn()
  }
}

export class RequestManager {
  constructor({
    timeout,
    timeoutMaxRetryAttempts = 5,
  }) {
    this.timeout = timeout
    this.timeoutMaxRetryAttempts = timeoutMaxRetryAttempts
    this.sentRequests = {}
  }

  /**
   * Registers an object representing a request.
   * The request has an id which should be used for retrieving the request
   * at a moment when it should be resolved or rejected.
   *
   * @param {String} id (optional)
   * @return {Request}
   *         - id {String[randomString]}
   *         - resolve {Function}
   *         - reject {Function}
   */
  createRequest(fn, {
    timeout = this.timeout,
    timeoutMaxRetryAttempts = this.timeoutMaxRetryAttempts,
    ...requestOptions
  } = {}) {
    const request = new Request(fn, {
      timeout,
      timeoutMaxRetryAttempts,
      ...requestOptions,
    })

    const eraseRequest = () => {
      delete this.sentRequests[request.id]
    }

    //
    // When request is either resolved or rejected, erase the request
    // from the `sentRequests` object.
    //
    // TODO: whenever available, use promise.finally
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/finally
    //
    request.promise.then(
      eraseRequest,
      eraseRequest
    )

    this.sentRequests[request.id] = request

    return request
  }

  /**
   * Retrieves a request given its id
   *
   * @param  {String[randomString]} requestId
   * @return {Request}
   */
  getRequest(requestId) {
    return this.sentRequests[requestId]
  }
}
