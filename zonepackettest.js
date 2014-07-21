#!/usr/bin/env node
var fs = require("fs");
var ZoneProtocol = require("soe-network").ZoneProtocol;

var inFile = process.argv[2];
if (!fs.existsSync(inFile)) {
    throw "File does not exist: " + inFile;
}
var data = fs.readFileSync(inFile);

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

var protocol = new ZoneProtocol();

var packet = protocol.parse(data.slice(1), 0, false, referenceData);

console.log(JSON.stringify(packet, null, 2));

// var data2 = protocol.pack("Weapon.Weapon", packet.data);

// console.log(data);
// console.log(data2);
