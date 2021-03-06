const assert = require('assert')
const util   = require('util')

const should = require('should')

const Intercomm = require('../lib/intercomm')

describe('Intercomm#exec', () => {

  it('should require a destination as the first argument', () => {
    var node1 = new Intercomm({
      id: 'node1',
      type: 'client',
      apiVersion: '0.0.0',
      sendMessage: () => {},
    })

    assert.throws(() => {
      node1.exec(null, 'someMethod')
    })
  })

  it('should require a method as the second argument', () => {
    var node1 = new Intercomm({
      id: 'node1',
      type: 'client',
      apiVersion: '0.0.0',
      sendMessage: () => {},
    })

    assert.throws(() => {
      node1.exec('another-node', null)
    })
  })

  it('should send an `rpc-request` message', function (done) {

    var node1 = new Intercomm({
      id: 'node1',
      type: 'client',
      apiVersion: '0.0.0',
      sendMessage: function (msg) {
        msg.id.should.be.a.String()
        msg.from.should.equal('node1')
        msg.to.should.equal('node2')
        msg.type.should.equal('rpc-request')
        msg.method.should.equal('someMethod')
        msg.params.length.should.equal(2)
        msg.params[0].should.equal('param1')
        msg.params[1].should.equal('param2')

        node2.handleMessage(msg.toJSON())
      },
    })

    var node2 = new Intercomm({
      id: 'node2',
      type: 'server',
      apiVersion: '0.0.0',
      sendMessage: function (msg) {
        node1.handleMessage(msg.toJSON())
      }
    })

    node2.expose({
      someMethod: () => {
        return 'ok!'
      }
    }, ['someMethod'])

    node1.exec('node2', 'someMethod', ['param1', 'param2'])
      .then(function (res) {

        res.should.equal('ok!')

        done()
      })
  })

  it('should execute a method defined on a remote node', function (done) {

    var node1 = new Intercomm({
      id: 'node1',
      type: 'client',
      apiVersion: '0.0.0',
      // let node2 directly handle messages sent by node1
      sendMessage: function (msg) {
        node2.handleMessage(msg.toJSON())
      },
    })

    var node2 = new Intercomm({
      id: 'node2',
      type: 'server',
      apiVersion: '0.0.0',
      // let node1 directly handle messages sent by node2
      sendMessage: function (msg) {
        node1.handleMessage(msg.toJSON())
      },
    })

    // expose hello method at node2
    node2.expose({
      hello: function (who) {
        return 'hello ' + who + ' from node2'
      }
    }, ['hello'])

    // execute the method on node2
    node1.exec('node2', 'hello', ['node1'])
      .then(function (result) {
        result.should.equal('hello node1 from node2')

        done()
      })
  })

  it('should execute a method defined on a remote node and allow for the api to return a promise', function (done) {

    var node1 = new Intercomm({
      id: 'node1',
      type: 'client',
      apiVersion: '0.0.0',
      // let node2 directly handle messages sent by node1
      sendMessage: function (msg) {
        node2.handleMessage(msg.toJSON())
      },
    })

    var node2 = new Intercomm({
      id: 'node2',
      type: 'server',
      apiVersion: '0.0.0',
      // let node1 directly handle messages sent by node2
      sendMessage: function (msg) {
        node1.handleMessage(msg.toJSON())
      },
    })

    // expose hello method at node2
    node2.expose({
      hello: function (who) {
        return new Promise(function (resolve, reject) {

          setTimeout(() => {
            resolve('hello ' + who + ' from node2')
          }, 1500)
        })
      },
    }, ['hello'])

    // execute the method on node2
    node1.exec('node2', 'hello', ['node1'])
      .then(function (result) {
        result.should.equal('hello node1 from node2')

        // check that the sent request has been `forgotten`
        Object.keys(node1.requestManager.sentRequests).length.should.equal(0)

        done()
      })

    // check that the node1 is keeping track of the sent request
    Object.keys(node1.requestManager.sentRequests).length.should.equal(1)
  })

  it('should fail when executing a method that was not exposed on the remote node', function (done) {
    var node1 = new Intercomm({
      id: 'node1',
      type: 'client',
      apiVersion: '0.0.0',
      sendMessage: function (msg) {
        node2.handleMessage(msg.toJSON())
      },
    })

    var node2 = new Intercomm({
      id: 'node2',
      type: 'server',
      apiVersion: '0.0.0',
      sendMessage: function (msg) {
        node1.handleMessage(msg.toJSON())
      },
    })

    node1.exec('node2', 'methodThatDoesNotExist', [])
      .then(() => {
        done(new Error('expected error'))
      })
      .catch(function (err) {

        err.name.should.equal('MethodUndefined')

        // check that the sent request has been `forgotten`
        Object.keys(node1.requestManager.sentRequests).length.should.equal(0)

        done()
      })

    // check that the node1 is keeping track of the sent request
    Object.keys(node1.requestManager.sentRequests).length.should.equal(1)
  })

  it('should fail when remote node throws an error', function (done) {

    var node1 = new Intercomm({
      id: 'node1',
      type: 'client',
      apiVersion: '0.0.0',
      sendMessage: function (msg) {
        node2.handleMessage(msg.toJSON())
      },
    })

    var node2 = new Intercomm({
      id: 'node2',
      type: 'server',
      apiVersion: '0.0.0',
      sendMessage: function (msg) {
        node1.handleMessage(msg.toJSON())
      },
    })

    node2.expose({
      throwErrorMethod: () => {
        throw new TypeError('some type error')
      },
    }, ['throwErrorMethod'])

    node1.exec('node2', 'throwErrorMethod')
      .then(() => {
        done(new Error('error expected'))
      }, function (err) {
        err.name.should.equal('TypeError')
        err.message.should.equal('some type error')

        // check that the sent request has been `forgotten`
        Object.keys(node1.requestManager.sentRequests).length.should.equal(0)

        done()
      })
      .catch(done)

    // check that the node1 is keeping track of the sent request
    Object.keys(node1.requestManager.sentRequests).length.should.equal(1)
  })


  it('should impose the request timeout', function (done) {

    this.timeout(10000)

    var timeoutMs = 2000

    var node1 = new Intercomm({
      id: 'node1',
      type: 'client',
      apiVersion: '0.0.0',
      // let node2 directly handle messages sent by node1
      sendMessage: function (msg) {
        node2.handleMessage(msg.toJSON())
      },
      requestTimeout: timeoutMs,
    })

    var node2 = new Intercomm({
      id: 'node2',
      type: 'server',
      apiVersion: '0.0.0',
      // let node1 directly handle messages sent by node2
      sendMessage: function (msg) {
        node1.handleMessage(msg.toJSON())
      },
    })

    // expose hello method at node2
    node2.expose({
      hello: function (who) {
        return new Promise(function (resolve, reject) {

          setTimeout(() => {
            resolve('hello ' + who + ' from node2')
          }, timeoutMs + 100)
        })
      }
    }, ['hello'])

    // execute the method on node2
    node1.exec('node2', 'hello', ['node1'])
      .then(function (result) {
        done(new Error('expected timeout error'))
      }, function (err) {

        err.should.be.instanceof(Intercomm.errors.RequestTimeout)

        // check that the sent request has been `forgotten`
        Object.keys(node1.requestManager.sentRequests).length.should.equal(0)

        // wait some time to check that
        // after the timeout time the response should
        // be discarded
        setTimeout(done, 2000)
      })

    // check that the node1 is keeping track of the sent request
    Object.keys(node1.requestManager.sentRequests).length.should.equal(1)
  })

  it('should handle `sendMessage` synchronous error', () => {

    var _err

    var node1 = new Intercomm({
      id: 'node1',
      apiVersion: '0.0.0',
      type: 'client',
      sendMessage: () => {
        _err = new Error('error sending message')
        throw _err
      },
    })

    // try to execute some method,
    // but the sendMessage will fail execution
    return node1.exec('some-other-node', 'someMethod')
      .then(() => {
        throw new Error('error expected')
      }, (err) => {
        err.name.should.eql('SendMessageError')
        err.message.should.eql('error sending message')
        err.sourceError.should.equal(_err)
      })
  })

  it('should handle `sendMessage` asynchronous error', () => {

    var _err

    var node1 = new Intercomm({
      id: 'node1',
      apiVersion: '0.0.0',
      type: 'client',
      sendMessage: () => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            _err = new Error('error sending message')
            reject(_err)
          }, 500)
        })
      },
    })

    // try to execute some method,
    // but the sendMessage will fail execution
    return node1.exec('some-other-node', 'someMethod')
      .then(() => {
        throw new Error('error expected')
      }, (err) => {
        err.name.should.eql('SendMessageError')
        err.message.should.eql('error sending message')
        err.sourceError.should.equal(_err)
      })
  })

})
