export class SendMessageError extends Error {
  constructor() {
    super('SEND_MESSAGE_ERROR')

    this.name = 'SEND_MESSAGE_ERROR'
  }
}

export class RequestTimeoutError extends Error {
  constructor() {
    super('REQUEST_TIMEOUT_ERROR')

    this.name = 'REQUEST_TIMEOUT_ERROR'
  }
}
