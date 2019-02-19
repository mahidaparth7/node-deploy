var nodemiral = require('nodemiral');
var fs = require('fs');
var path = require('path');
var util = require('util');

var SCRIPT_DIR = path.resolve(__dirname, '../../scripts/linux');
var TEMPLATES_DIR = path.resolve(__dirname, '../../templates/linux');

exports.setup = function (config) {
    var taskList = nodemiral.taskList('Setup (linux)');

    // Installation
    if (config.setupNode) {
        taskList.executeScript('Installing Node.js', {
            script: path.resolve(SCRIPT_DIR, 'install-node.sh'),
            vars: {
                nodeVersion: config.nodeVersion
            }
        });
    }

    if (config.setupPhantom) {
        taskList.executeScript('Installing PhantomJS', {
            script: path.resolve(SCRIPT_DIR, 'install-phantomjs.sh')
        });
    }

    if (config.setupMongo) {
        taskList.copy('Copying MongoDB configuration', {
            src: path.resolve(TEMPLATES_DIR, 'mongodb.conf'),
            dest: '/etc/mongodb.conf'
        });

        taskList.executeScript('Installing MongoDB', {
            script: path.resolve(SCRIPT_DIR, 'install-mongodb.sh')
        });
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

    //Configurations
    taskList.executeScript('Setting up Project', {
        script: path.resolve(SCRIPT_DIR, 'setup-env.sh'),
        vars: {
            appName: config.appName,
            appDirectory: config.appDirectory,
            appIdentifier: config.appIdentifier,
            gitData: config.git
        }
    }, function (err, code, logs) {
        console.error(err);
        console.info(code);
        console.log(logs);
    });

    return taskList;
};

exports.deploy = function (bundlePath, env, deployCheckWaitTime, appName, appDirectory, appIdentifier, gitData) {
    var taskList = nodemiral.taskList("Deploy app '" + appName + "' (linux)");

    // taskList.copy('Uploading bundle', {
    //   src: bundlePath,
    //   dest: '/opt/' + appName + '/tmp/bundle.tar.gz',
    //   progressBar: enableUploadProgressBar
    // });

    taskList.executeScript('Setting up Environment Variables', {
        script: path.resolve(TEMPLATES_DIR, 'env.sh'),
        vars: {
            env: env || {},
            appName: appName
        }
    });

    taskList.executeScript('Invoking cloaning process', {
        script: path.resolve(TEMPLATES_DIR, 'clone.sh'),
        vars: {
            deployCheckWaitTime: deployCheckWaitTime || 10,
            appName: appName,
            appDirectory: appDirectory,
            appIdentifier: appIdentifier,
            gitData: gitData
        }
    }, function (err, code, logs) {
        console.error(err);
        console.info(code);
        console.log(logs);
    });

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

exports.reconfig = function (env, appName, appIdentifier) {
    var taskList = nodemiral.taskList("Updating configurations (linux)");

    console.log('env', env);
    taskList.executeScript('Setting up Environment Variables', {
        script: path.resolve(TEMPLATES_DIR, 'env.sh'),
        vars: {
            env: env || {},
            appName: appName
        }
    });

    //restarting
    taskList.execute('Restarting app', {
        command: '(pm2 restart ' + appIdentifier + ')'
    });

    return taskList;
};

exports.restart = function (appIdentifier) {
    var taskList = nodemiral.taskList("Restarting Application (linux) " + appIdentifier);

    //restarting
    taskList.execute('Restarting app', {
        command: '(pm2 restart ' + appIdentifier + ')'
    });

    return taskList;
};

exports.stop = function (appIdentifier) {
    var taskList = nodemiral.taskList("Stopping Application (linux)");

    //stopping
    taskList.execute('Stopping app', {
        command: '(pm2 stop ' + appIdentifier + ')'
    });

    return taskList;
};

exports.start = function (appIdentifier) {
    var taskList = nodemiral.taskList("Starting Application (linux) " + appIdentifier);

    //starting
    taskList.execute('Starting app', {
        command: '(pm2 start ' + appIdentifier + ')'
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
        script: path.resolve(SCRIPT_DIR, 'install-stud.sh')
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