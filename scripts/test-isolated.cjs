/* eslint-disable no-console */
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { isolatedEnvironment } = require('./test-environment.cjs');

// Run Jest directly: Vue CLI's .env loading and development proxy are not used.
const env = isolatedEnvironment(process.env);
console.log('[isolated] Vue/Jest unit tests; backend not started; .env not loaded.');
console.log('[isolated] Network APIs blocked by Jest setup; use explicit test doubles.');
console.log('[running] Local Jest, all suites, one process (180 second limit).');
const result = spawnSync(process.execPath, [
  require.resolve('jest/bin/jest'), '--runInBand', '--watch=false',
], { cwd: path.resolve(__dirname, '..'), env, stdio: 'inherit', timeout: 180000 });
if (result.error || result.signal) {
  console.error('[incomplete] Test process interrupted or could not finish; not a pass.');
  process.exitCode = 1;
} else {
  process.exitCode = result.status === 0 ? 0 : (result.status || 1);
  console.log(result.status === 0 ? '[passed] All Jest suites passed.' : '[failed] See Jest failures above.');
}
