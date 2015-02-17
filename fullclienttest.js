#!/usr/bin/env node
process.env.DEBUG = [
    "SOEClient",
    "LoginClient",
    "ZoneClient",
    "FullClientTest"
].join(",");

var LoginClient = require("soe-network").LoginClient,
    ZoneClient = require("soe-network").ZoneClient,
    fs = require("fs"),
    atob = require("atob"),
    locale = require("soe-locale"),
    Jenkins = require("jenkins-hash"),
    prompt = require("prompt"),
    debug = require("debug")("FullClientTest");

var config = {
    gameId: "ps2",
    environment: "test",
    loginKey: atob("F70IaxuU8C/w7FPXY1ibXw=="),
    loginServerAddress: "lvspsn-tst-l01.planetside2.com",
    loginServerPort: 20042,
    localLoginPort: 55042,
    token: require("./token").token,
    sessionId: null,
    fingerprint: fs.readFileSync("data/systemfingerprint.xml",{encoding:"utf8"}),
    clientProtocol: "ClientProtocol_813", // needs to match the version expected by the zone server
    clientBuild: "0.908.3.282456" // server doesn't seem to care about this
};

var strings = locale.parseFromBuffer(
    fs.readFileSync("data/en_us_data.dat"),
    fs.readFileSync("data/en_us_data.dir")
);
// var stringMap = {};
// strings.forEach(function(obj) {
//     stringMap[obj.hash] = obj.string;
// });

function lookupString(stringId) {  
    var hash = Jenkins.lookup2("Global.Text." + stringId);
    if (hash in strings) {
        return strings[hash].string;
    } else {
        return "[STRING #" + stringId + "NOT FOUND]";
    }
}

  
var loginClient = new LoginClient(config.gameId, config.environment, config.loginServerAddress, config.loginServerPort, config.loginKey, config.localLoginPort),
    zoneClient,
    characters = [],
    servers = [];

function promptForCharacter() {
    console.log("Characters:");
    var characterName, serverId, serverName;
    for (var i=0;i<characters.length;i++) {
        characterName = characters[i].payload.name;
        serverId = characters[i].serverId;
        serverName = serverId;
        for (var j=0;j<servers.length;j++) {
            if (servers[j].serverId == serverId) {
                serverName = lookupString(servers[j].nameId);
                break;
            }
        }
        console.log(i+1, characters[i].payload.name, "(Server: " + serverName + ")");
    }
    prompt.get({
            properties: {
                characterIndex: {
                    description: "Select character:".magenta
                }
            }
        }, function(err, result) {
            if (result) {
                var character = characters[result.characterIndex - 1];
                if (character) {
                    console.log("Requesting login for character " + character.payload.name);
                    loginClient.requestCharacterLogin(
                        character.characterId,
                        character.serverId,
                        "<CharacterLoginRequest Locale=\"en_US\" LocaleId=\"8\" PreferredGatewayId=\"0\" SkipTutorial=\"0\"><ClientBuildInfo PlatformType=\"2\" OsName=\"Windows\" OsVersion=\"6.2\" AppVersion=\"0.573.4.313037\" BranchName=\"Test\"/></CharacterLoginRequest>"
                    );
                } else {
                    promptForCharacter();
                }
            } else {
                promptForCharacter();
            }
        }
    );
}


function startZoneClient(loginData) {
    var address = loginData.payload.match(/GatewayAddress=\"(.*?)\"/)[1].split(":")[0],
        port = +(loginData.payload.match(/GatewayAddress=\"(.*?)\"/)[1].split(":")[1]),
        ticket = loginData.payload.match(/GatewayTicket=\"(.*?)\"/)[1],
        key = new Buffer(atob(loginData.payload.match(/<Data>(.*?)<\/Data>/)[1])),
        characterId = loginData.characterId;

    debug("Starting Zone client for character " + characterId);

    zoneClient = new ZoneClient(address, port, key, characterId, ticket, config.clientProtocol, config.clientBuild);

    zoneClient.on("connect", function(err, data) {
        if (err) {
            quit(err);
        } else {
            zoneClient.login();
        }
    });

    zoneClient.on("login", function(err, data) {
        if (err) {
            quit(err);
        } else {
        }
    });

    zoneClient.on("error", function(err) {
        quit(err);
    });

    zoneClient.on("disconnect", function(err) {
        quit(err);
    });

    zoneClient.connect();
}



loginClient.on("connect", function(err, data) {
    if (err) {
        quit(err);
    } else {
        loginClient.login(config.token, config.fingerprint, config.sessionId);
    }
});

loginClient.on("login", function(err, data) {
    if (err) {
        quit(err);
    } else {
        loginClient.requestServerList();
        loginClient.requestCharacterInfo();
    }
});

loginClient.on("serverlist", function(err, data) {
    servers = data.servers;
});

loginClient.on("characterinfo", function(err, data) {
    characters = data.characters;
    promptForCharacter();
});

loginClient.on("characterlogin", function(err, data) {
    if (err) {
        quit(err);
    } else {
        loginClient.disconnect();
        startZoneClient(data);
    }
});

loginClient.on("error", function(err) {
    quit(err);
});

loginClient.on("disconnect", function(err) {
    quit(err);
});


process.on("SIGINT", function() {
    quit();
    debug("Bye!");
});


function quit(err) {
    if (err) {
        log.error(err);
    }
    if (loginClient) {
        loginClient.disconnect();
    }
    if (zoneClient) {
        zoneClient.disconnect();
    }
    setTimeout(function() {
        process.exit(0);
    },0);
}

prompt.start();

loginClient.connect();
