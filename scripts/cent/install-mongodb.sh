#!/bin/bash
set -e

if [[ "`pgrep mongod`" -ne "0" ]]
then
    echo "MongoDB is already running."
    sudo service mongod restart
    echo "restarted mongodb"
    exit;
fi

echo "Updating system";
sudo yum update
echo "System Updated";

echo "Setting Mongo Version";
<% if (mongoVersion) { %>
  MONGO_VERSION=<%= mongoVersion %>
<% } else { %>
  MONGO_VERSION=4.0
<% } %>

#sudo echo ${MONGO_CONFIG} > /etc/yum.repos.d/CentOS-Mongodb-org-${MONGO_VERSION}.repo

sudo rm -f /etc/yum.repos.d/mongodb-org.repo

cat >/etc/yum.repos.d/mongodb-org.repo <<EOL
[mongodb-org-${MONGO_VERSION}]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/7/mongodb-org/${MONGO_VERSION}/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-${MONGO_VERSION}.asc
EOL
echo "Setting Mongo Version Done";

echo "Installing Mongo";
sudo yum update -y
sudo yum install mongodb-org mongodb-org-server mongodb-org-shell mongodb-org-tools -y
echo "Mongodb installed";

echo "Setting Mongo Config";

mkdir -p /var/lib/mongo
mkdir -p /var/lib/mongodb
mkdir -p /var/log/mongodb

sudo mongod --dbpath /var/lib/mongodb

sudo mongod --wiredTigerCacheSizeGB 0.25

echo "Setting Mongo Config Done";

echo "Starting Mongo";
# Restart mongodb

sudo mongod restart --fork --syslog >/dev/null

echo "Mongodb started";