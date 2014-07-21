#!/usr/bin/env node
process.env.DEBUG = "SOEProxy,LoginProxy,SOEServer,SOEClient,GatewayProxy,ZoneProxy,ZoneProtocol,SOEProtocol";

var LoginProxy = require("soe-network").LoginProxy,
    ZoneProxy = require("soe-network").ZoneProxy,
    ZoneProtocol = require("soe-network").ZoneProtocol,
    fs = require("fs"),
    atob = require("atob"),
    locale = require("soe-locale"),
    prompt = require("prompt");


var config = {
    loginServerAddress: "lvspsn-tst-l01.planetside2.com",
    loginServerPort: 20042,
    loginKey: atob("F70IaxuU8C/w7FPXY1ibXw=="),
    loginLocalPort: 42042,
    loginLocalClientPort: 50021,
    forceBypassServerLock: true,
    rewriteGatewayAddress: true,
    customGatewayAddress: "127.0.0.1",
    customGatewayPort: 20044,
    customGatewayClientPort: 50022,
    useGatewayProxy: true
};

var loginProxy = new LoginProxy(config.loginServerAddress, config.loginServerPort, config.loginKey, config.loginLocalPort, config.loginLocalClientPort);

loginProxy.on("clientdata", function(err, packet) {
    
});

loginProxy.on("serverdata", function(err, packet) {
    var result = packet.result;
    switch (packet.name) {
        case "ServerUpdate":
            result.populationData = result.populationData.replace("69.174.216.29", "127.0.0.1");
            packet.dirty = true;
            break;
        case "ServerListReply":
            for (var i=0;i<result.servers.length;i++) {
                result.servers[i].populationData = result.servers[i].populationData.replace("69.174.216.29", "127.0.0.1");
            }
            packet.dirty = true;
            break;
        case "CharacterLoginReply":
            if (config.rewriteGatewayAddress) {
                var gatewayKey = result.payload.encryptionKey;
                var address = result.payload.serverAddress.split(":");
                if (config.useGatewayProxy) {
                    launchZoneProxy(address[0], +address[1], gatewayKey);
                }
                result.payload.serverAddress = config.customGatewayAddress + ":" + config.customGatewayPort;
                packet.dirty = true;
                packet.delay = 2000;
            }
            require("fs").writeFileSync("characterloginreply_proxy.json", JSON.stringify(result, null, 4));
            setTimeout(function() {
                //loginProxy.stop();
            },5000);
            break;
    }
});

loginProxy.start();

function launchZoneProxy(remoteAddress, remotePort, cryptoKey) {

    var zoneProxy = new ZoneProxy(remoteAddress, remotePort, cryptoKey, config.customGatewayPort, config.customGatewayClientPort);

    zoneProxy.on("clientdata", function(err, data) {
    });

    zoneProxy.on("serverdata", function(err, data) {
    });

    zoneProxy.start();
}
