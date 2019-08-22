// native dependencies
const assert = require('assert')
const util   = require('util')

// third-party dependencies
const should = require('should')

const Intercomm = require('../lib/intercomm')

describe('Intercomm#handleMessage', function () {
  it('should ignore empty messages', function () {

    var node = new Intercomm({
      id: 'node1',
      type: 'client',
      apiVersion: '0.0.0',
      sendMessage: function () {},
    })

    node.handleMessage(undefined)
  })

  it('should parse JSON string messages', function (done) {

    var node = new Intercomm({
      id: 'node1',
      type: 'client',
      apiVersion: '0.0.0',
      sendMessage: function () {},
    })

    node.on('*:some-event', function (data) {
      data.key.should.equal('value')
      done()
    })

    var eventMsg = JSON.stringify({
      type: 'event',
      eventName: 'some-event',
      data: { key: 'value' }
    })

    node.handleMessage(eventMsg)
  })

  it('should ignore messages whose recipients are not the node itself', function (done) {
    var node1 = new Intercomm({
      id: 'node1',
      type: 'server',
      apiVersion: '0.0.0',
      sendMessage: function () {},
    })

    node1.expose({
      someMethod: function () {
        done(new Error('expected message to be ignored'))
      }
    }, ['someMethod'])

    var requestMsg = JSON.stringify({
      type: 'rpc-request',
      method: 'someMethod',
      to: 'another-node',
    })

    node1.handleMessage(requestMsg)
      .then(function (res) {

        done(new Error('error expected'))

      }, function (err) {
        err.should.be.instanceof(Intercomm.errors.IncorrectDestination)

        done()
      })
  })

  
  it('should gracefully prevent exclusively-client nodes from handling requests (requests should be ignored)', function () {
    var node1 = new Intercomm({
      id: 'node1',
      apiVersion: '0.0.0',
      type: 'client',
      sendMessage: function () {},
    })

    var requestMsg = JSON.stringify({
      type: 'rpc-request',
      method: 'someMethod',
      to: 'node1',
    })

    node1.handleMessage(requestMsg)
  })
})

