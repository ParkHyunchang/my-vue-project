/** @jest-environment jsdom */
const fs = require('fs');
const path = require('path');
const { parse, compileScript, compileTemplate } = require('@vue/compiler-sfc');
const { transformSync } = require('@babel/core');
const { createApp, nextTick, reactive } = require('vue');
const http = require('@/axios').default;
const mockReplace = jest.fn();
let mockRoute;
let mockAdmin;
jest.mock('@/axios', () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock('vue-router', () => ({ useRoute: () => mockRoute, useRouter: () => ({ replace: mockReplace }) }));
jest.mock('vuex', () => ({ useStore: () => ({ getters: { 'auth/isAdmin': mockAdmin } }) }));
function component() {
  const filename = path.resolve(__dirname, '../../src/pages/stock.vue');
  const { descriptor } = parse(fs.readFileSync(filename, 'utf8'), { filename });
  const script = compileScript(descriptor, { id: 'stock' });
  const template = compileTemplate({ source: descriptor.template.content, filename, id: 'stock' });
  const evaluate = source => {
    const { code } = transformSync(source, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] });
    const result = { exports: {} };
    new Function('require', 'module', 'exports', code)(request => request.endsWith('.vue') ? { __esModule: true, default: { render: () => null } } : require(request), result, result.exports);
    return result.exports;
  };
  return { ...evaluate(script.content).default, render: evaluate(template.code).render };
}
let app;
async function flush() { for (let i = 0; i < 8; i++) { await Promise.resolve(); await nextTick(); } }
async function mount() { const host = document.createElement('div'); document.body.append(host); app = createApp(component()); app.mount(host); await flush(); return host; }
beforeEach(() => { jest.clearAllMocks(); mockAdmin = true; mockRoute = reactive({ query: {} }); http.get.mockImplementation(async url => ({ data: url === '/api/portfolio/accounts' ? ['stock', 'general', 'isa', 'irp'].map(type => ({ id: 'legacy-' + type, legacyType: type, name: type, broker: 'UNASSIGNED', purpose: 'OTHER', holdingsPath: '/api/portfolio/' + type + '/holdings' })) : {} })); window.scrollTo = jest.fn(); });
afterEach(() => { app?.unmount(); document.body.innerHTML = ''; });

test('legacy direct account URL selects its group and keyboard focus follows visible subtabs', async () => {
  mockRoute.query = { tab: 'balance' };
  const host = await mount();
  expect(host.querySelector('[aria-current="page"]').dataset.tab).toBe('stock');
  expect(host.querySelector('.stock-groups [aria-pressed="true"]').textContent).toContain('내 포트폴리오');
  const first = host.querySelector('[data-tab="all"]'); first.focus();
  first.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
  expect(document.activeElement.dataset.tab).toBe('stock');
  document.activeElement.click(); await flush();
  expect(mockReplace).toHaveBeenCalledWith({ query: { tab: 'stock' } });
});

test('route changes select market group while non-admin broker URLs fall back without exposing account or trade tabs', async () => {
  mockAdmin = false; mockRoute.query = { tab: 'broker-accounts' };
  const host = await mount();
  expect(host.querySelectorAll('.stock-groups button')).toHaveLength(2);
  expect(host.querySelector('[aria-current="page"]').dataset.tab).toBe('all');
  mockRoute.query = { tab: 'news' }; await flush();
  expect(host.querySelector('.stock-groups [aria-pressed="true"]').textContent).toContain('시장 정보');
  expect(host.querySelector('[aria-current="page"]').dataset.tab).toBe('news');
  expect(host.querySelector('[data-tab="broker-accounts"]')).toBeNull();
});


test('account catalog failure prevents a misleading legacy-only complete portfolio and keeps KRX unknown', async () => {
  http.get.mockRejectedValue(new Error('offline'));
  const host = await mount();
  expect(host.textContent).toContain('수기 계좌 목록을 확인하지 못했습니다');
  expect(host.textContent).toContain('KRX 연결 정보를 확인하지 못했습니다');
  expect(host.textContent).not.toContain('KRX 정상');
});

test('custom manual account becomes its own tab and keeps legacy direct links', async () => {
  http.get.mockResolvedValue({ data: [{ id: 'custom-one', name: '삼성 일반', broker: 'SAMSUNG', purpose: 'LONG_TERM', legacyType: null, holdingsPath: '/api/portfolio/accounts/custom-one/holdings' }] });
  mockRoute.query = { tab: 'custom-one' };
  const host = await mount();
  expect(host.querySelector('[aria-current="page"]').dataset.tab).toBe('custom-one');
  expect(host.textContent).toContain('삼성 · 삼성 일반');
});


test('new account retry increments a previously unseen account version', async () => {
  const host = document.createElement('div'); document.body.append(host);
  app = createApp(component()); const vm = app.mount(host); await flush();
  vm.retryAccount('new-account'); expect(vm.reloadVersions['new-account']).toBe(1);
  vm.retryAccount('new-account'); expect(vm.reloadVersions['new-account']).toBe(2);
});
