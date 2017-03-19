# lifx-mqtt
A node command line app that interfaces LIFX bulbs on the same network to an MQTT network.

LIFX bulbs work via UDP, which is cool but I wanted to tie them and other home automation stuff into a central MQTT server I run on a Raspberry Pi Zero at home. This is the solution to that.

# Install
```
npm install -g lifx-mqtt
```

# How it works
This is a command line application, so you won't have to integrate it into anything. Just execute it (or have it started on bootup) on some system and your bulbs will be connected to an MQTT network.

# Command Line Options

* **-c, --host [host]** - Set host
* **-P, --port [port]** - Set port
* **-g, --bulb-groups [filepath]** - The address to the bulb json config file
* **-b, --lifx-broadcast [address]** - The IP4 broadcast address to find bulbs. Something like 192.168.1.255
* **-s, --subscription [prefix]** - Subscription prefix. /# is automatically appended ie: /home/lights becomes /home/lights/#
* **-u, --username [username]** - Set MQTT username
* **-p, --password [password]** - Set MQTT password
* **-i, --id [id]** - Set client id
* **--on-connect-topic [message]** - On connect, publish this topic
* **--on-connect-payload [payload]** - On connect, publish this payload. Default is lifx-mqtt-client. Requires --on-connect-topic to be set
* **--on-bulb [prefix]** - If set, broadcast each bulb\'s connection, ie on bulb "AMERICA" connect, broadcast /heck/yeah/AMERICA
* **--on-light-status [prefix]** - If set, will broadcast each bulb\'s status changes, ie on bulb "GOLIATH" discovery, /status/prefix/GOLIATH online
* **--on-new-light [prefix]** - If set, will broadcast when a new bulb is discovered as well as the bulb\'s status change.
