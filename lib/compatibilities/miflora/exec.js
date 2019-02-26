const Promise = require('bluebird');
const rp = require('request-promise');
const MiFlora = require('./MiFlora');

const shared = require('../../shared.js');
const utils = require('../../utils.js');
const globalConfig = require('../../../config.js');
const config = require('./config.js');

var delays = {
	temperature : utils.intervalToDelay(config.updateIntervalTemperature),
	light : utils.intervalToDelay(config.updateIntervalLight),
	moisture : utils.intervalToDelay(config.updateIntervalMoisture),
	fertility : utils.intervalToDelay(config.updateIntervalFertility),
	batteryLevel : utils.intervalToDelay(config.updateIntervalBatteryLevel)
};

module.exports = function exec(peripheral) {
	var miFlora = new MiFlora(peripheral.address);
	var now = new Date();
	var localDevicetypes;
	var dataReceived = {
		data : false,
		firmware : false
	};
	var identifier = utils.getIdentifier(peripheral);

	// We look in local memory DB is the bluetooth device exists and is known.
	if (shared.devices[identifier]) {
		var toUpdate = false;
		var typeToUpdate = [];
		var devicetypeId = [];

		var options = {
			method : 'GET',
			uri : `${globalConfig.gladysUrl}/device/${shared.devices[identifier].id}/devicetype?token=${globalConfig.token}`,
			json : true
		};

		rp(options)
			.then((devicetypes) => {
				localDevicetypes = devicetypes;

				// For each DeviceType
				Promise.map(devicetypes, (devicetype) => {
					// Get last change date of the DeviceType
					var lastChanged = new Date(devicetype.lastChanged);
					var delay = now - lastChanged;
					var type = devicetype.type;

					devicetypeId[type] = devicetype.id;

					// Is update needed?
					typeToUpdate[type] = !lastChanged || delay >= delays[type];
					toUpdate = toUpdate || !lastChanged || typeToUpdate[type];
					
					return Promise.resolve();
				})
				.then(() => {
					if (toUpdate) {
						//console.log(`miflora - connect Device ${identifier}`);
						miFlora.connectDevice(peripheral);
					}

					miFlora.on('data', (data) => {
						processData('data', data);
					})
					.once('end', () => {
						miFlora.removeAllListeners('data')
					});

					miFlora.on('firmware', (data) => {
						processData('firmware', data);
					})
					.once('end', () => {
						miFlora.removeAllListeners('firmware')
					});
				});
			})
			.catch((err) => {
				console.error('miflora - Error while getting DeviceTypes from Gladys:');
				console.error(err);
			});
	}

	function processData(origin, data) {
		//console.log(`miflora - ${origin} received: ${JSON.stringify(data)}`);
		Promise.map(localDevicetypes, (devicetype) => {
			var type = devicetype.type;

			if (typeToUpdate[type]) {
				console.log(`miflora - updating ${type}`);
				utils.sendDeviceState('miflora', type, devicetypeId[type], data[type]);
				typeToUpdate[type] = false;
			}

			return Promise.resolve();
		})
		.then(() => {
			console.log(`miflora - ${origin} received OK`);
			dataReceived[origin] = true;

			// When both response are received
			if (dataReceived.data && dataReceived.firmware) {
				dataReceived.data = false;
				dataReceived.firmware = false;

				//console.log(`miflora - disconnect Device ${identifier}`);
				miFlora.disconnectDevice(peripheral);
			}
		});
	}
};