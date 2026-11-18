/* eslint-disable no-console */
const path = require('node:path');
const net = require('node:net');
const Service = require('@vue/cli-service/lib/Service');
const options = require('./isolated-browser.config.cjs');

// Service.init calls loadEnv for mode and base files. Override before init, so
// neither .env nor .env.local is opened. User config is likewise test-only.
const service = new Service(path.resolve(__dirname, '..'));
service.loadEnv = () => {};
service.loadUserOptions = () => options;
process.env.NODE_ENV = 'development';
process.env.BABEL_ENV = 'development';
process.env.VUE_APP_API_URL = '';

// Vue CLI otherwise silently chooses another port; fail instead of confusing QA.
const probe = net.createServer();
probe.once('error', () => { console.error('Port 13100 unavailable; isolated UI not started.'); process.exitCode = 1; });
probe.listen(13100, '127.0.0.1', () => probe.close(() => {
  service.run('serve', { host: '127.0.0.1', port: 13100 }, []).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}));
