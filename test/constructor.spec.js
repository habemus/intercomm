import { intercomm } from '../src'

const DEFAULT_OPTIONS = {
  onSendMessage: message => {},
  id: 'test-id',
}

describe('Intercomm initialization', () => {
  test('should require onSendMessage method', () => {
    const opts = {...DEFAULT_OPTIONS}

    delete opts.onSendMessage

    expect(() => {
      const ipc = intercomm(opts)
    }).toThrow()
  })
})
