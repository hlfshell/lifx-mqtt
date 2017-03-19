#!/usr/bin/env node

var command = require('commander');
var Lifx = require('node-lifx').Client;
var lifxClient = new Lifx();
var mqtt = require('mqtt');

//Parse command line options
var program = require('commander');

program
	.version(require('./package.json').version)
	.option('-c, --host [host]', 'Set host')
	.option('-P, --port [port]', 'Set port')
	.option('-g, --bulb-groups [filepath]', 'The address to the bulb json config file')
	.option('-b, --lifx-broadcast [address]', 'The IP4 broadcast address to find bulbs. Something like 192.168.1.255')
	.option('-s, --subscription [prefix]', 'Subscription prefix. /# is automatically appended ie: /home/lights becomes /home/lights/#')
	.option('-u, --username [username]', 'Set MQTT username')
	.option('-p, --password [password]', 'Set MQTT password')
	.option('-i, --id [id]', 'Set client id')
	.option('--on-connect-topic [message]', 'On connect, publish this topic')
	.option('--on-connect-payload [payload]', 'On connect, publish this payload. Default is lifx-mqtt-client. Requires --on-connect-topic to be set')
	.option('--on-bulb [prefix]', 'If set, broadcast each bulb\'s connection, ie on bulb "AMERICA" connect, broadcast /heck/yeah/AMERICA')
	.option('--on-light-status [prefix]', 'If set, will broadcast each bulb\'s status changes, ie on bulb "GOLIATH" discovery, /status/prefix/GOLIATH online')
	.option('--on-new-light [prefix]', 'If set, will broadcast when a new bulb is discovered as well as the bulb\'s status change.')
	.parse(process.argv);

if(!program.host) {
	console.error("You must set the MQTT host via --host");
	program.outputHelp();
	process.exit(0);
}
if(!program.subscription){
	console.error("You must provide the subscription via --subscription");
	program.outputHelp();
	process.exit(0);
}
if(!program.lifxBroadcast){
	console.error("The LIFX broadcast address must be provided via -b");
	program.outputHelp();
	process.exit(0);
}
if(program.onConnectPayload && !program.onConnectTopic){
	console.error("You must provide a topic via --on-connect-topic if using --on-connect-payload");
	program.outputHelp();
	process.exit(0);
}

//Before searching for bulbs, let us connect to the MQTT client
var opts =
	{
		host: program.host,
		port: program.port ? program.port : 1883,
		clientId: program.id ? program.id : "lifx_mqtt",
	};
if(program.username) opts.username = program.username;
if(program.password) opts.password = program.password;

var client = mqtt.connect(opts);

client.on('connect', function(){
	console.log("MQTT connection established");
	
	client.subscribe(program.subscription + '/#');
	if(program.onConnectTopic)
		client.publish(program.onConnectTopic, program.onConnectPayload ? program.onConnectPayload : "lifx-mqtt-client");
		
	lifxClient.init({
		broadcast: program.lifxBroadcast,
		lights: []
	});
	
});

client.on('message', function(topic, message){
	var targetLight = lifxClient.findByLabel(topic.split("/").pop());

	if(targetLight == null) return;
	
	var changeBrightness = function(light, currentState, change){
		var brightness = currentState.color.brightness + change;
		if(brightness > 100) brightness = 100;
		if(brightness < 0)
			light.off();
		else{
			light.color(currentState.color.hue, currentState.color.saturation, brightness, currentState.color.kelvin);
			if(currentState.power == 0) light.on();
		}
	}
	
	var changeColor = function(light, currentState, hue, saturation, brightness, kelvin){
		light.color(hue, saturation, currentState.color.brightness, brightness ? brightness : 100, kelvin ? kelvin : 3500);
		if(currentState.power == 0) light.on();
	}
	
	var changeWarmth = function(light, currentState, change){
		var kelvin = currentState.color.kelvin + change;
		if(kelvin > 9000) kelvin = 9000;
		if(kelvin < 2500) kelvin = 2500;
		light.color(currentState.color.hue, currentState.color.saturation, currentState.color.brightness, kelvin);
	}
	
	targetLight.getState(function(err, state){
		switch(message.toString()){
			case "on":
				targetLight.on();
				break;
			case "off":
				targetLight.off();
				break;
			case "white":
				changeColor(targetLight, state, 0, 0);
				break;
			case "red":
				changeColor(targetLight, state, 0, 100);
				break;
			case "green":
				changeColor(targetLight, state, 142, 100, 65);
				break;
			case "blue":
				changeColor(targetLight, state, 240, 100);
				break;
			case "orange":
				changeColor(targetLight, state, 45, 100, 65, 3500);
				break;
			case "purple":
				changeColor(targetLight, state, 300, 100, 67);
				break;
			case "dimmer":
				changeBrightness(targetLight, state, -10);
				break;
			case "muchdimmer":
				changeBrightness(targetLight, state, -25);
				break;
			case "brighter":
				changeBrightness(targetLight, state, 10);
				break;
			case "muchbrighter":
				changeBrightness(targetLight, state, 25);
				break;
			case "warmer":
				changeWarmth(targetLight, state, 1300);
				break;
			case "cooler":
				changeWarmth(targetLight, state, -1300);
				break;
		}
	});
});

client.on('close', function(){
	console.error("Client disconnected");
	process.exit(0);
});

client.on('error', function(err){
	console.error("Error occurred", err);
	process.exit(0);
});

//LIFX Client logic
lifxClient.on('error', function(err) {
  console.error('LIFX error:\n' + err.stack);
  lifxClient.destroy();
  client.end();
  process.exit(0);
});

lifxClient.on('light-new', function(light) {
	light.getLabel(function(err, label){
		if(client.connected && program.onNewLight)
			client.publish(program.onNewLight + '/' + light.label, 'discovered')
		if(client.connected && program.onLightStatus)
			client.publish(program.onLightStatus + '/' + light.label, 'online');
	});
});

lifxClient.on('light-online', function(light) {
    if(client.connected && program.onLightStatus)
  		client.publish(program.onLightStatus + '/' + light.label, 'online');
});

lifxClient.on('light-offline', function(light) {
  if(client.connected && program.onLightStatus)
  	client.publish(program.onLightStatus + '/' + light.label, 'offline');
});

lifxClient.on('listening', function() {
  var address = lifxClient.address();
  console.log(
    'Started LIFX listening on ' +
    address.address + ':' + address.port + '\n'
  );
});

lifxClient.findByLabel = function(label){
	var foundBulb = null;
	lifxClient.lights().some(function(light){
		if(light.label == label){
			foundBulb = light;
			return true;
		}
	});
	
	return foundBulb;
};