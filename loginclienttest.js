#!/usr/bin/env node
process.env.DEBUG = "LoginClient,LoginProtocol";

var LoginClient = require("soe-network").LoginClient,
    fs = require("fs"),
    atob = require("atob");

var gameId = "ps2",
    environment = "test",
    address = "lvspsn-tst-l01.planetside2.com",
    port = 20042,
    key = atob("F70IaxuU8C/w7FPXY1ibXw=="),
    //address = "127.0.0.1",
    //port = 42042,
    //port = 20042,
    token = require("./token").token,
    sessionId, // = "4Vdw?u9By4ofn1Sa",
    localPort = 44444,
    fingerprint = fs.readFileSync("data/systemfingerprint.xml",{encoding:"utf8"});
    
var client = new LoginClient(gameId, environment, address, port, key, localPort),
    characters,
    servers;

client.on("connect", function(err, data) {
    if (err) {
        console.error(err);
    } else {
        client.login(token, fingerprint, sessionId);
    }
});

client.on("login", function(err, data) {
    if (err) {
        console.error(err);
    } else {
        client.requestServerList();
        client.requestCharacterInfo();
    }
});

client.on("serverlist", function(err, data) {
    fs.writeFileSync("serverlist.json", JSON.stringify(data,null,4));
    servers = data.servers;
});

client.on("characterinfo", function(err, data) {
    fs.writeFileSync("characterinfo.json", JSON.stringify(data,null,4));
    characters = data.characters;
    client.requestCharacterLogin(
        characters[0].characterId,
        servers[0].serverId,
        "en_us"
    );
});

client.on("characterlogin", function(err, data) {
    if (err) {
        console.log(err);
    } else {
        fs.writeFileSync("characterloginreply.json", JSON.stringify(data, null, 4));
    }
});

client.on("error", function(err) {
    console.error(err);
});

client.on("disconnect", function(err) {
});

client.connect();
