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

sudo yum install expect -y

expect -c 'spawn git pull origin "<%= gitData.branch %>";
expect Username;
send "<%= gitData.username %>\r";
expect Password;
send "<%= gitData.password %>\r";
interact;'

echo "git pull done"
if [ <%= isReact %> == true ]; then
    echo "installing client modules";
    cd client;
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
    npm run build
    cd .. && cd server;
fi;

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

echo "enviorment = $NODE_ENV"

pm2 restart <%= appIdentifier %> --update-env
