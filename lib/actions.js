var nodemiral = require('nodemiral');
var path = require('path');
var fs = require('fs');
var rimraf = require('rimraf');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var uuid = require('uuid');
var format = require('util').format;
var extend = require('util')._extend;
var _ = require('underscore');
var async = require('async');
var os = require('os');
var host = '';
require('colors');

module.exports = Actions;

function Actions(config, cwd) {
    this.cwd = cwd;
    this.config = config;
    this.sessionsMap = this._createSessionsMap(config);
}

Actions.prototype._createSessionsMap = function (config) {
    var sessionsMap = {};

    config.servers.forEach(function (server) {
        host = server.host;
        var auth = {
            username: server.username
        };

        if (server.pem) {
            auth.pem = fs.readFileSync(path.resolve(server.pem), 'utf8');
        } else {
            auth.password = server.password;
        }

        var nodemiralOptions = {
            ssh: server.sshOptions,
            keepAlive: true
        };

        if (!sessionsMap[server.os]) {
            sessionsMap[server.os] = {
                sessions: [],
                taskListsBuilder: require('./taskLists')(server.os)
            };
        }

        var session = nodemiral.session(host, auth, nodemiralOptions);
        session._serverConfig = server;
        sessionsMap[server.os].sessions.push(session);
    });

    return sessionsMap;
};

Actions.prototype._executePararell = function (actionName, args) {
    var self = this;
    var sessionInfoList = _.values(self.sessionsMap);
    async.map(
        sessionInfoList,
        function (sessionsInfo, callback) {
            var taskList = sessionsInfo.taskListsBuilder[actionName]
                .apply(sessionsInfo.taskListsBuilder, args);
            taskList.run(sessionsInfo.sessions, function (summaryMap) {
                callback(null, summaryMap);
            });
        },
        whenAfterCompleted
    );
};

Actions.prototype.setup = function () {
    var self = this;

    let verbose = process.argv[process.argv.length - 2] || false;
    let isVerbose = false;
    if (verbose === 'verbose') {
        isVerbose = true
    }

    var sessionsData = [];
    _.forEach(self.sessionsMap, function (sessionsInfo) {
        var taskListsBuilder = sessionsInfo.taskListsBuilder;
        _.forEach(sessionsInfo.sessions, function (session) {
            sessionsData.push({
                taskListsBuilder: taskListsBuilder,
                session: session
            });
        });
    });
    var buildLocation = path.resolve(os.tmpdir(), uuid.v4());
    async.mapSeries(
        sessionsData,
        function (sessionData, callback) {
            var session = sessionData.session;
            var taskListsBuilder = sessionData.taskListsBuilder;

            session.execute("echo `awk -F= '/^NAME/{print $2}' /etc/os-release`",
                function (err, code, logs) {
                    console.log(logs.stdout);
                    let tmpOSName = logs.stdout;
                    let osName = null;
                    if (tmpOSName && tmpOSName.toLowerCase().includes("cent")) {
                        osName = 'cent';
                    } else if (tmpOSName && tmpOSName.toLowerCase().includes("ubuntu")) {
                        osName = 'linux';
                    } else {
                        console.log('Unknown os'.red.bold);
                        process.exit(1);
                    }
                    var taskList = taskListsBuilder.setup(self.config, isVerbose, osName);
                    taskList.run(session, function (summaryMap) {
                        callback(null, summaryMap);
                    });
                });
        },
        whenAfterDeployed(buildLocation)
    );
};

Actions.prototype.deploy = function () {
    var self = this;

    var buildLocation = path.resolve(os.tmpdir(), uuid.v4());
    var bundlePath = path.resolve(buildLocation, 'bundle.tar.gz');

    // spawn inherits env vars from process.env
    // so we can simply set them like this
    process.env.BUILD_LOCATION = buildLocation;

    var deployCheckWaitTime = this.config.deployCheckWaitTime;
    var appName = this.config.appName;
    var enableUploadProgressBar = this.config.enableUploadProgressBar;

    console.log("Build done", bundlePath);

    var sessionsData = [];
    _.forEach(self.sessionsMap, function (sessionsInfo) {
        var taskListsBuilder = sessionsInfo.taskListsBuilder;
        _.forEach(sessionsInfo.sessions, function (session) {
            sessionsData.push({
                taskListsBuilder: taskListsBuilder,
                session: session
            });
        });
    });
    async.mapSeries(
        sessionsData,
        function (sessionData, callback) {
            var session = sessionData.session;
            var taskListsBuilder = sessionData.taskListsBuilder;
            var env = _.extend({}, self.config.env, session._serverConfig.env);
            console.log('env', env);
            let verbose = process.argv[process.argv.length - 2] || false;
            let isVerbose = false;
            if (verbose === 'verbose') {
                isVerbose = true
            }

            session.execute("echo `awk -F= '/^NAME/{print $2}' /etc/os-release`",
                function (err, code, logs) {
                    console.log(logs.stdout);
                    let tmpOSName = logs.stdout;
                    let osName = null;
                    if (tmpOSName && tmpOSName.toLowerCase().includes("cent")) {
                        osName = 'cent';
                    } else if (tmpOSName && tmpOSName.toLowerCase().includes("ubuntu")) {
                        osName = 'linux';
                    } else {
                        console.log('Unknown os'.red.bold);
                        process.exit(1);
                    }
                    var taskList = taskListsBuilder.deploy(
                        bundlePath, env,
                        deployCheckWaitTime, appName, self.config.appDirectory, self.config.appIdentifier, self.config.git, isVerbose, osName);
                    taskList.run(session, function (summaryMap) {
                        callback(null, summaryMap);
                    });
                });
        },
        whenAfterDeployed(buildLocation)
    );
};

Actions.prototype.reconfig = function () {
    var self = this;
    var sessionInfoList = [];
    for (var os in self.sessionsMap) {
        var sessionsInfo = self.sessionsMap[os];
        sessionsInfo.sessions.forEach(function (session) {
            var env = _.extend({}, self.config.env, session._serverConfig.env);
            var taskList = sessionsInfo.taskListsBuilder.reconfig(
                env, self.config.appIdentifier);
            sessionInfoList.push({
                taskList: taskList,
                session: session
            });
        });
    }

    async.mapSeries(
        sessionInfoList,
        function (sessionInfo, callback) {
            sessionInfo.taskList.run(sessionInfo.session, function (summaryMap) {
                callback(null, summaryMap);
            });
        },
        whenAfterCompleted
    );
};

Actions.prototype.restart = function () {
    this._executePararell("restart", [this.config.appIdentifier]);
};

Actions.prototype.stop = function () {
    this._executePararell("stop", [this.config.appIdentifier]);
};

Actions.prototype.start = function () {
    this._executePararell("start", [this.config.appIdentifier]);
};

Actions.prototype.logs = function () {
    var self = this;
    var tailOptions = process.argv.slice(3).join(" ");

    for (var os in self.sessionsMap) {
        var sessionsInfo = self.sessionsMap[os];
        sessionsInfo.sessions.forEach(function (session) {
            var hostPrefix = '[' + session._host + '] ';
            var options = {
                onStdout: function (data) {
                    process.stdout.write(hostPrefix + data.toString());
                },
                onStderr: function (data) {
                    process.stderr.write(hostPrefix + data.toString());
                }
            };

            if (os == 'linux') {
                var logLines = process.argv[process.argv.length - 2] || self.config.logLines;
                var command = 'pm2 logs ' + self.config.appIdentifier + ' --lines ' + logLines;
            } else {
                throw "Unknown OS: " + os;
            }
            session.execute(command, options);
        });
    }

};

Actions.prototype.postInstall = function () {
    var self = this;

    for (var os in self.sessionsMap) {
        var sessionsInfo = self.sessionsMap[os];
        sessionsInfo.sessions.forEach(function (session) {
            var hostPrefix = '[' + session._host + '] ';
            var options = {
                onStdout: function (data) {
                    process.stdout.write(hostPrefix + data.toString());
                },
                onStderr: function (data) {
                    process.stderr.write(hostPrefix + data.toString());
                }
            };

            if (os == 'linux') {
                var command = self.config.postInstall;
            } else {
                throw "Unknown OS: " + os;
            }
            session.execute(command, options);
        });
    }
};


Actions.prototype.run = function () {
    var self = this;

    for (var os in self.sessionsMap) {
        var sessionsInfo = self.sessionsMap[os];
        sessionsInfo.sessions.forEach(function (session) {
            var hostPrefix = '[' + session._host + '] ';
            var options = {
                onStdout: function (data) {
                    process.stdout.write(hostPrefix + data.toString());
                },
                onStderr: function (data) {
                    process.stderr.write(hostPrefix + data.toString());
                }
            };

            if (os == 'linux') {
                var command = process.argv[process.argv.length - 2];
            } else {
                throw "Unknown OS: " + os;
            }
            session.execute(command, options);
        });
    }
};

Actions.init = function () {

    var jsonConfigFile = process.argv[process.argv.length - 1];

    if (!/\.json$/.test(jsonConfigFile)) {
        console.error('Please specify your JSON config file as the last argument!'.red.bold);
        return process.exit(1);
    }

    var destSdepJson = path.resolve(jsonConfigFile);

    if (fs.existsSync(destSdepJson)) {
        console.error('A Project Already Exists'.bold.red);
        process.exit(1);
    }

    var exampleSdepJson = path.resolve(__dirname, '../example/example.json');

    copyFile(exampleSdepJson, destSdepJson);

    console.log('Empty Project Initialized!'.bold.green);

    function copyFile(src, dest) {
        var content = fs.readFileSync(src, 'utf8');
        fs.writeFileSync(dest, content);
    }
};

function whenAfterDeployed(buildLocation) {
    return function (error, summaryMaps) {
        rimraf.sync(buildLocation);
        whenAfterCompleted(error, summaryMaps);
    };
}

function whenAfterCompleted(error, summaryMaps) {
    var errorCode = error || haveSummaryMapsErrors(summaryMaps) ? 1 : 0;
    process.exit(errorCode);
}

function haveSummaryMapsErrors(summaryMaps) {
    return _.some(summaryMaps, hasSummaryMapErrors);
}

function hasSummaryMapErrors(summaryMap) {
    return _.some(summaryMap, function (summary) {
        return summary.error;
    });
}