#!/usr/bin/env node
process.env.DEBUG = "ZoneServer,ZoneProtocol,GatewayServer";

var ZoneServer = require("soe-network").ZoneServer,
    fs = require("fs"),
    atob = require("atob");

var port = 42042,
    gatewayKey = atob("F70IaxuU8C/w7FPXY1ibXw==");

var server = new ZoneServer(port, gatewayKey),
    packetHandlers = {},
    packetHandlersTime = 0;

var referenceData = {};
var itemData = fs.readFileSync("data/ClientItemDefinitions.txt", "utf8"),
    itemLines = itemData.split("\n"),
    items = {};
for (var i=1;i<itemLines.length;i++) {
    var line = itemLines[i].split("^");
    if (line[0]) {
        items[line[0]] = line[1];
    }
}
referenceData.itemTypes = items;
server.setReferenceData(referenceData);

//server.toggleDataDump(true, "./tunneldata");

setInterval(function() {
    try {
        var stat = fs.statSync("zonepackethandlers.js");
        if (stat.mtime.getTime() != packetHandlersTime) {

            require("soe-network").ZoneProtocol.reloadPacketDefinitions();

            packetHandlersTime = stat.mtime.getTime();
            var oldPacketHandlers = packetHandlers;
            eval(fs.readFileSync("zonepackethandlers.js", "utf8"));
            if (!packetHandlers) {
                packetHandlers = oldPacketHandlers;
                console.log("Packet handler reload failed!");
            }
        }
    } catch(e) {
        console.log(e);
    }
}, 1000);

server.on("connect", function(err, client) {
    if (err) {
        console.error(err);
    }
});

function Int64String(value) {
    return "0x" + ("0000000000000000" + value.toString(16)).substr(-16);
}

server.on("data", function(err, client, packet) {
    if (err) {
        console.error(err);
    } else {
        if (packetHandlers && packetHandlers[packet.name]) {
            try {
                packetHandlers[packet.name](server, client, packet);
            } catch(e) {
                console.log(e);
            }
        }
    }
});

server.on("login", function(err, client) {
    if (err) {
        console.error(err);
    } else {
        server.sendRawData(client, fs.readFileSync("data/zone/ReferenceData.WeaponDefinitions.dat"));
        server.sendRawData(client, fs.readFileSync("data/zone/InitializationParameters.dat"));
        
        server.sendData(client, "SendZoneDetails", {
            "zoneName": "Science",
            "unknownDword1": 4,
            "unknownBoolean1": false,
            "unknownString2": "",
            "unknownByte3": 0,
            "zoneId1": 42,
            "zoneId2": 42,
            "nameId": 7699,
            "unknownBoolean7": true
        });
        server.sendRawData(client, fs.readFileSync("data/zone/ClientUpdateZonePopulation.dat"));
        server.sendRawData(client, fs.readFileSync("data/zone/ClientUpdateRespawnLocations.dat"));

        server.sendData(client, "ClientGameSettings", {
            "unknownDword1": 0,
            "unknownDword2": 7,
            "unknownBoolean1": true,
            "unknownFloat1": 1,
            "unknownDword3": 1,
            "unknownDword4": 1,
            "unknownDword5": 0,
            "unknownFloat2": 12,
            "unknownFloat3": 110
        });

        server.sendRawData(client, fs.readFileSync("data/zone/Command.ItemDefinitions.dat"));

        //server.sendRawData(client, fs.readFileSync("data/zone/VehicleBaseLoadVehicleDefinitionManager.dat"));
        server.sendRawData(client, fs.readFileSync("data/zone/ReferenceData.VehicleDefinitions.dat"));
        
        var self = JSON.parse(fs.readFileSync("data/sendself.json"));
        client.character.guid = self.data.guid = server.generateGuid();
        client.character.loadouts = self.data.characterLoadoutData.loadouts;
        client.character.inventory = self.data.inventory;
        client.character.factionId = self.data.factionId;
        client.character.name = self.data.identity.characterName;


        server.sendData(client, "SendSelfToClient", self);
        server.sendData(client, "PlayerUpdate.SetBattleRank", {
            "characterId": client.character.characterId,
            "battleRank": 100
        });
    }
});

server.on("error", function(err) {
    console.error(err);
});

server.on("disconnect", function(err) {
});

server.start();
