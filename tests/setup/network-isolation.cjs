/* global globalThis */
// This setup runs before each suite (Node and jsdom), including ordinary npm test.
// Do not load dotenv or Vue CLI here. Never retain an inherited production API URL.
process.env.VUE_APP_API_URL = 'http://isolated.invalid';

function blocked() {
  const error = new Error('ISOLATED_NETWORK_BLOCKED: use an explicit network test double');
  error.code = 'ISOLATED_NETWORK_BLOCKED';
  throw error;
}

const childProcess = require('child_process');
for (const name of ['exec', 'execSync', 'execFile', 'execFileSync', 'spawn', 'spawnSync', 'fork']) {
  childProcess[name] = blocked;
}
childProcess.ChildProcess.prototype.spawn = blocked;
require('worker_threads').Worker = blocked;

for (const name of ['http', 'https']) {
  const transport = require(name);
  transport.request = blocked;
  transport.get = blocked;
}
const net = require('net');
net.connect = blocked;
net.createConnection = blocked;
net.Socket.prototype.connect = blocked;
require('tls').connect = blocked;
require('http2').connect = blocked;
require('dgram').Socket.prototype.send = blocked;
require('dgram').Socket.prototype.connect = blocked;
const dns = require('dns');
for (const name of Object.keys(dns)) {
  if (name === 'lookup' || name === 'lookupService' || name.startsWith('resolve') || name === 'reverse') {
    if (typeof dns[name] === 'function') dns[name] = blocked;
  }
}
for (const name of Object.keys(dns.promises)) {
  if (typeof dns.promises[name] === 'function' && name !== 'Resolver') dns.promises[name] = blocked;
}
for (const Resolver of [dns.Resolver, dns.promises.Resolver]) {
  for (const name of Object.getOwnPropertyNames(Resolver.prototype)) {
    if (name.startsWith('resolve') || name === 'reverse') Resolver.prototype[name] = blocked;
  }
}

globalThis.fetch = async () => blocked();
globalThis.WebSocket = blocked;
globalThis.EventSource = blocked;
if (globalThis.XMLHttpRequest) {
  globalThis.XMLHttpRequest.prototype.open = blocked;
  globalThis.XMLHttpRequest.prototype.send = blocked;
} else {
  globalThis.XMLHttpRequest = blocked;
}
if (globalThis.navigator) {
  Object.defineProperty(globalThis.navigator, 'sendBeacon', { configurable: true, value: blocked });
}

// Explicit adapters and module mocks are still usable; an unmocked Axios call fails.
const axios = require('axios');
axios.defaults.adapter = async () => blocked();
