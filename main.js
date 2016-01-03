/*jslint node:true, vars:true, bitwise:true, unparam:true */
/*jshint unused:true */
const ADDR_HDC1000 = 0x40

const REG_DATA   = 0x00
const REG_CONFIG = 0x02

const KOSHIAN_I2C_MODE_ENABLE_100K  = 0x01

const KOSHIAN_I2C_CONDITION_STOP    = 0x00
const KOSHIAN_I2C_CONDITION_START   = 0x01
const KOSHIAN_I2C_CONDITION_RESTART = 0x02

var noble = require('noble');
 
console.log('noble');

var i2c = function(characteristics) {
    this.characteristics = characteristics
}

i2c.prototype.write = function(buf, callback) {    
    self = this
    
    self.characteristics[1].write(new Buffer([KOSHIAN_I2C_CONDITION_START]), false, function(error){
        self.characteristics[2].write(buf, false, function(error){
            self.characteristics[1].write(new Buffer([KOSHIAN_I2C_CONDITION_STOP]), false, callback)
        });
    });
}

i2c.prototype.read = function(addr, reg, callback) {
    self = this
    // send StartCondition
    self.characteristics[1].write(new Buffer([KOSHIAN_I2C_CONDITION_START]), false, function(error){
        // send register-address
        self.characteristics[2].write(new Buffer([2, (addr << 1) & 0xFE, reg]), false, function(error){
            // send RestartCondition
            self.characteristics[1].write(new Buffer([KOSHIAN_I2C_CONDITION_RESTART]), false, function(error){
                setTimeout(function(){
                    // request data read 
                    self.characteristics[3].write(new Buffer([2, (addr << 1) | 0x01]), false, function(error){
                        // send StopCondition
                        self.characteristics[1].write(new Buffer([KOSHIAN_I2C_CONDITION_STOP]), false, function(error){
                            // read received data
                            self.characteristics[4].read(function(error, data){
                                if (data){
                                    console.log('data: ', data);
                                }
                            });
                        });
                    });
                }, 15);
            });
        });
    });
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

            var konashi = new i2c(characteristics);
            characteristics[0].write(new Buffer([KOSHIAN_I2C_MODE_ENABLE_100K]), false, function(error){
                characteristics[1].write(new Buffer([KOSHIAN_I2C_CONDITION_START]), false, function(error){
                    characteristics[2].write(new Buffer([4, (ADDR_HDC1000 << 1) & 0xFE, REG_CONFIG, 0x10, 0x00]), false, function(error){
                        var i = 0;
                        characteristics[1].write(new Buffer([KOSHIAN_I2C_CONDITION_STOP]), false, function(error){
                            setInterval(function(){
                                characteristics[1].write(new Buffer([KOSHIAN_I2C_CONDITION_START]), false, function(error){
                                    // send register-address
                                    characteristics[2].write(new Buffer([2, (ADDR_HDC1000 << 1) & 0xFE, REG_DATA]), false, function(error){
                                        characteristics[1].write(new Buffer([KOSHIAN_I2C_CONDITION_STOP]), false, function(error){
                                            setTimeout(function(){
                                                characteristics[1].write(new Buffer([KOSHIAN_I2C_CONDITION_START]), false, function(error){
                                                    // request data read 
                                                    characteristics[3].write(new Buffer([4, (ADDR_HDC1000 << 1) | 0x01]), false, function(error){
                                                        // send StopCondition
                                                        characteristics[1].write(new Buffer([KOSHIAN_I2C_CONDITION_STOP]), false, function(error){
                                                            // read received data
                                                            characteristics[4].read(function(error, data){
                                                                if (data){
                                                                    console.log( i++ + ' - temperature : ', data);
                                                            }
                                                            });
                                                        });
                                                    });
                                                });
                                            }, 15);
                                        });
                                    });
                                });
                            }, 1000)});
                    });
                });
            });
        });
  
        services[0].discoverIncludedServices();
    });
 
    peripheral.connect();                                           //機器との接続実施
});


