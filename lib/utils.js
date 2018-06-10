// global functions
const rp = require('request-promise');
const globalConfig = require('../config.js');

module.exports = {
	getIdentifier: function getIdentifier(peripheral) {
		if (peripheral.address && peripheral.address !== 'unknown') {
			return peripheral.address;
		} else {
			return peripheral.id;
		}
	},

	createDevice : function createDevice(device, types) {
		var options = {
			method : 'POST',
			uri : `${globalConfig.gladysUrl}/device?token=${globalConfig.token}`,
			body : {
				device ,
				types
			},
			json : true
		};

		return rp(options)
			.then(function (newDevice) {
				console.log(`Device "${device.name}" inserted with success !`);
				return newDevice;
			});
	},

	setDeviceState : function setDeviceState(id, value) {
		var options = {
			method : 'POST',
			uri : `${globalConfig.gladysUrl}/devicestate?token=${globalConfig.token}`,
			body : {
				devicetype : id,
				value : value
			},
			json : true
		};

		return rp(options);
	},

	sendDeviceState : function sendDeviceState(service, type, id, value) {
		var options = {
				method : 'POST',
				uri : `${globalConfig.gladysUrl}/devicestate?token=${globalConfig.token}`,
				body : {
					devicetype : id,
					value : value
				},
				json : true
			};

		rp(options)
			.then(function(parsedResult) {
				console.log(`${service} - DeviceType "${parsedResult.devicetype}" and DeviceState "${type}" inserted with success !`);
			})
			.catch(function(err) {
				console.error(`${service} - Error while sending ${type} to Gladys:`);
				console.error(err);
			});
	},

	intervalToDelay : function intervalToDelay(interval) {
		// Convert minutes to milliseconds
		return parseInt(interval, 10) * 60000;
	},

	photonsToLux : function photonsToLux(value) {
		return (value * 1250).toFixed(0);
	}
};