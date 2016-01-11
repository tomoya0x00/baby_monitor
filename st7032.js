/*jshint unused:true */

var CMD_FUNCTIONSET = 0x20

var SEND = new Buffer('40', 'hex');
var INIT = new Buffer('0038391470566c0c0106', 'hex');

var async = require('async');
var mraa = require('mraa');

function ST7032(bus, addr) {
  this._i2c = new mraa.I2c(bus);
  this._i2c.address(addr);
  this._i2c.frequency(0);
}

ST7032.use = function(bus, addr) {
  var lcd = new ST7032(bus, addr);

  return lcd;
}

ST7032.prototype.init = function() {
  self = this;
  async.series([
    function(cb) {
      var buf = new Buffer('0038391470566c', 'hex');
      self._i2c.write(buf);
      /*
      self._i2c.writeReg(0x00, 0x38);
      self._i2c.writeReg(0x00, 0x39);
      self._i2c.writeReg(0x00, 0x14);
      self._i2c.writeReg(0x00, 0x70);
      self._i2c.writeReg(0x00, 0x56);
      self._i2c.writeReg(0x00, 0x6c);
       */
      cb(null);
    },
    function(cb) {
      setTimeout(function() {
        cb(null);
      }, 300);
    },
    function(cb) {
      var buf = new Buffer('00380c01', 'hex')
      self._i2c.write(buf);
      /*
      self._i2c.writeReg(0x00, 0x38);
      self._i2c.writeReg(0x00, 0x0c);
      self._i2c.writeReg(0x00, 0x01);
       */
      cb(null);
    },
    function(cb) {
      setTimeout(function() {
        cb(null);
      }, 10000);
    },
    function(cb) {
      self._i2c.writeReg(0x00, 0x80);
      self._i2c.writeReg(0x40, 0xdc);
      cb(null);
    }
  ]);
}

module.exports = ST7032;