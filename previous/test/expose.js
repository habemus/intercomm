// native dependencies
const assert = require('assert')
const util   = require('util')

// third-party dependencies
const should = require('should')

const Intercomm = require('../lib/intercomm')

describe('Intercomm#expose', () => {
  it('should expose specific methods to the ipc api', () => {
    var node1 = new Intercomm({
      id: 'node1',
      type: 'server',
      apiVersion: '0.0.0',
      sendMessage: function (msg) {},
    })

    node1.expose({
      someMethod: () => {}
    }, ['someMethod'])

    node1.api.someMethod.should.be.a.Function()
  })

  it('should expose a full object of apis and exclude properties that are not functions', () => {
    var node1 = new Intercomm({
      id: 'node1',
      type: 'server',
      apiVersion: '0.0.0',
      sendMessage: function (msg) {},
    })

    node1.expose({
      method1: () => {},
      method2: () => {},

      property: '1231203',
    }, [
      'method1',
      'method2',
      'property'
    ])

    node1.api.method1.should.be.a.Function()
    node1.api.method2.should.be.a.Function()
    should(node1.api.property).be.undefined()
  })

  it('should prevent exclusively-client nodes from exposing apis', () => {
    var node1 = new Intercomm({
      id: 'node1',
      apiVersion: '0.0.0',
      type: 'client',
      sendMessage: () => {},
    })

    assert.throws(() => {
      node1.expose({
        someMethod: function() {}
      }, ['someMethod'])
    })
  })

  it('should ignore methods that are defined in the source object but not explicitly declared in the methods option', () => {
    let node1 = new Intercomm({
      id: 'node1',
      apiVersion: '0.0.0',
      type: 'server',
      sendMessage: () => {}
    })

    node1.expose({
      method1: () => {},
      method2: () => {}
    }, ['method1'])

    node1.api.method1.should.be.a.Function()
    should(node1.api.method2).be.undefined()
  })

  it('should allow for defining a scope for the api', () => {
    let node1 = new Intercomm({
      id: 'node1',
      apiVersion: '0.0.0',
      type: 'server',
      sendMessage: () => {}
    })

    node1.expose({
      method1: () => {},
      method2: () => {}
    }, {
      scope: 'someScopedAPI',
      methods: ['method1', 'method2']
    })

    node1.api.someScopedAPI.should.be.a.Object()
    node1.api.someScopedAPI.method1.should.be.a.Function()
    node1.api.someScopedAPI.method2.should.be.a.Function()
  })

  it('should allow for deep scoping', () => {
    let node1 = new Intercomm({
      id: 'node1',
      apiVersion: '0.0.0',
      type: 'server',
      sendMessage: () => {}
    })

    node1.expose({
      method1: () => {},
      method2: () => {}
    }, {
      scope: 'someScopedAPI.deeperScope',
      methods: ['method1', 'method2']
    })

    node1.api.someScopedAPI.deeperScope.should.be.a.Object()
    node1.api.someScopedAPI.deeperScope.method1.should.be.a.Function()
    node1.api.someScopedAPI.deeperScope.method2.should.be.a.Function()
  })
})
