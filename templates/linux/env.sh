#!/bin/bash

<% for(var key in env) { %>
  echo 'key =>' key 
  echo "export " <%- key %>=<%- ("" + env[key]).replace(/./ig, '\\$&') %> >>~/.bashrc
<% } %>

source ~/.bashrc
