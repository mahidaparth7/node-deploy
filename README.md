# node-up
Node app deployment based on sails-deploy

#Installation
npm install -g https://github.com/mahidaparth7/node-deploy

#Step 1: Initialize your project
cd path/to/app
node-up init
----------------

#Step 2: Customize your config
### There are a miniumum of 10 properties in your config that need to be changed.

**For each server:**
- host - Usually is the IP Address of the server
- server authentication - You can use a password or set pem to the path to a private key. If neither are set, it uses ssh-agent

**For Node, Mongo setup**
- set setupNode true if you want to install nodeJs.
- specify which node Version to install
- set setupMongo true if you want to install mongoDb.
- specify which mongoDb Version to install

**For App Setup**
- appDirectory: Set Folder path in which you want to setup app
- appName: App name Which will be created in appDirectory for project
- appIdentifier: App Id for pm2 server

**For Git Setup {Fields inside git key}**
- url: project git repo url
- branch: which branch you want to setup
- email: email of git account for git config email
- username: username of git account for git config and authentication, specify null if repo is public
- password: password of git account for authentication, specify null if repo is public

**Environment Setup**
- env: set your environment variables with key value pair in env.

**Other Settings**
- logLines: set default logLines for log
- preInstall: Add your command string that you want to pre install
- postInstall: Add your command string that you want to post install.

-----------------------------------

# Step 3: Setup Server
- It will setup your project on server in appDir and start server with pm2.
- `node-up setup your-setup-file.json`
  - use verbose for deep log.
  - `node-up setup verbose your-setup-file.json`


# Deploy Server / take pull on server and restart
- For take pull on project on server, It will take latest pull with specified branch on your project and restart the server.
- `node-up deploy your-setup-file.json`
  - use verbose for deep log.
  - `node-up deploy verbose your-setup-file.json`

# Extra Commands

- reconfig
  - `node-up reconfig your-setup-file.json`
  - Reconfig enviorment variables and restart project on server

- restart
  - `node-up restart your-setup-file.json`
  - Restart project on server

- stop
  - `node-up stop your-setup-file.json`
  - Stop project on server

- start
  - `node-up start your-setup-file.json`
  - Start project on server

- logs
  - `node-up logs your-setup-file.json`
  - Logs the server
  - use line numbers to get that line of logs. for eg: 100 lines of log. Default: 200
  - `node-up logs 100 your-setup-file.json`
