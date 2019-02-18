#!/bin/bash
set -e
cd <%= appDirectory %>
npm install -g pm2
if [ -d <%= appName %> ]; then
   pm2 stop <%= appName %>
   rm -rf <%= appName %>
   sudo echo "removed existing directory" --allow-root
fi;

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

pm2 start app.js --name=<%= appName %>

sudo echo "server started on pm2"