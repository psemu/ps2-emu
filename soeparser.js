#!/usr/bin/env node
process.env.DEBUG = [
    "SOEParser",
    //"SOEInputStream",
    "ZoneProtocol"
].join(",");

var fs = require("fs"),
    path = require("path"),
    atob = require("atob"),
    pcap = require("pcap-parser"),
    SOEProtocol = require("soe-network").SOEProtocol,
    GatewayProtocol = require("soe-network").GatewayProtocol,
    LoginProtocol = require("soe-network").LoginProtocol,
    ZoneProtocol = require("soe-network").ZoneProtocol,
    SOEInputStream = require("soe-network").SOEInputStream,
    debug = require("debug")("SOEParser");

var inFile = process.argv[2],
    outPath = process.argv[3];

if (!inFile || !outPath) {
    console.log("Usage: node soeparser.js <infile.pcap> <outpath>");
    process.exit();
}

if (!fs.existsSync(inFile)) {
    throw "File does not exist: " + inFile;
}

if (!fs.existsSync(outPath)) {
    throw "Out path does not exist: " + outPath;
}


var ignoreZonePackets = [
    // "PlayerUpdateUpdatePositionZoneToClient",
    // "PlayerUpdateUpdatePositionClientToZone",
    // "PlayerUpdateUpdateVehicleWeapon",
    // "Weapon.Weapon"
];

var writeZonePackets = [
    // "SendSelfToClient",
    // "Command.SetProfile",
    // "ClientUpdate.ItemAdd",
    // "Equipment.SetCharacterEquipment",
    // "Weapon.Weapon",
    // "Abilities.SetLoadoutAbilities"
];


// login key
var loginKey = atob("F70IaxuU8C/w7FPXY1ibXw==");

var protocol = new SOEProtocol(),
    loginProtocol = new LoginProtocol(),
    gatewayProtocol = new GatewayProtocol(),
    zoneProtocol = new ZoneProtocol();

var testLoginServer = "64.37.174.149",
    testZoneServer,
    client = "192.168.1.67";


var serverConfig = {
    login: {
        compression: 0x01,
        crcSeed: 1,
        crcLength: 2,
        udpLength: 512
    },
    zone: {
        compression: 0x00,
        crcSeed: 1,
        crcLength: 2,
        udpLength: 512
    }
};


var n = 0, m = 0;
var streams = {};
var firstClientPacket = true;

// load client item definitions, needed to parse SendSelfToClient data from Zone server
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

function packetNum(n) {
    return ("000000" + n).substr(-6);
}


streams["loginserver"] = new SOEInputStream(loginKey);
streams["loginserver"].toggleEncryption(true);
streams["loginserver"].on("data", function(err, data) {
    m++;
    debug("Data packet from login server");
    try {
        var packet = loginProtocol.parse(data);
        if (!packet) {
            packet = {name: "failed"};
        }
        fs.writeFileSync(path.join(outPath, "loginpacket_" + packetNum(m) + "_" + packet.name + "_server.dat"), data);
        fs.writeFileSync(path.join(outPath, "loginpacket_" + packetNum(m) + "_" + packet.name + "_server.json"), JSON.stringify(packet, null, 2));
    } catch (e) {
        fs.writeFileSync(path.join(outPath, "loginpacket_" + packetNum(m) + "_failedhard_server.dat"), data);
        return;
    }

    if (packet.name == "CharacterLoginReply") {
        //testZoneServer = packet.result.payload.match(/GatewayAddress=\"(.*?)\"/)[1].split(":")[0];
        var encryptionKey = atob(packet.result.payload.match(/<Data>(.*?)<\/Data>/)[1]);
        firstClientPacket = true;


        streams["zoneserver"] = new SOEInputStream(encryptionKey);
        streams["zoneserver"].toggleEncryption(true);
        streams["zoneserver"].on("data", function(err, data) {
            setTimeout(function() {
                debug("Data packet from zone server");
                m++;
                try {
                    var packet = gatewayProtocol.parse(data);
                    if (packet && packet.tunnelData) {
                        var zonePacket = zoneProtocol.parse(packet.tunnelData, packet.flags, false, referenceData);
                        if (zonePacket) {
                            if (ignoreZonePackets.indexOf(zonePacket.name) == -1 && (writeZonePackets.length == 0 || writeZonePackets.indexOf(zonePacket.name) > -1)) {
                                fs.writeFileSync(path.join(outPath, "zonepacket_" + packetNum(m) + "_" + zonePacket.name + "_server.dat"), packet.tunnelData);
                                fs.writeFileSync(path.join(outPath, "zonepacket_" + packetNum(m) + "_" + zonePacket.name + "_server.json"), JSON.stringify(zonePacket, null, 2));
                            }
                        }
                    }
                } catch(e) {
                    console.log("Failed parsing packet " + m + " (" + e + ")");
                    fs.writeFileSync(path.join(outPath, "zonepacket_" + packetNum(m) + "_failed_server.dat"), data);
                }
            },0);
        });

        streams["zoneclient"] = new SOEInputStream(encryptionKey);
        streams["zoneclient"].toggleEncryption(false);
        streams["zoneclient"].on("data", function(err, data) {
            setTimeout(function() {
                m++;
                debug("Data packet from zone client " + data[0]);
                try {
                    var packet = gatewayProtocol.parse(data);
                    if (packet && packet.tunnelData) {
                        var zonePacket = zoneProtocol.parse(packet.tunnelData, packet.flags, true, referenceData);
                        if (zonePacket) {
                            if (ignoreZonePackets.indexOf(zonePacket.name) == -1 && (writeZonePackets.length == 0 || writeZonePackets.indexOf(zonePacket.name) > -1)) {
                                fs.writeFileSync(path.join(outPath, "zonepacket_" + packetNum(m) + "_" + zonePacket.name + "_client.dat"), packet.tunnelData);
                                fs.writeFileSync(path.join(outPath, "zonepacket_" + packetNum(m) + "_" + zonePacket.name + "_client.json"), JSON.stringify(zonePacket, null, 2));
                            }
                        }
                    }

                } catch(e) {
                    console.log("Failed parsing packet " + m + " (" + e + ")");
                    fs.writeFileSync(path.join(outPath, "zonepacket_" + packetNum(m) + "_failed_client.dat"), data);
                }
            },0);
            if (firstClientPacket) {
                firstClientPacket = false;
                streams["zoneclient"].toggleEncryption(true);
            }
        });
    }
});

streams["loginclient"] = new SOEInputStream(loginKey);
streams["loginclient"].toggleEncryption(true);
streams["loginclient"].on("data", function(err, data) {
    m++;
    debug("Data packet from login client");
    try {
        var packet = loginProtocol.parse(data);
        if (!packet) {
            packet = {name: "failed"};
        }
        fs.writeFileSync(path.join(outPath, "loginpacket_" + packetNum(m) + "_" + packet.name + "_client.dat"), data);
        fs.writeFileSync(path.join(outPath, "loginpacket_" + packetNum(m) + "_" + packet.name + "_client.json"), JSON.stringify(packet, null, 2));
    } catch(e) {
        fs.writeFileSync(path.join(outPath, "loginpacket_" + packetNum(m) + "_failedhard_client.dat"), data);
        return;
    }
});


var parser = pcap.parse(inFile);

parser.on("packet", function(packet) {
    setTimeout(function() {

    var data = packet.data,
        src = Array.prototype.slice.apply(data, [26,30]).join("."),
        dst = Array.prototype.slice.apply(data, [30,34]).join("."),
        dataSize = data.readUInt16BE(0x26) - 8,
        packetData = data.slice(42, 42 + dataSize),
        stream, crcSeed, compression;

    if (src == testLoginServer) {
        stream = streams["loginserver"];
        crcSeed = serverConfig.login.crcSeed;
        compression = serverConfig.login.compression;
    } else if (src == testZoneServer) {
        stream = streams["zoneserver"];
        crcSeed = serverConfig.zone.crcSeed;
        compression = serverConfig.zone.compression;
    } else if (src == client) {
        if (dst == testLoginServer) {
            stream = streams["loginclient"];
            crcSeed = serverConfig.login.crcSeed;
            compression = serverConfig.login.compression;
        } else if (dst == testZoneServer) {
            stream = streams["zoneclient"];
            crcSeed = serverConfig.zone.crcSeed;
            compression = serverConfig.zone.compression;
        }
    }
    if (!stream) {
        return;
    }
    n++;

    //debug("Reading packet " + n + " [src: " + src + "] [dst: " + dst + "]");

    try {
    var result = protocol.parse(packetData, crcSeed, compression);

    if (result.appPackets) {
        for (var i=0;i<result.appPackets.length;i++) {
            var appPacket = result.appPackets[i];
            if (appPacket && appPacket.data) {
                stream.write(appPacket.data, appPacket.sequence, appPacket.fragment);
            }
        }
    }
    } catch(e) {
        fs.writeFileSync(path.join(outPath, "soepacket_failed_" + n + ".dat"), packetData);
        throw e;
    }
    },1);
});
