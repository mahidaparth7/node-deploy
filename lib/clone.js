var spawn = require('child_process').spawn;
var archiver = require('archiver');
var fs = require('fs');
var pathResolve = require('path').resolve;
var _ = require('underscore');

function cloneApp(host, appPath, callback) {
    
    console.log('cloned');
    console.log('appPath', appPath);
    // console.log('buildLocaltion', buildLocaltion);
    // console.log('bundlePath', bundlePath);
    callback();
}

module.exports = cloneApp;