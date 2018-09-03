// native dependencies
const assert = require('assert')
const util   = require('util')

// third-party dependencies
const should = require('should')

const Intercomm = require('../lib/intercomm')

const makeNodes = (count) => {
  const nodes = {}

  let nodeCount = count
  while (nodeCount > 0) {
    let id = `node${nodeCount}`
    nodes[id] = new Intercomm({
      id: id,
      type: 'both',
      apiVersion: '0.0.0',
      sendMessage: msg => {
        let destinationNode = nodes[msg.to]
        destinationNode.handleMessage(msg)
      }
    })

    nodeCount --
  }

  return nodes
}

describe('Intercomm#emitRemote', function () {
  it('should require eventName', function () {

    var node = new Intercomm({
      id: 'node1',
      type: 'client',
      apiVersion: '0.0.0',
      sendMessage: function () {},
    })

    assert.throws(function () {
      node.emitRemote('*')
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

    node.emitRemote('*', 'some-event', {
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

    node2.on('node1:some-event', function (data) {
      data.key.should.equal('some-data')
      done()
    })

    node1.emitRemote('*', 'some-event', {
      key: 'some-data'
    })
  })

  it('event message may have specific targets', (done) => {
    const { node1, node2, node3 } = makeNodes(3)

    node3.on('node1:some-event', data => {
      done(new Error('should not have received event'))
    })
    node2.on('node1:some-event', data => {
      data.should.equal('some-data')
      done()
    })
    node1.emitRemote('node2', 'some-event', 'some-data')
  })

  it('it is possible to listen to events from any nodes', done => {
    const { node1, node2, node3 } = makeNodes(3)

    let eventReceivedCount = 0

    node3.on('*:some-event', data => {
      data.should.equal('some-data')

      eventReceivedCount ++

      if (eventReceivedCount === 2) {
        done()
      }
    })
    
    node1.emitRemote('node3', 'some-event', 'some-data')
    node2.emitRemote('node3', 'some-event', 'some-data')
  })

})
