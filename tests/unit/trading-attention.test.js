/** @jest-environment jsdom */
const fs = require('fs'), path = require('path');
const { parse, compileScript } = require('@vue/compiler-sfc');
const { transformSync } = require('@babel/core');
const { createApp, nextTick, reactive, h } = require('vue');
const filename = path.resolve(__dirname, '../../src/components/stock/TradingAttention.vue');
const { descriptor } = parse(fs.readFileSync(filename, 'utf8'), { filename });
const code = transformSync(compileScript(descriptor, { id: 'attention', inlineTemplate: true }).content, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
const result = { exports: {} }; new Function('require', 'module', 'exports', code)(require, result, result.exports);
let app, host, props, showNotification, register, requestPermission;
const originals = {};
async function flush() { for (let i = 0; i < 15; i++) { await Promise.resolve(); await nextTick(); } }
function replace(object, key, value) { originals[key] = [object, Object.getOwnPropertyDescriptor(object, key)]; Object.defineProperty(object, key, { configurable: true, value }); }
async function mount(items = []) { props = reactive({ market: 'US', items }); host = document.createElement('div'); document.body.append(host); app = createApp({ render: () => h(result.exports.default, props) }); app.mount(host); await flush(); }
const warning = id => ({ id, title: '상태 확인 필요', message: '계좌의 상태를 다시 확인하세요.', severity: 'critical' });
beforeEach(() => {
  showNotification = jest.fn(async () => {}); register = jest.fn(async () => ({ active: {}, showNotification })); requestPermission = jest.fn(async () => 'denied');
  replace(window, 'isSecureContext', true); replace(window, 'Notification', { permission: 'default', requestPermission }); replace(navigator, 'serviceWorker', { register });
});
afterEach(() => { app?.unmount(); app = null; document.body.innerHTML = ''; for (const [key, [object, descriptor]] of Object.entries(originals)) { if (descriptor) Object.defineProperty(object, key, descriptor); else delete object[key]; delete originals[key]; } });

test('permission is requested only after a click; denial leaves screen warnings visible', async () => {
  await mount([warning('a')]); expect(requestPermission).not.toHaveBeenCalled(); expect(register).not.toHaveBeenCalled();
  host.querySelector('button').click(); await flush();
  expect(requestPermission).toHaveBeenCalledTimes(1); expect(register).not.toHaveBeenCalled();
  expect(host.textContent).toContain('권한이 허용되지 않았습니다'); expect(host.querySelectorAll('li')).toHaveLength(1);
});
test('unsupported browser disables opt-in while retaining in-page alerts', async () => {
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false });
  await mount([warning('a')]); expect(host.querySelector('button').disabled).toBe(true); expect(host.querySelectorAll('li')).toHaveLength(1);
  expect(register).not.toHaveBeenCalled();
});
test('incident is delivered once across polling and disabling prevents new notifications', async () => {
  window.Notification.permission = 'granted'; await mount([warning('a')]); host.querySelector('button').click(); await flush();
  expect(showNotification).toHaveBeenCalledTimes(1);
  expect(showNotification.mock.calls[0][1].body).not.toContain('계좌의 상태');
  props.items = [warning('a')]; await flush(); expect(showNotification).toHaveBeenCalledTimes(1);
  host.querySelector('button').click(); await flush(); props.items = [warning('a'), warning('b')]; await flush();
  expect(showNotification).toHaveBeenCalledTimes(1); expect(host.querySelectorAll('li')).toHaveLength(2);
});
test('unmount during the permission prompt does not register a worker or send notifications', async () => {
  let resolve; requestPermission.mockImplementation(() => new Promise(done => { resolve = done; }));
  await mount([warning('a')]); host.querySelector('button').click(); await flush(); app.unmount(); app = null;
  resolve('granted'); await flush(); expect(register).not.toHaveBeenCalled(); expect(showNotification).not.toHaveBeenCalled();
});
