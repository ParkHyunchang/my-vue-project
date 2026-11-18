/* eslint-disable no-console */
const { spawn } = require('node:child_process');
const path = require('node:path');
const { isolatedEnvironment } = require('./test-environment.cjs');
const env = isolatedEnvironment(process.env);
env.NODE_ENV = 'development';
env.BABEL_ENV = 'development';
env.VUE_APP_API_URL = '';
console.log('[isolated browser] http://localhost:13100 -> http://127.0.0.1:13200 only');
console.log('[isolated browser] .env loading disabled; external browser resources blocked by CSP.');
const child = spawn(process.execPath, [path.join(__dirname, 'serve-isolated-worker.cjs')], {
  cwd: path.resolve(__dirname, '..'), env, stdio: 'inherit',
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code, signal) => { process.exitCode = signal ? 1 : code; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
