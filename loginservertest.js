#!/usr/bin/env node
process.env.DEBUG = "LoginServer,LoginProtocol";

var LoginServer = require("soe-network").LoginServer,
    LoginBackendJSON = require("./loginbackendjson").LoginBackendJSON,
    fs = require("fs"),
    atob = require("atob"),
    log = require("loglevel");

log.setLevel("debug");

var gameId = "ps2",
    environment = "test",
    port = 20042,
    loginKey = atob("F70IaxuU8C/w7FPXY1ibXw==");


var backend = new LoginBackendJSON("./data");
var server = new LoginServer(gameId, environment, port, loginKey, backend);

server.on("connect", function(err, client) {
    if (err) {
        log.error(err);
    }
});

server.on("login", function(err, client) {
    if (err) {
        log.error(err);
    } else {
    }
});

server.on("error", function(err) {
    log.error(err);
});

server.on("disconnect", function(err) {
});

server.start();
