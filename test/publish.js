// native dependencies
const assert = require('assert')
const util   = require('util')

// third-party dependencies
const should = require('should')

const Intercomm = require('../lib/intercomm')

describe('Intercomm#publish', function () {
  it('should require eventName', function () {

    var node = new Intercomm({
      id: 'node1',
      type: 'client',
      apiVersion: '0.0.0',
      sendMessage: function () {},
    })

    assert.throws(function () {
      node.publish(null)
    })
  })

  it('should send an `event` message', function (done) {

    var node = new Intercomm({
      id: 'node1',
      type: 'client',
      apiVersion: '0.0.0',
      sendMessage: function (msg) {
        
        msg.from.should.equal(node.id)
        msg.type.should.equal('event')
        msg.data.key.should.equal('value')

        done()
      },
    })

    node.publish('some-event', {
      key: 'value',
    })

  })

  it('event message should be emitted on the other end', function (done) {
    var node1 = new Intercomm({
      id: 'node1',
      type: 'client',
      apiVersion: '0.0.0',
      sendMessage: function (msg) {
        node2.handleMessage(msg)
      },
    })

    var node2 = new Intercomm({
      id: 'node2',
      type: 'server',
      apiVersion: '0.0.0',
      sendMessage: function (msg) {
        node1.handleMessage(msg)
      },
    })

    node2.on('some-event', function (data) {
      data.key.should.equal('some-data')
      done()
    })

    node1.publish('some-event', {
      key: 'some-data'
    })
  })

})
