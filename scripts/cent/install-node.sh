#!/bin/bash
set -e

# Required to update system
echo "Start System updating"
sudo yum update -y
echo "System updated successfully"

echo "Installing dev tool"
yum install -y gcc gcc-c++
echo "Dev tool successfully installed"

echo "Installing dev tool make"
yum install -y make
echo "Dev tool make successfully installed"

echo "Installing wget"
yum install -y wget
echo "wget successfully installed"

echo "Installing open-ssl"
yum install -y openssl-devel
echo "Open-ssl successfully installed"

echo "Installing curl"
yum install -y curl
echo "Curl installed"

echo "Installing git"
yum install -y git
echo "Git installed"

# Install Node.js - either nodeVersion or which works with latest Meteor release
<% if (nodeVersion) { %>
  NODE_VERSION=<%= nodeVersion %>
<% } else {%>
  NODE_VERSION=0.10.36
<% } %>
echo "Set node Version = " <%= nodeVersion %>

ARCH=$(python -c 'import platform; print platform.architecture()[0]')
if [[ ${ARCH} == '64bit' ]]; then
  NODE_ARCH=x64
else
  NODE_ARCH=x86
fi


NODE_DIST=node-v${NODE_VERSION}-linux-${NODE_ARCH}
echo "Start downloading node"
cd /tmp
wget http://nodejs.org/dist/v${NODE_VERSION}/${NODE_DIST}.tar.gz

echo "Node downloaded."

echo "Installing node"
tar xvzf ${NODE_DIST}.tar.gz
echo "Node installed"

echo "Setting Node Variable"

sudo rm -rf /opt/nodejs
sudo mv ${NODE_DIST} /opt/nodejs

sudo ln -sf /opt/nodejs/bin/node /usr/bin/node
sudo ln -sf /opt/nodejs/lib/node /usr/lib/node
sudo ln -sf /opt/nodejs/bin/npm /usr/bin/npm
sudo ln -sf /opt/nodejs/bin/node-waf /usr/bin/node-waf
npm config set prefix /usr/local

echo "Node Variable Setted."