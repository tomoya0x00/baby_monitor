/*jslint node:true, vars:true, bitwise:true, unparam:true */
/*jshint unused:true */
var events = require('events');
var util = require('util');

var async = require('async');
var noble = require('noble');

const KOSHIAN_I2C_CONFIG_UUID = '229b300b03fb40da98a7b0def65c2d4b'
const KOSHIAN_I2C_START_STOP_UUID = '229b300c03fb40da98a7b0def65c2d4b'
const KOSHIAN_I2C_WRITE_UUID = '229b300d03fb40da98a7b0def65c2d4b'
const KOSHIAN_I2C_READ_PARAM_UUID = '229b300e03fb40da98a7b0def65c2d4b'
const KOSHIAN_I2C_READ_UUID = '229b300f03fb40da98a7b0def65c2d4b'

const KOSHIAN_I2C_MODE_ENABLE_100K = 0x01

const KOSHIAN_I2C_CONDITION_STOP = 0x00
const KOSHIAN_I2C_CONDITION_START = 0x01
const KOSHIAN_I2C_CONDITION_RESTART = 0x02

function Koshian(peripheral) {
  this._peripheral = peripheral;
  this._services = {};
  this._characteristics = {};

  this.uuid = peripheral.uuid;

  this._peripheral.on('disconnect', this.onDisconnect.bind(this));
  this._peripheral.on('connect', this.onConnect.bind(this));
}

util.inherits(Koshian, events.EventEmitter);

Koshian.discover = function(callback, uuid) {
  var startScanningOnPowerOn = function() {
    if (noble.state === 'poweredOn') {
      var onDiscover = function(peripheral) {
        if (peripheral.advertisement.localName.indexOf('konashi2') > -1 && (uuid === undefined || uuid === peripheral.uuid)) {
          noble.removeListener('discover', onDiscover);
          noble.stopScanning();
          console.log(peripheral);
          var koshian = new Koshian(peripheral);
          callback(koshian);
        }
      };

      noble.on('discover', onDiscover);

      noble.startScanning();
    } else if (noble.state === 'unknown') {
      //Wait for adapter to be ready
      noble.once('stateChange', startScanningOnPowerOn);
    } else {
      throw new Error('Please be sure Bluetooth 4.0 supported / enabled on your system before trying to connect to koshian-node');
    }
  };

  startScanningOnPowerOn();
};

Koshian.prototype.onDisconnect = function() {
  this.emit('disconnect');
};

Koshian.prototype.onConnect = function() {
  this.emit('connect');
};

Koshian.prototype.connect = function(callback) {
  this._peripheral.connect(callback);
};

Koshian.prototype.disconnect = function(callback) {
  this._peripheral.disconnect(callback);
};

Koshian.prototype.discoverServicesAndCharacteristics = function(callback) {
  var index,
    currCharacteristic,
    currService;
  this._peripheral.discoverAllServicesAndCharacteristics(function(error, services, characteristics) {
    if (error === null) {
      for (index = 0; index < services.length; index++) {
        currService = services[index];
        this._services[currService.uuid] = currService;
      }

      for (index = 0; index < characteristics.length; index++) {
        currCharacteristic = characteristics[index];
        this._characteristics[currCharacteristic.uuid] = currCharacteristic;
      }
    }

    callback();
  }.bind(this));
};

Koshian.prototype.writeCharacteristic = function(uuid, data, callback) {
  this._characteristics[uuid].write(data, false, function() {
    callback();
  }.bind(this));
};

Koshian.prototype.readDataCharacteristic = function(uuid, callback) {
  this._characteristics[uuid].read(callback);
};

Koshian.prototype.i2cMode = function(mode, callback) {
  this.writeCharacteristic(KOSHIAN_I2C_CONFIG_UUID, new Buffer([mode]), callback);
}

Koshian.prototype.i2cWrite = function(addr, reg, data, callback) {
  self = this
  async.series([
    function(cb) {
      self.writeCharacteristic(KOSHIAN_I2C_START_STOP_UUID, new Buffer([KOSHIAN_I2C_CONDITION_START]), cb);
    },
    function(cb) {
      header = new Buffer([2 + data.length, (addr << 1) & 0xFE, reg]);
      self.writeCharacteristic(KOSHIAN_I2C_WRITE_UUID, Buffer.concat([header, data]), cb);
    },
    function(cb) {
      self.writeCharacteristic(KOSHIAN_I2C_START_STOP_UUID, new Buffer([KOSHIAN_I2C_CONDITION_STOP]), cb);
    }
  ], function(err, results) {
    callback(err);
  });
}

Koshian.prototype.i2cRead = function(addr, reg, len, wait, callback) {
  self = this;
  async.series([
    function(cb) {
      self.writeCharacteristic(KOSHIAN_I2C_START_STOP_UUID, new Buffer([KOSHIAN_I2C_CONDITION_START]), cb);
    },
    function(cb) {
      self.writeCharacteristic(KOSHIAN_I2C_WRITE_UUID, new Buffer([2, (addr << 1) & 0xFE, reg]), cb);
    },
    function(cb) {
      self.writeCharacteristic(KOSHIAN_I2C_START_STOP_UUID, new Buffer([KOSHIAN_I2C_CONDITION_STOP]), cb);
    },
    function(cb) {
      setTimeout(function() {
        cb(null);
      }, wait);
    },
    function(cb) {
      self.writeCharacteristic(KOSHIAN_I2C_START_STOP_UUID, new Buffer([KOSHIAN_I2C_CONDITION_START]), cb);
    },
    function(cb) {
      self.writeCharacteristic(KOSHIAN_I2C_READ_PARAM_UUID, new Buffer([len, (addr << 1) | 0x01]), cb);
    },
    function(cb) {
      self.writeCharacteristic(KOSHIAN_I2C_START_STOP_UUID, new Buffer([KOSHIAN_I2C_CONDITION_STOP]), cb);
    },
    function(cb) {
      self.readDataCharacteristic(KOSHIAN_I2C_READ_UUID, callback);
      cb(null)
    }
  ]);
}

module.exports = Koshian;