# PS2 Network Emulation

A collection of proof-of-concept scripts utilizing the [soe-network](https://github.com/psemu/soe-network/) package.

Note: as the network protocol constantly evolves, it is unlikely that these will work out of the box against the live servers.

## Install

* Install [Node.js](http://nodejs.org)
* Run `npm install` in project folder
   
## Full client test

This script tests the login and zone client functionality.

First, login at http://lp.soe.com/ps2/test/ and grab the `lp-token` cookie value. Add this to the token.js file and then run:

`node fullclienttest.js`

The script should then connect to the Test login server and present you with a list of characters.

Pick a character to connect to the zone server. Only the initial handshake is handled so nothing will happen after the first bunch of zone data has been sent.


## Login server test

This script sets up a local login server using the data in the `data` folder. The server will be running on port 20042. 

`node loginservertest.js`

Edit `ClientConfig.ini` and run the client executable directly. No session ID is needed:

`Planetside2_x64.exe inifile=ClientConfig.local.ini sessionid=0 Internationalization:Locale=en_US`

The login server is currently set up with a single character ("LocalPlayer") and a single, local server.

## Zone server test

This script sets up the local zone server using the data in the `data/zone` folder.

`node zoneservertest.js`

Most zone packets are handled by functions in `zonepackethandlers.js`. This file can be edited and will be reloaded dynamically while the server is running.