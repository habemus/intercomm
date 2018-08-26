const uuidv4 = require('uuid/v4')

class RequestNotFoundError extends Error {
	constructor(requestId) {
		super()

		this.name = 'RequestNotFoundError'
		this.message = `requestId ${requestId} does not correspond to any request object`
	}
}

class RequestTimeoutError extends Error {
	constructor() {
		super()

		this.name = 'RequestTimeoutError'
	}
}

class Request {
	constructor({ requestTimeout = 1000, id = uuidv4() }) {
		this.id = id

		this.promise = new Promise((_resolve, _reject) => {
			/**
			 * The context refers to the Request instance
			 */
			
			this._requestTimeoutId = setTimeout(() => {
				this.reject(new RequestTimeoutError())
			}, requestTimeout)

			this.resolve = result => {
				clearTimeout(this._requestTimeoutId)

				_resolve(result)
			}

			this.reject = err => {
				clearTimeout(this._requestTimeoutId)

				_reject(err)
			}
		})
	}
}

class RequestManager {
	constructor({ requestTimeout = 1000 }) {
		this.requestTimeout = requestTimeout
		this.sentRequests = {}
	}

	/**
	 * Registers an object representing a request.
	 * The request has an id which should be used for retrieving the request
	 * at a moment when it should be resolved or rejected.
	 *
	 * @param {String} id (optional)
	 * @return {Request}
	 *         - id {String[uuidv4]}
	 *         - resolve {Function}
	 *         - reject {Function}
	 */
	registerRequest(id) {
		let request = new Request({
			id,
			requestTimeout: this.requestTimeout
		})

		let eraseRequest = () => {
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
	 * @param  {String[uuid]} requestId
	 * @return {Request}
	 */
	getRequest(requestId, { error = true }) {
		let request = this.sentRequests[requestId]

		if (!request && error) {
			throw new RequestNotFoundError(requestId)
		}

		return request
	}
}

module.exports = {
	RequestNotFoundError,
	RequestTimeoutError,
	Request,
	RequestManager,
}
