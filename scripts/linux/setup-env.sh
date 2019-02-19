#!/bin/bash
set -e

if [ ! -d <%= appDirectory %> ]; then
   echo "creating directory";
   mkdir -p <%= appDirectory %>
fi;

cd <%= appDirectory %>

if [ -d <%= appName %> ]; then
   sudo echo "Project already exists."
   exit;
fi;

npm install -g pm2

sudo  echo "cloning started"
git clone --branch <%= gitData.branch %> <%= gitData.url %> <%= appName %>
sudo echo "cloning done"
cd <%= appName %>

if [ -f package.json ]; then
    echo "installing node-modules"
    npm install
    echo "installed node-modules"
fi

if [ -f bower.json ]; then
    echo "installing bower components"
    bower install --allow-root
    echo "bower components installed"
fi

sudo echo "up on pm2"

pm2 start app.js --name=<%= appIdentifier %>

sudo echo "server started on pm2"