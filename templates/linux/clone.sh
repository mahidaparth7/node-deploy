#!/bin/bash
set -e
cd <%= appDirectory %>
if [ ! -d <%= appName %> ]; then
   echo "Project not exists, Please setup first"
   exit
fi;

cd <%= appName %>
sudo echo "git pull started"
git pull <%= gitData.url %>

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

pm2 restart <%= appName %>
