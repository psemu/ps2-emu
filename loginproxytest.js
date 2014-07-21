#!/usr/bin/env node
var LoginProxy = require("soe-network").LoginProxy,
    fs = require("fs"),
    atob = require("atob"),
    log = require("loglevel");

log.setLevel("debug");

var config = {
    loginServerAddress: "lvspsn-tst-l01.planetside2.com",
    loginServerPort: 20042,
    loginKey: atob("F70IaxuU8C/w7FPXY1ibXw=="),
    loginLocalPort: 42042
};

var loginProxy = new LoginProxy(config.loginServerAddress, config.loginServerPort, config.loginKey, config.loginLocalPort);

loginProxy.on("clientdata", function(err, packet) {
    log.info("[LoginProxyTest]", "Client sent: " + packet.name);
});

loginProxy.on("serverdata", function(err, packet) {
    log.info("[LoginProxyTest]", "Server sent: " + packet.name);
});

loginProxy.start();

