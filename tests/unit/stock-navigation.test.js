/** @jest-environment jsdom */
const fs = require('fs');
const path = require('path');
const { parse, compileScript, compileTemplate } = require('@vue/compiler-sfc');
const { transformSync } = require('@babel/core');
const { createApp, nextTick, reactive, h } = require('vue');
const { createRouter, createMemoryHistory } = require('vue-router');
const http = require('@/axios').default;
let mockStore;
jest.mock('@/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }));
jest.mock('vuex', () => ({ useStore: () => mockStore }));

function component() {
  const filename = path.resolve(__dirname, '../../src/pages/stock.vue');
  const { descriptor } = parse(fs.readFileSync(filename, 'utf8'), { filename });
  const script = compileScript(descriptor, { id: 'stock' });
  const template = compileTemplate({ source: descriptor.template.content, filename, id: 'stock' });
  const evaluate = source => {
    const { code } = transformSync(source, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] });
    const result = { exports: {} };
    new Function('require', 'module', 'exports', code)(request => request.endsWith('.vue')
      ? { __esModule: true, default: { render: () => h('div', { 'data-panel': path.basename(request, '.vue') }) } }
      : require(request), result, result.exports);
    return result.exports;
  };
  return { ...evaluate(script.content).default, render: evaluate(template.code).render };
}
let app, router;
async function flush() { for (let i = 0; i < 12; i++) { await Promise.resolve(); await nextTick(); } }
async function mount(url = '/stock') {
  router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/stock', component: { render: () => null } }] });
  await router.push(url); await router.isReady();
  const host = document.createElement('div'); document.body.append(host);
  app = createApp(component()); app.use(router); app.mount(host); await flush(); return host;
}
function marketButton(host, market) { return [...host.querySelectorAll('button')].find(button => button.textContent.includes(market === 'US' ? '미국' : '국내')); }
function expectMarket(host, market) {
  expect(host.querySelector(`[data-panel="${market === 'US' ? 'KiwoomUsAutoTrade' : 'KiwoomAutoTrade'}"]`)).not.toBeNull();
  expect(host.querySelector(`[data-panel="${market === 'US' ? 'KiwoomAutoTrade' : 'KiwoomUsAutoTrade'}"]`)).toBeNull();
}
beforeEach(() => { jest.clearAllMocks(); mockStore = reactive({ getters: { 'auth/isAdmin': true } }); window.scrollTo = jest.fn(); });
afterEach(() => { app?.unmount(); document.body.innerHTML = ''; });

test.each([['/stock', 'KR'], ['/stock?market=KR', 'KR'], ['/stock?market=US', 'US'], ['/stock?market=invalid', 'KR'], ['/stock?tab=balance', 'KR'], ['/stock?tab=paper-trade', 'KR']])('URL %s mounts only its authorized market panel', async (url, expected) => {
  const host = await mount(url); expectMarket(host, expected);
  expect(host.querySelector('[data-panel="PortfolioPanel"]')).toBeNull();
  expect(host.querySelector('[data-panel="UsPaperTradingPanel"]')).toBeNull();
  expect(http.get).not.toHaveBeenCalled();
  expect(http.post).not.toHaveBeenCalled();
});

test('market buttons update URL and browser back restores the previous panel', async () => {
  const host = await mount('/stock?market=KR&note=keep');
  const switched = new Promise(resolve => { const remove = router.afterEach(() => { remove(); resolve(); }); });
  marketButton(host, 'US').click(); await switched; await flush();
  expect(router.currentRoute.value.query.market).toBe('US');
  expect(router.currentRoute.value.query.note).toBe('keep');
  expectMarket(host, 'US');
  const navigation = new Promise(resolve => { const remove = router.afterEach(() => { remove(); resolve(); }); });
  router.back(); await navigation; await flush();
  expectMarket(host, 'KR');
  expect(router.currentRoute.value.query.market).toBe('KR');
  expect(http.post).not.toHaveBeenCalled();
});

test('route-driven market changes are reflected without remounting the page', async () => {
  const host = await mount('/stock?market=KR');
  await router.push('/stock?market=US'); await flush(); expectMarket(host, 'US');
  await router.push('/stock?market=bad'); await flush(); expectMarket(host, 'KR');
});

test('non-admin direct URL exposes no trading controls and invokes no manual or broker API', async () => {
  mockStore.getters['auth/isAdmin'] = false;
  const host = await mount('/stock?market=US');
  expect(host.textContent).toMatch(/관리자|권한/);
  expect(host.querySelectorAll('[data-panel]')).toHaveLength(0);
  expect(marketButton(host, 'US')).toBeUndefined();
  expect(http.get).not.toHaveBeenCalled(); expect(http.post).not.toHaveBeenCalled();
});

test('losing admin permission unmounts the existing trading panel', async () => {
  const host = await mount('/stock?market=US'); expectMarket(host, 'US');
  mockStore.getters['auth/isAdmin'] = false; await flush();
  expect(host.querySelectorAll('[data-panel]')).toHaveLength(0);
  expect(http.post).not.toHaveBeenCalled();
});

test('manual records are left untouched when entering and switching the dedicated trading page', async () => {
  const original = JSON.stringify([{ symbol: 'SYNTHETIC', quantity: 0.25 }]);
  localStorage.setItem('stock_portfolio', original);
  const host = await mount(); marketButton(host, 'US').click(); await flush();
  expect(localStorage.getItem('stock_portfolio')).toBe(original);
  for (const method of ['get', 'post', 'put', 'delete']) expect(http[method]).not.toHaveBeenCalled();
});

test('arrow and boundary keys move market-button focus without submitting orders', async () => {
  const host = await mount();
  const kr = marketButton(host, 'KR'), us = marketButton(host, 'US');
  kr.focus(); kr.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  expect(document.activeElement).toBe(us);
  us.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
  expect(document.activeElement).toBe(kr);
  kr.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
  expect(document.activeElement).toBe(us);
  expect(http.post).not.toHaveBeenCalled();
});

test.each([undefined, 'false', 'true'])('paper feature flag %s cannot expose simulation in the real-account page', async flag => {
  const original = process.env.VUE_APP_US_PAPER_ENABLED;
  try {
    if (flag === undefined) delete process.env.VUE_APP_US_PAPER_ENABLED;
    else process.env.VUE_APP_US_PAPER_ENABLED = flag;
    const host = await mount('/stock?tab=paper-trade');
    expectMarket(host, 'KR');
    expect(host.querySelector('[data-panel="UsPaperTradingPanel"]')).toBeNull();
  } finally {
    if (original === undefined) delete process.env.VUE_APP_US_PAPER_ENABLED;
    else process.env.VUE_APP_US_PAPER_ENABLED = original;
  }
});
