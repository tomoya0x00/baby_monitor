/*jslint node:true, vars:true, bitwise:true, unparam:true */
/*jshint unused:true */

var CMD_FUNCTIONSET = 0x20

var async = require('async');
var mraa = require('mraa');

function ST7032(bus, addr) {
    this._i2c = new mraa.I2c(bus);
    this._i2c.address(addr);
}

ST7032.use = function(bus, addr) {
    var lcd = new ST7032(bus, addr);
    
    return lcd;
}

ST7032.prototype.init = function() {
}

module.exports = ST7032;
