/*jslint node:true, vars:true, bitwise:true, unparam:true */
/*jshint unused:true */
const ADDR_HDC1000 = 0x40

const REG_DATA   = 0x00
const REG_CONFIG = 0x02

const WAIT_HDC1000 = 15

const KOSHIAN_I2C_MODE_ENABLE_100K  = 0x01

const KOSHIAN_I2C_CONDITION_STOP    = 0x00
const KOSHIAN_I2C_CONDITION_START   = 0x01
const KOSHIAN_I2C_CONDITION_RESTART = 0x02

var noble = require('noble');
 
console.log('noble');


function calcTemperature(data){
    return data / 65536.0 * 165.0 - 40.0;
}

function calcHumidity(data){
    return data / 65536.0 * 100.0;
}

noble.on('stateChange', function(state) {
    console.log('on -> stateChange: ' + state);
 
    if (state === 'poweredOn') {
        noble.startScanning();
    } else {
        noble.stopScanning();
    }
});
 
noble.on('scanStart', function() {
    console.log('on -> scanStart');
});
 
noble.on('scanStop', function() {
    console.log('on -> scanStop');
});
 
noble.on('discover', function(peripheral) {   //advertising data受信時のcalback処理
    console.log('on -> discover: ' + peripheral);
 
    noble.stopScanning();
    
    console.log('peripheral with UUID ' + peripheral.uuid + ' found');
    var advertisement = peripheral.advertisement;
    var localName = advertisement.localName;
    if (localName){
        console.log('Local Name = ' + localName);
    }
 
    peripheral.on('connect', function() {
        console.log('on -> connect');
        this.discoverServices(['229bff0003fb40da98a7b0def65c2d4b']); // KONASHI_SERVICE_UUID
    });
 
    peripheral.on('disconnect', function() {
        console.log('on -> disconnect');
    });
 
    peripheral.on('servicesDiscover', function(services) {
 
        console.log('service' + services[0]);
        var konashiService = services[0];
        services[0].on('includedServicesDiscover', function(includedServiceUuids) {
            console.log('on -> service included services discovered ' + includedServiceUuids);
            konashiService.discoverCharacteristics(
                ['229b300b03fb40da98a7b0def65c2d4b',  // KONASHI_I2C_CONFIG_UUID
                 '229b300c03fb40da98a7b0def65c2d4b',  // KONASHI_I2C_START_STOP_UUID
                 '229b300d03fb40da98a7b0def65c2d4b',  // KONASHI_I2C_WRITE_UUID 
                 '229b300e03fb40da98a7b0def65c2d4b',  // KONASHI_I2C_READ_PARAM_UUID 
                 '229b300f03fb40da98a7b0def65c2d4b']) // KONASHI_I2C_READ_UUID
        });
  
        services[0].on('characteristicsDiscover', function(characteristics) {
            for(i = 0; i < characteristics.length; i++) {       //Service毎のcharacteristicを表示
                console.log('service_uuid ' + characteristics[i]._serviceUuid + ' characteristic[' + i + '] ' + characteristics[i]);
            }

            var i2cMode = function(mode, callback){
                characteristics[0].write(new Buffer([mode]), false, callback);
            }

            var i2cStartCondition = function(callback){
                characteristics[1].write(new Buffer([KOSHIAN_I2C_CONDITION_START]), false, callback);
            }

            var i2cStopCondition = function(callback){
                characteristics[1].write(new Buffer([KOSHIAN_I2C_CONDITION_STOP]), false, callback);
            }

            var i2cWrite = function(addr, reg, data, callback){
                i2cStartCondition(function(error){
                    header = new Buffer([2 + data.length, (addr << 1) & 0xFE, reg]);
                    characteristics[2].write(Buffer.concat([header, data]), false, function(error){
                        i2cStopCondition(callback);
                    });
                });
            }

            var i2cRead = function(addr, reg, len, callback){
                i2cStartCondition(function(error){
                    characteristics[2].write(new Buffer([2, (addr << 1) & 0xFE, reg]), false, function(error){
                        i2cStopCondition(function(error){
                            setTimeout(function(){
                                i2cStartCondition(function(error){
                                    characteristics[3].write(new Buffer([len, (addr << 1) | 0x01]), false, function(error){
                                        i2cStopCondition(function(error){
                                            characteristics[4].read(function(error, data){
                                                callback(error, data);
                                            });
                                        });
                                    });
                                });
                            }, WAIT_HDC1000);
                        });
                    });
                });
            }        
            
            i2cMode(KOSHIAN_I2C_MODE_ENABLE_100K, function(error){
                i2cWrite(ADDR_HDC1000, REG_CONFIG, new Buffer([0x10, 0x00]), function(error){
                    setInterval(function(){
                        i2cRead(ADDR_HDC1000, REG_DATA, 4, function(error, data){
                            if (data){
                                console.log(' - result : ', calcTemperature(data.readUInt16BE(0)), calcHumidity(data.readUInt16BE(2)));
                            }
                        });
                    }, 1000);
                });
            });
        });
  
        services[0].discoverIncludedServices();
    });
 
    peripheral.connect();                                           //機器との接続実施
});


