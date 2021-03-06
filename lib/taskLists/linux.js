var nodemiral = require('nodemiral');
var fs = require('fs');
var path = require('path');
var util = require('util');
require('colors');

var SCRIPT_DIR = path.resolve(__dirname, '../../scripts');
var TEMPLATES_DIR = path.resolve(__dirname, '../../templates/linux');
var logOptions = {
    onStdout: () => data => {
        process.stdout.write(data);
    },
    onStderr: () => data => {
        process.stderr.write(data);
    }
};

exports.setup = function (config, isVerbose, osName) {
    var taskList = nodemiral.taskList('Setup (linux)');
    // Installation
    if (config.setupNode) {
        let nodeSetupOption = {
            script: path.resolve(SCRIPT_DIR, osName, 'install-node.sh'),
            vars: {
                nodeVersion: config.nodeVersion
            }
        };
        if (isVerbose) {
            Object.assign(nodeSetupOption, logOptions);
        }
        taskList.executeScript('Installing Node.js', nodeSetupOption);
    }

    if (config.setupPhantom) {
        taskList.executeScript('Installing PhantomJS', {
            script: path.resolve(SCRIPT_DIR, osName, 'install-phantomjs.sh')
        });
    }

    if (config.setupMongo) {
        taskList.copy('Copying MongoDB configuration', {
            src: path.resolve(SCRIPT_DIR, osName, 'mongodb.conf'),
            dest: '/etc/mongod.conf'
        });

        // if (os === 'cent') {
        //     taskList.copy('Copying MongoDB install configuration', {
        //         src: path.resolve(SCRIPT_DIR, osName, 'mongodb-install.conf'),
        //         dest: '/etc/mongodb.conf'
        //     });
        // }

        let mongoOptions = {
            script: path.resolve(SCRIPT_DIR, osName, 'install-mongodb.sh'),
            vars: {
                mongoVersion: config.mongoVersion
            }
        };

        if (isVerbose) {
            Object.assign(mongoOptions, logOptions);
        }

        taskList.executeScript('Installing MongoDB', mongoOptions);
    }

    if (config.ssl) {
        installStud(taskList);
        configureStud(taskList, config.ssl.pem, config.ssl.backendPort);
    }

    taskList.executeScript('Setting up Environment Variables', {
        script: path.resolve(TEMPLATES_DIR, 'env.sh'),
        vars: {
            env: config.env || {},
            appName: config.appName
        }
    });

    if (config.preInstall && config.preInstall != '') {
        taskList.execute('pre Installing', {
            command: config.preInstall
        });
    }

    let setupOptions = {
        script: path.resolve(SCRIPT_DIR, osName, 'setup-env.sh'),
        vars: {
            appName: config.appName,
            appDirectory: config.appDirectory,
            appIdentifier: config.appIdentifier,
            gitData: config.git,
            entryFile: config.entryFile,
            nodeEnv: config.env.NODE_ENV || 'production',
            isReact: config.isReact,
            setupPm2: config.setupPm2,
            setupBower: config.setupBower,
        }
    };

    if (isVerbose) {
        Object.assign(setupOptions, logOptions);
    }

    //Configurations
    taskList.executeScript('Setting up Project', setupOptions);

    if (config.postInstall && config.postInstall != '') {
        taskList.execute('Post Installing', {
            command: config.postInstall
        });
    }

    taskList.execute('', {
        command: 'echo Hi'
    }, function (err, code, log) {
        console.log('Project setup completed.'.green.bold);
    });

    return taskList;
};

exports.deploy = function (bundlePath, env, deployCheckWaitTime, appName, appDirectory, appIdentifier, gitData, isVerbose, osName, isReact) {
    var taskList = nodemiral.taskList("Deploy app '" + appName + "' (linux)");

    taskList.executeScript('Setting up Environment Variables', {
        script: path.resolve(TEMPLATES_DIR, 'env.sh'),
        vars: {
            env: env || {},
            appName: appName
        },
        onStdout: () => data => {
            process.stdout.write(data);
        },
        onStderr: () => data => {
            process.stderr.write(data);
        }
    });

    let cloneOptions = {
        script: path.resolve(SCRIPT_DIR, osName, 'clone.sh'),
        vars: {
            deployCheckWaitTime: deployCheckWaitTime || 10,
            appName: appName,
            appDirectory: appDirectory,
            appIdentifier: appIdentifier,
            gitData: gitData,
            nodeEnv: env.NODE_ENV || 'production',
            isReact: isReact,
        }
    };

    if (isVerbose) {
        Object.assign(cloneOptions, logOptions);
    }

    taskList.executeScript('Invoking cloaning process', cloneOptions);

    // deploying
    // taskList.executeScript('Invoking deployment process', {
    //   script: path.resolve(TEMPLATES_DIR, 'deploy.sh'),
    //   vars: {
    //     deployCheckWaitTime: deployCheckWaitTime || 10,
    //     appName: appName
    //   }
    // });

    return taskList;
};

exports.reconfig = function (env, appIdentifier) {
    var taskList = nodemiral.taskList("Updating configurations (linux)");

    console.log('env', env);
    taskList.executeScript('Setting up Environment Variables', {
        script: path.resolve(TEMPLATES_DIR, 'env.sh'),
        vars: {
            env: env || {}
        }
    });

    //restarting
    taskList.execute('Restarting app', {
        command: '(pm2 restart ' + appIdentifier + ' --update-env)'
    }, function (err, code, logs) {
        console.log(err);
    });

    return taskList;
};

exports.restart = function (appIdentifier) {
    var taskList = nodemiral.taskList("Restarting Application (linux) " + appIdentifier);

    //restarting
    taskList.execute('Restarting app', {
        command: '(pm2 restart ' + appIdentifier + ' --update-env)'
    }, function (err, code, logs) {
        console.log(err);
    });

    return taskList;
};

exports.stop = function (appIdentifier) {
    var taskList = nodemiral.taskList("Stopping Application (linux)");

    //stopping
    taskList.execute('Stopping app', {
        command: '(pm2 stop ' + appIdentifier + ')'
    }, function (err, code, logs) {
        console.log(err);
    });

    return taskList;
};

exports.start = function (appIdentifier) {
    var taskList = nodemiral.taskList("Starting Application (linux) " + appIdentifier);

    //starting
    taskList.execute('Starting app', {
        command: '(pm2 start ' + appIdentifier + ' --update-env)'
    }, function (err, code, logs) {
        console.log(err);
    });

    return taskList;
};

exports.logs = function (appIdentifier) {
    var taskList = nodemiral.taskList("Logging Application (linux)");

    //stopping
    taskList.execute('Logging app', {
        command: '(pm2 logs ' + appIdentifier + ' --lines 200)'
    });

    return taskList;
};


function installStud(taskList) {
    taskList.executeScript('Installing Stud', {
        script: path.resolve(SCRIPT_DIR, 'linux', 'install-stud.sh')
    });
}

function configureStud(taskList, pemFilePath, port) {
    var backend = {
        host: '127.0.0.1',
        port: port
    };

    taskList.copy('Configuring Stud for Upstart', {
        src: path.resolve(TEMPLATES_DIR, 'stud.init.conf'),
        dest: '/etc/init/stud.conf'
    });

    taskList.copy('Configuring SSL', {
        src: pemFilePath,
        dest: '/opt/stud/ssl.pem'
    });


    taskList.copy('Configuring Stud', {
        src: path.resolve(TEMPLATES_DIR, 'stud.conf'),
        dest: '/opt/stud/stud.conf',
        vars: {
            backend: util.format('[%s]:%d', backend.host, backend.port)
        }
    });

    taskList.execute('Verifying SSL Configurations (ssl.pem)', {
        command: 'stud --test --config=/opt/stud/stud.conf'
    });

    //restart stud
    taskList.execute('Starting Stud', {
        command: '(sudo stop stud || :) && (sudo start stud || :)'
    });
}