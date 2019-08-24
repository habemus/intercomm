import { generateId } from './util'
import { RequestTimeoutError } from './errors'

export class Request {
  constructor({ timeout = 1000, id = generateId() }) {
    this.id = id

    this.promise = new Promise((_resolve, _reject) => {
      /**
       * The context refers to the Request instance
       */

      this.timeoutId = setTimeout(() => {
        this.reject(new RequestTimeoutError())
      }, timeout)

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
}

export class RequestManager {
  constructor({ defaultRequestTimeout = 1000 }) {
    this.defaultRequestTimeout = defaultRequestTimeout
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
  registerRequest(id, { timeout = this.defaultRequestTimeout } = {}) {
    const request = new Request({
      id,
      timeout
    })

    const eraseRequest = () => {
      delete this.sentRequests[request.id]
    }

    /**
     * When request is either resolved or rejected, erase the request
     * from the `sentRequests` object.
     */
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
