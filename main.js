/*jslint node:true, vars:true, bitwise:true, unparam:true */
/*jshint unused:true */
const ADDR_HDC1000 = 0x40

const REG_DATA = 0x00
const REG_CONFIG = 0x02

const WAIT_HDC1000 = 15

const ADDR_ST7032 = 0x3e

var async = require('async');

var Koshian = require('./koshian');
var ST7032 = require('./st7032');

var lcd = ST7032.use(1, ADDR_ST7032);
lcd.init(function() {
  lcd.setCursor(0, 1,
    function() {
      lcd.putText("hage");
    });
});

function calcTemperature(data) {
  return data / 65536.0 * 165.0 - 40.0;
}

function calcHumidity(data) {
  return data / 65536.0 * 100.0;
}

// TODO:表示更新している事がわかるようブリンクなどを検討
function displayTemperatureAndHumidity(temp, hum) {
  async.series([
    function(cb) {
      lcd.clear(cb);
    },
    function(cb) {
      lcd.setCursor(0, 0, cb);
    },
    function(cb) {
      // TODO:℃表示を使うように変更
      lcd.putText(temp.toFixed(2) + " C", cb);
    },
    function(cb) {
      lcd.setCursor(0, 1, cb);
    },
    function(cb) {
      lcd.putText(hum.toFixed(2) + " %", cb);

    }
  ]);
}

console.log('start')
Koshian.discover(function(koshian) {
  console.log('found koshian')

  var intervalId = 0;

  koshian.removeAllListeners('connect');
  koshian.on('connect', function() {
    async.series([
      function(cb) {
        console.log('discoverServicesAndCharacteristics');
        koshian.discoverServicesAndCharacteristics(cb);
        koshian.removeAllListeners('disconnect');
        koshian.on('disconnect', function() {
          console.log('disconnected -> reconnect');
          koshian.connect();
        });

      },
      function(cb) {
        console.log('i2cMode');
        koshian.i2cMode(koshian.KOSHIAN_I2C_MODE_ENABLE_100K, cb);
      },
      function(cb) {
        console.log('i2cWrite');
        koshian.i2cWrite(ADDR_HDC1000, REG_CONFIG, new Buffer([0x10, 0x00]), cb);
      },
      function(cb) {
        intervalId = setInterval(function() {
          console.log('i2cRead');
          koshian.i2cRead(ADDR_HDC1000, REG_DATA, 4, WAIT_HDC1000, function(error, data) {
            if (data) {
              console.log(' - result : ', calcTemperature(data.readUInt16BE(0)),
                calcHumidity(data.readUInt16BE(2)));
              displayTemperatureAndHumidity(calcTemperature(data.readUInt16BE(0)),
                calcHumidity(data.readUInt16BE(2)));
            }
          });
        }, 1000);
        koshian.on('disconnect', function() {
          clearInterval(intervalId);
        });
        cb(null);
      }
    ]);

  });

  console.log('connect');
  koshian.connect();
});