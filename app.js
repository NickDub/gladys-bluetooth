const config = require('./config.js');
const scan = require('./lib/scan.js');
const deviceSeen = require('./lib/deviceSeen.js');
const getDevices = require('./lib/getDevices.js');
const shared = require('./lib/shared.js');

//retry every 10 seconds
const RETRY_IN_SECONDS = 10;

//refresh devices every hour
const REFRESH_DEVICES_FREQUENCY_IN_SECONDS = 3600;

var services = config.services.split(',');

function getDevicesWithRetry(service) {
	return getDevices(service)
		.then((devices) => {
			// saving devices by identifier
			devices.forEach(function(device) {
				shared.devices[device.identifier] = device;
			});

			return null;
		})
		.catch((err) => {
			console.log(`Error while getting ${service} devices from Gladys, retrying in ${RETRY_IN_SECONDS} seconds.`);
			console.log(err);
			setTimeout(getDevicesWithRetry, RETRY_IN_SECONDS * 1000, service);
		});
}

function getServiceDevicesWithRetry() {
	services.forEach(function(service) {
		getDevicesWithRetry(service);
	});

	return null;
}

getServiceDevicesWithRetry();
setInterval(getServiceDevicesWithRetry, REFRESH_DEVICES_FREQUENCY_IN_SECONDS * 1000);
scan(deviceSeen);