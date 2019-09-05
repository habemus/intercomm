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
