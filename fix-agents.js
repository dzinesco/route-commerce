// Patch global HTTP/HTTPS agents to use the correct outbound interface
// Fixes EADDRNOTAVAIL on macOS when Node.js can't find the right source address
const http = require('http');
const https = require('https');
http.globalAgent.options.localAddress = '192.168.50.71';
http.globalAgent.options.keepAlive = false;
https.globalAgent.options.localAddress = '192.168.50.71';
https.globalAgent.options.keepAlive = false;
console.log('Patched global agents: localAddress=192.168.50.71');