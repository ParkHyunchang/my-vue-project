/** @jest-environment jsdom */
const fs = require('fs');
const path = require('path');
const { parse, compileScript } = require('@vue/compiler-sfc');
const { transformSync } = require('@babel/core');
const { createApp, nextTick } = require('vue');
const http = require('@/axios').default;
jest.mock('@/axios', () => ({ __esModule: true, default: { get: jest.fn(), delete: jest.fn() } }));
const filename = path.resolve(__dirname, '../../src/components/stock/ManualPortfolioCleanup.vue');
const { descriptor } = parse(fs.readFileSync(filename, 'utf8'), { filename });
const code = transformSync(compileScript(descriptor, { id: 'cleanup', inlineTemplate: true }).content, {
  configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code;
const result = { exports: {} };
new Function('require', 'module', 'exports', code)(require, result, result.exports);
let app, host;
const counts = (stock = 2) => ({ stock, general: 0, isa: 0, irp: 0, accountHoldings: 0, accounts: 0, total: stock });
async function flush() { for (let i = 0; i < 10; i++) { await Promise.resolve(); await nextTick(); } }
async function mount(props = {}) { host = document.createElement('div'); document.body.append(host); app = createApp(result.exports.default, props); app.mount(host); await flush(); }
async function expand() { const details = host.querySelector('details'); details.open = true; details.dispatchEvent(new Event('toggle')); await flush(); }
async function confirm() { const checkbox = host.querySelector('input'); checkbox.checked = true; checkbox.dispatchEvent(new Event('change')); await flush(); }
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
beforeEach(() => { jest.clearAllMocks(); sessionStorage.clear(); http.get.mockResolvedValue({ data: counts() }); });
afterEach(() => { app?.unmount(); document.body.innerHTML = ''; });

test('collapsed initial panel makes no request and expansion loads only the manual summary', async () => {
  await mount(); expect(http.get).not.toHaveBeenCalled(); expect(http.delete).not.toHaveBeenCalled();
  await expand(); expect(http.get).toHaveBeenCalledTimes(1);
  expect(http.get).toHaveBeenCalledWith('/api/portfolio/manual-records/summary');
  expect(host.textContent).toContain('2개');
});

test('delete is guarded without explicit confirmation, including dispatched click', async () => {
  await mount(); await expand();
  const button = host.querySelector('.delete-button'); expect(button.disabled).toBe(true);
  button.dispatchEvent(new MouseEvent('click', { bubbles: true })); await flush();
  expect(http.delete).not.toHaveBeenCalled();
});

test('confirmed repeated clicks issue one deletion and show the actual result count before refreshing', async () => {
  await mount(); await expand(); await confirm();
  const request = deferred(); http.delete.mockReturnValueOnce(request.promise);
  const button = host.querySelector('.delete-button'); button.click(); button.click(); await flush();
  expect(http.delete).toHaveBeenCalledTimes(1);
  expect(http.delete).toHaveBeenCalledWith('/api/portfolio/manual-records', { data: { confirmation: 'DELETE_MANUAL_RECORDS' } });
  http.get.mockResolvedValueOnce({ data: counts(0) }); request.resolve({ data: counts(3) }); await flush();
  expect(host.textContent).toContain('수기 기록 3개를 삭제했습니다');
  expect(host.textContent).toContain('삭제할 수기 기록이 없습니다');
  expect(host.querySelector('.delete-button')).toBeNull(); expect(http.get).toHaveBeenCalledTimes(2);
});

test('uncertain deletion result requires a new summary and renewed confirmation', async () => {
  await mount(); await expand(); await confirm();
  http.delete.mockRejectedValueOnce(new Error('response lost')); host.querySelector('.delete-button').click(); await flush();
  expect(host.querySelector('[role=alert]').textContent).toContain('삭제 결과를 확인하지 못했습니다');
  expect(host.querySelector('.delete-button')).toBeNull();
  const reload = [...host.querySelectorAll('button')].find(button => button.textContent.includes('기록 확인'));
  reload.click(); await flush();
  expect(http.get).toHaveBeenCalledTimes(2); expect(host.querySelector('.delete-button').disabled).toBe(true);
  expect(http.delete).toHaveBeenCalledTimes(1);
});

test.each([null, {}, { ...counts(), stock: -1 }, { ...counts(), total: '2' }, { ...counts(), total: 1 }])('malformed summary %p never enables deletion', async data => {
  http.get.mockResolvedValueOnce({ data }); await mount(); await expand();
  expect(host.querySelector('[role=alert]')).not.toBeNull();
  expect(host.querySelector('.delete-button')).toBeNull(); expect(http.delete).not.toHaveBeenCalled();
});

test('malformed deletion response never claims success', async () => {
  await mount(); await expand(); await confirm();
  http.delete.mockResolvedValueOnce({ data: {} }); host.querySelector('.delete-button').click(); await flush();
  expect(host.querySelector('[role=alert]')).not.toBeNull();
  expect(host.textContent).not.toContain('개를 삭제했습니다');
  expect(host.querySelector('.delete-button')).toBeNull();
});

test('hiding is available only after a verified zero count and is scoped to the current user', async () => {
  http.get.mockResolvedValue({ data: counts(0) }); await mount({ ownerKey: 'owner-a' }); await expand();
  const hide = [...host.querySelectorAll('button')].find(button => button.textContent.includes('정리 도구 숨기기'));
  expect(hide).toBeDefined(); hide.click(); await flush(); expect(host.querySelector('details')).toBeNull();
  expect(sessionStorage.getItem('manual-cleanup-complete:owner-a')).toBe('true');
  app.unmount(); await mount({ ownerKey: 'owner-b' }); expect(host.querySelector('details')).not.toBeNull();
  app.unmount(); await mount({ ownerKey: 'owner-a' }); expect(host.querySelector('details')).toBeNull();
  expect(http.delete).not.toHaveBeenCalled();
});
test('nonzero or unconfirmed records never offer a completion hide action', async () => {
  await mount({ ownerKey: 'owner-a' });
  expect(host.textContent).not.toContain('정리 도구 숨기기'); await expand();
  expect(host.textContent).not.toContain('정리 도구 숨기기');
  expect(sessionStorage.getItem('manual-cleanup-complete:owner-a')).toBeNull();
});
