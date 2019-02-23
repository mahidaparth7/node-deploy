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

git config user.email <%= gitData.email %>
git config user.name <%= gitData.username %>

git reset --hard HEAD

echo "git pull started"
echo <%= gitData.password %> | git pull
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
