/*jshint unused:true */

var CMD_FUNCTIONSET = 0x20

var SEND = new Buffer('40', 'hex');
var INIT = new Buffer('0038391470566c0c0106', 'hex');
var CLEARDISPLAY = new Buffer('0001', 'hex');
var RETURNHOME = new Buffer('0002', 'hex');

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

ST7032.prototype.clear = function(callback) {
  this._i2c.write(CLEARDISPLAY);
  if (callback != undefined) {
    callback();
  }
};

ST7032.prototype.home = function(callback) {
  this._i2c.write(RETURNHOME);
  if (callback != undefined) {
    callback();
  }
};

ST7032.prototype.setCursor = function(x, y, callback) {
  var row = [0x00, 0x40, 0x14, 0x54][y];
  var cmd = new Buffer([0x00, (0x80 | (row + x))])
  this._i2c.write(cmd);
  if (callback != undefined) {
    callback();
  }
};

ST7032.prototype.putText = function(str, callback) {
  var raw = new Buffer(str, 'ascii');
  var cmd = Buffer.concat([SEND, raw]);
  this._i2c.write(cmd);
  if (callback != undefined) {
    callback();
  }
};

// TODO:setContrastの実装

// TODO:初期設定値の調整
ST7032.prototype.init = function(callback) {
  var self = this;
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
        }, 100);
      }
    ],
    function(err, results) {
      if (callback != undefined) {
        callback();
      }
    });
}

module.exports = ST7032;