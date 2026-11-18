const axios = require('axios');
const blocked = 'ISOLATED_NETWORK_BLOCKED';

test('inherited API targets are replaced with a non-service test value', () => {
  expect(process.env.VUE_APP_API_URL).toBe('http://isolated.invalid');
});

test('runner environment keeps only approved system variables and fixes test values', () => {
  const { isolatedEnvironment } = require('../../scripts/test-environment.cjs');
  const source = {
    SystemRoot: 'system-fixture', TEMP: 'temp-fixture', TZ: 'Asia/Seoul', LANG: 'en_US.UTF-8',
    PATH: 'not-forwarded', HOME: 'not-forwarded', USERPROFILE: 'not-forwarded', JAVA_HOME: 'not-forwarded',
    DB_PASSWORD: 'fake-secret', API_KEY: 'fake-secret', NODE_OPTIONS: '--require unwanted-loader',
    NODE_ENV: 'production', VUE_APP_API_URL: 'https://production.invalid', UNKNOWN_SECRET: 'fake-secret',
  };
  expect(isolatedEnvironment(source)).toEqual({
    SystemRoot: 'system-fixture', TEMP: 'temp-fixture', TZ: 'Asia/Seoul', LANG: 'en_US.UTF-8',
    NODE_ENV: 'test', BABEL_ENV: 'test', VUE_APP_API_URL: 'http://isolated.invalid',
  });
  expect(source.NODE_ENV).toBe('production');
});

test.each(['http', 'https'])('%s requests and shortcut GET fail before connecting', transport => {
  const api = require(transport);
  expect(() => api.request(`${transport}://127.0.0.1:1`)).toThrow(blocked);
  expect(() => api.get(`${transport}://example.invalid`)).toThrow(blocked);
});

test('raw TCP, TLS, HTTP2, UDP and DNS cannot bypass HTTP guards', () => {
  expect(() => require('net').connect(1, '127.0.0.1')).toThrow(blocked);
  expect(() => new (require('net').Socket)().connect(1)).toThrow(blocked);
  expect(() => require('tls').connect(1)).toThrow(blocked);
  expect(() => require('http2').connect('https://example.invalid')).toThrow(blocked);
  const socket = require('dgram').createSocket('udp4');
  expect(() => socket.send('test', 1, '127.0.0.1')).toThrow(blocked);
  socket.close();
  expect(() => require('dns').lookup('example.invalid', () => {})).toThrow(blocked);
});

test('fetch and unmocked Axios instances reject without real requests', async () => {
  await expect(fetch('https://example.invalid')).rejects.toThrow(blocked);
  await expect(axios.get('https://example.invalid')).rejects.toThrow(blocked);
  await expect(axios.create().post('/api/order', {})).rejects.toThrow(blocked);
});

test('explicit Axios response adapters remain usable', async () => {
  const client = axios.create({ adapter: async config => ({ config, status: 200, data: { ok: true }, headers: {} }) });
  await expect(client.get('/fixture')).resolves.toMatchObject({ data: { ok: true } });
});

test.each(['callback', 'promise'])('%s DNS Resolver instances cannot bypass isolation', mode => {
  const dns = require('dns');
  const resolver = new (mode === 'callback' ? dns.Resolver : dns.promises.Resolver)();
  expect(() => resolver.resolve('example.invalid', () => {})).toThrow(blocked);
  expect(() => resolver.resolve4('example.invalid', () => {})).toThrow(blocked);
  expect(() => resolver.reverse('127.0.0.1', () => {})).toThrow(blocked);
});

test.each(['exec', 'execSync', 'execFile', 'execFileSync', 'spawn', 'spawnSync', 'fork'])('child_process.%s cannot bypass isolation', method => {
  expect(() => require('child_process')[method]('unused-command')).toThrow(blocked);
});

test('direct child process and worker construction cannot bypass isolation', () => {
  const child = new (require('child_process').ChildProcess)();
  expect(() => child.spawn({ file: 'unused-command' })).toThrow(blocked);
  expect(() => new (require('worker_threads').Worker)('unused-worker.js')).toThrow(blocked);
});
