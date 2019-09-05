export class TimeoutError extends Error {
  constructor(data) {
    super('Timed out')

    this.name = 'TIMEOUT_ERROR'
    this.data = data
  }
}

export class CancelError extends Error {
  constructor(reason) {
    super(reason ? `Cancelled: ${reason}` : 'Cancelled')

    this.name = 'CANCEL_ERROR'
    this.reason = reason
  }
}

export class TaskDroppedError extends Error {
  constructor() {
    super('Task dropped')
    this.name = 'TASK_DROPPED_ERROR'
  }
}

export class MaxAttemptsReachedError extends Error {
  constructor() {
    super('Max attempts reached')

    this.name = 'MAX_ATTEMPTS_REACHED_ERROR'
  }
}


export class MethodNotDefinedError extends Error {
  constructor(methodName) {
    super(`Method '${methodName}' is not defined`)

    this.name = 'METHOD_NOT_DEFINED_ERROR'
    this.methodName = methodName
  }
}
