var fs = require("fs"),
    path = require("path"),
    util = require("util");

function LoginBackendJSON(dataPath) {
    this._dataPath = dataPath;
}

LoginBackendJSON.prototype.login = function(sessionId, fingerprint, callback) {
    var me = this;
    process.nextTick(function() {
        callback(null, {
            loggedIn: true,
            status: 1,
            isMember: false,
            isInternal: false,
            namespace: "",
            payload: fs.readFileSync(path.join(me._dataPath, "businessenvironments.dat"))
        });
    });
};

LoginBackendJSON.prototype.getServerList = function(callback) {
    fs.readFile(path.join(this._dataPath, "serverlist.json"), function(err, data) {
        callback(null, JSON.parse(data));
    });
};

LoginBackendJSON.prototype.getCharacterInfo = function(callback) {
    fs.readFile(path.join(this._dataPath, "characterinfo.json"), function(err, data) {
        fs.writeFileSync("foo.dat", JSON.stringify(JSON.parse(data), null, 4));
        callback(null, JSON.parse(data));
    });
};

LoginBackendJSON.prototype.characterLogin = function(characterId, serverId, locale, callback) {
    process.nextTick(function() {
        callback(null, {
            "characterId": [17,29,70,153,222,137,20,3],
            "serverId": 101,
            "unknown": 0,
            "status": 1,
            "payload": {
                "serverAddress": "199.108.194.36:20122",
                "serverTicket": "4mjQbz4MCGmxBkg",
                "encryptionKey": "abababababababab",
                "characterId": [17,29,70,153,222,137,20,3],
                "unknown1": 722776196,
                "unknown2": 0,
                "stationName": "reside0cupboy",
                "characterName": "VanuLabsNC"
            }
        });
    });
};

exports.LoginBackendJSON = LoginBackendJSON;