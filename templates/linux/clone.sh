#!/bin/bash
set -e

if [ ! -d <%= appDirectory %> ]; then
   echo "Project not exists, Please setup first"
   exit
fi;

cd <%= appDirectory %>

if [ ! -d <%= appName %> ]; then
   echo "Project not exists, Please setup first"
   exit
fi;

cd <%= appName %>

git remote set-url origin <%= gitData.url %>

git reset --hard HEAD

echo "git pull started"
git pull
echo "git pull done"

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

pm2 restart <%= appIdentifier %>
