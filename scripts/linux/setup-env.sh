#!/bin/bash
set -e

if [ ! -d <%= appDirectory %> ]; then
    echo "creating directory";
    mkdir -p <%= appDirectory %>
fi;

cd <%= appDirectory %>

if [ -d <%= appName %> ]; then
    echo "Project already exists."
    exit;
fi;

if [ <%= setupPm2 %> == true ]; then
    echo "Installing pm2"
    sudo npm install -g --no-optional pm2
    echo "pm2 installed"
fi;

if [ <%= setupBower %> == true ]; then
    echo "Installing bower"
    sudo npm install -g bower
    echo "Bower installed"
fi;


sudo apt-get install -y expect

echo "Start System updating"
sudo apt-get update -y
echo "System updated successfully"

sudo git config --global user.email <%= gitData.email %>
sudo git config --global user.name <%= gitData.username %>

echo "cloning started from branch" +  <%= gitData.branch %>

expect -c 'spawn git clone --branch "<%= gitData.branch %>" "<%= gitData.url %>" "<%= appName %>";
expect Username;
send "<%= gitData.username %>\r";
expect Password;
send "<%= gitData.password %>\r";
interact;'

echo "cloning done"

cd <%= appName %>

sudo git config user.email <%= gitData.email %>
sudo git config user.name <%= gitData.username %>

git config --global --unset user.name
git config --global --unset user.email

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

echo "up on pm2"

pm2 start <%= entryFile %> --name=<%= appIdentifier %>

echo "server started on pm2"