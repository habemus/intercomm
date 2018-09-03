// native dependencies
const assert = require('assert')
const util   = require('util')

// third-party dependencies
const should = require('should')

const Intercomm = require('../lib/intercomm')

describe('Intercomm#prepareResponseMessage(request, response, data)', () => {
  it('should attempt to call `toJSON` method from the data by default', (done) => {
    let node1 = new Intercomm({
      id: 'node1',
      type: 'client',
      apiVersion: '0.0.0',
      sendMessage: function (msg) {
        node2.handleMessage(msg.toJSON())
      },
    })

    let node2 = new Intercomm({
      id: 'node2',
      type: 'server',
      apiVersion: '0.0.0',
      sendMessage: function (msg) {
        node1.handleMessage(msg.toJSON())
      }
    })

    node2.expose({
      someMethod: () => {
        return {
          data: 'some data that will not be sent',
          toJSON: () => {
            return 'data after toJSON() call'
          }
        }
      }
    }, ['someMethod'])

    node1.exec('node2', 'someMethod', ['param1', 'param2'])
      .then(function (res) {

        res.should.equal('data after toJSON() call')

        done()
      })
  })

  it('should attempt to call `toJSON` method of each of the data items if the data object is an Array', (done) => {
    let node1 = new Intercomm({
      id: 'node1',
      type: 'client',
      apiVersion: '0.0.0',
      sendMessage: function (msg) {
        node2.handleMessage(msg.toJSON())
      },
    })

    let node2 = new Intercomm({
      id: 'node2',
      type: 'server',
      apiVersion: '0.0.0',
      sendMessage: function (msg) {
        node1.handleMessage(msg.toJSON())
      }
    })

    node2.expose({
      someMethod: () => {
        return [{
          data: 'some data that will not be sent',
          toJSON: () => {
            return 'item 1 data after toJSON() call'
          }
        }, {
          toJSON: () => {
            return 'item 2 data after toJSON() call'
          }
        }]
      }
    }, ['someMethod'])

    node1.exec('node2', 'someMethod', ['param1', 'param2'])
      .then(function (res) {

        res.should.eql([
          'item 1 data after toJSON() call',
          'item 2 data after toJSON() call',
        ])

        done()
      })
  })
})
