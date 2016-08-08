// native dependencies
const assert = require('assert');
const util   = require('util');

// third-party dependencies
const should = require('should');

const Intercomm = require('../lib/intercomm');

const DEFAULT_OPTIONS = {
  apiVersion: '0.0.0',
  sendMessage: function (msg) {},
  type: 'both',
  id: 'test-id',
};

function genOpts(opts) {
  opts = opts || {};
  return Object.assign({}, DEFAULT_OPTIONS, opts);
}

describe('Intercomm initialization', function () {
  it('should require apiVersion', function () {
    var opts = genOpts();

    delete opts.apiVersion;

    assert.throws(function () {
      var ipc = new Intercomm(opts);
    });
  });

  it('should require sendMessage method', function () {
    var opts = genOpts();

    delete opts.sendMessage;

    assert.throws(function () {
      var ipc = new Intercomm(opts);
    });
  });

  it('should require id', function () {
    var opts = genOpts();

    delete opts.id;

    assert.throws(function () {
      var ipc = new Intercomm(opts);
    });
  });

  it('should require type', function () {
    var opts = genOpts();

    delete opts.type;

    assert.throws(function () {
      var ipc = new Intercomm(opts);
    });
  });

  it('should properly initialize given the correct options', function () {

    var opts = genOpts();

    var ipc = new Intercomm(opts);

    ipc.should.be.an.Object();
  });

  it('should allow the sendMessage method to be inherited', function () {
    function SubClass(options) {
      Intercomm.call(this, options);
    }
    util.inherits(SubClass, Intercomm);

    var opts = genOpts();
    delete opts.sendMessage;

    SubClass.prototype.sendMessage = function () {};

    var sub = new SubClass(opts);

    sub.should.be.an.Object();
  });

});