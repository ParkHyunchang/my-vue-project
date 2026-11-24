/** @jest-environment jsdom */
const fs = require('fs');
const path = require('path');
const { parse, compileScript, compileTemplate } = require('@vue/compiler-sfc');
const { transformSync } = require('@babel/core');
const { createApp, nextTick, ref, h } = require('vue');
const http = require('@/axios').default;
const { useAiAnalysis } = require('@/composables/useAiAnalysis');
jest.mock('@/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }));
jest.mock('vuex', () => ({ useStore: () => ({ state: { auth: { user: { id: 42, username: 'test-user' } } } }) }));
jest.mock('@/utils/audit', () => ({ logAudit: jest.fn() }));
jest.mock('@/api/stockApi', () => ({ fetchQuote: jest.fn(async () => ({ data: { price: 10 } })), fetchUsdKrwQuote: jest.fn(async () => ({ data: { price: 1400 } })) }));
const components = new Map();
function component(name) {
  if (components.has(name)) return components.get(name);
  const filename = path.resolve(__dirname, '../../src/components/stock', name);
  const { descriptor } = parse(fs.readFileSync(filename, 'utf8'), { filename });
  const evaluate = source => {
    const { code } = transformSync(source, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] });
    const result = { exports: {} };
    new Function('require', 'module', 'exports', code)(request => request.endsWith('.vue') ? { __esModule: true, default: { render() { return h('div', [this.$slots.header?.(), this.$slots.body?.(), this.$slots.footer?.()]); } } } : require(request), result, result.exports);
    return result.exports;
  };
  const script = compileScript(descriptor, { id: name, inlineTemplate: !!descriptor.scriptSetup });
  if (descriptor.scriptSetup) { const result = evaluate(script.content).default; components.set(name, result); return result; }
  const template = compileTemplate({ source: descriptor.template.content, filename, id: name });
  const result = { ...evaluate(script.content).default, render: evaluate(template.code).render };
  components.set(name, result); return result;
}
let app;
async function flush() { for (let i = 0; i < 12; i++) { await Promise.resolve(); await nextTick(); } }
async function mount(name, props = {}) { const host = document.createElement('div'); document.body.append(host); app = createApp(component(name), props); const vm = app.mount(host); await flush(); return { vm, host }; }
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
const holding = (symbol = 'ONE') => ({ id: symbol, assetType: 'STOCK', symbol, market: 'KR', name: symbol, quantity: 1, avgPrice: 8 });
beforeEach(() => { jest.clearAllMocks(); localStorage.clear(); http.get.mockResolvedValue({ data: [] }); window.alert = jest.fn(); window.confirm = jest.fn(() => true); });
afterEach(() => { app?.unmount(); document.body.innerHTML = ''; });

test('failed account read emits error, never migrates local data, and successful retry restores ready', async () => {
  localStorage.setItem('stock_portfolio', JSON.stringify([holding()]));
  http.get.mockRejectedValueOnce(new Error('offline'));
  const states = jest.fn();
  const { vm, host } = await mount('PortfolioPanel.vue', { accountType: 'stock', onLoadState: states });
  expect(host.textContent).toContain('보유 목록을 확인하지 못했습니다');
  expect(vm.holdings).toEqual([]); expect(http.post).not.toHaveBeenCalled();
  expect(states).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'error' }));
  http.get.mockResolvedValueOnce({ data: [holding()] }); await vm.initPortfolio();
  expect(vm.holdings).toHaveLength(1); expect(states).toHaveBeenLastCalledWith({ status: 'ready' });
  expect(localStorage.getItem('stock_portfolio')).not.toBeNull();
});

test('rapid add clicks issue one POST and failed save preserves draft for retry', async () => {
  const { vm } = await mount('PortfolioPanel.vue');
  vm.newHolding = holding(); vm.showAddModal = true;
  const request = deferred(); http.post.mockReturnValueOnce(request.promise);
  const first = vm.addHolding(); const second = vm.addHolding();
  expect(http.post).toHaveBeenCalledTimes(1); expect(vm.mutating).toBe(true);
  vm.closeAddModal(); expect(vm.showAddModal).toBe(true);
  request.reject(new Error('offline')); await Promise.all([first, second]);
  expect(vm.newHolding.symbol).toBe('ONE'); expect(vm.mutating).toBe(false);
  http.post.mockResolvedValueOnce({ data: holding() }); await vm.addHolding();
  expect(vm.holdings).toHaveLength(1); expect(vm.showAddModal).toBe(false);
});

test('explicit import keeps source and records partial success for this user; retry skips existing rows', async () => {
  localStorage.setItem('stock_portfolio', JSON.stringify([holding('ONE'), holding('TWO')]));
  const { vm } = await mount('PortfolioPanel.vue');
  await vm.importLegacy(); expect(http.post).not.toHaveBeenCalled();
  vm.importConfirmed = true;
  http.post.mockResolvedValueOnce({ data: holding('ONE') }).mockRejectedValueOnce(new Error('offline'));
  await vm.importLegacy();
  expect(vm.legacyRows[0].done).toBe(true); expect(vm.legacyRows[1].done).toBe(false);
  expect(JSON.parse(localStorage.getItem('stock_portfolio'))).toHaveLength(2);
  expect(localStorage.getItem('stock_portfolio:imported:42')).toContain('true');
  http.get.mockResolvedValueOnce({ data: [holding('ONE')] });
  http.post.mockResolvedValueOnce({ data: holding('TWO') }); await vm.importLegacy();
  expect(http.post).toHaveBeenCalledTimes(3); expect(vm.holdings).toHaveLength(2);
});

test('aggregate does not display a partial account set as the complete summary', async () => {
  const { host } = await mount('AllAccountsPanel.vue', { holdingsByAccount: { stock: [holding()] }, accountStates: { stock: { status: 'ready' }, isa: { status: 'error' } } });
  expect(host.textContent).toContain('합계·손익·비중 계산을 보류');
  expect(host.textContent).toContain('ISA 계좌'); expect(host.querySelector('button').textContent).toContain('다시 확인');
});

test.each([['Top10Panel.vue', 'switchTop10', 'us', 'top10Data'], ['NewsPanel.vue', 'switchNewsMarket', 'US', 'newsData']])('%s ignores the older market response', async (name, switcher, market, dataField) => {
  const { vm } = await mount(name);
  const older = deferred(); const newer = deferred();
  http.get.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
  const a = name === 'Top10Panel.vue' ? vm.loadTop10() : vm.loadNews('KR');
  const b = vm[switcher](market);
  newer.resolve({ data: [{ name: 'new-market' }] }); await b; await flush();
  older.resolve({ data: [{ name: 'old-market' }] }); await a; await flush();
  expect(vm[dataField][0].name).toBe('new-market');
});

test('AI close/reopen ignores old success and finally cannot stop the new loading state', async () => {
  const show = ref(true); let flow;
  app = createApp({ setup() { flow = useAiAnalysis({ show, loadingMessages: [], errorFallback: 'error' }); return () => null; } });
  app.mount(document.createElement('div'));
  const old = deferred(); const fresh = deferred(); const onOld = jest.fn(); const onFresh = jest.fn();
  const first = flow.runAnalysis(() => old.promise, onOld);
  show.value = false; await flush(); show.value = true; await flush();
  const second = flow.runAnalysis(() => fresh.promise, onFresh);
  old.resolve({ report: 'old' }); await first;
  expect(onOld).not.toHaveBeenCalled(); expect(flow.loading.value).toBe(true);
  fresh.resolve({ report: 'fresh' }); await second;
  expect(onFresh).toHaveBeenCalledWith({ report: 'fresh' }); expect(flow.loading.value).toBe(false);
});


test('new manual account uses only its own endpoint and does not import unrelated legacy browser records', async () => {
  localStorage.setItem('stock_portfolio', JSON.stringify([holding()]));
  const ownPath = '/api/portfolio/accounts/unique/holdings';
  const { vm } = await mount('PortfolioPanel.vue', { accountConfig: { apiPath: ownPath, storageKey: null, isCustomAccount: true } });
  expect(http.get).toHaveBeenCalledWith(ownPath, {});
  expect(vm.legacyRows).toEqual([]); expect(http.post).not.toHaveBeenCalled();
  vm.newHolding = { ...holding('NEW'), quantity: 0.25 };
  http.post.mockResolvedValueOnce({ data: { ...holding('NEW'), quantity: 0.25 } });
  await vm.addHolding();
  expect(http.post).toHaveBeenCalledWith(ownPath, expect.objectContaining({ quantity: 0.25 }), {});
  vm.openPortfolioAnalysis(); expect(vm.showPortfolioAnalysis).toBe(false);
});

test('custom account data is included in manual holdings while whole-account AI is unavailable', async () => {
  const { vm, host } = await mount('AllAccountsPanel.vue', { holdingsByAccount: { mine: [holding('MINE')] }, accountDescriptors: [{ id: 'mine', label: '삼성 일반', legacyType: null }], accountStates: { mine: { status: 'ready' } } });
  expect(vm.mergedHoldings[0].accountLabel).toBe('삼성 일반');
  expect(host.querySelector('.portfolio-ai-btn').disabled).toBe(true);
  vm.openPortfolioAnalysis(); expect(vm.showPortfolioAnalysis).toBe(false);
});


test('account manager saves metadata only and locks repeat submissions while retaining failed form', async () => {
  const saved = jest.fn();
  const { host } = await mount('PortfolioAccountManager.vue', { show: true, accounts: [{ id: 'legacy-stock', broker: 'UNASSIGNED', name: '장기', purpose: 'LONG_TERM' }], onSaved: saved });
  const selectors = host.querySelectorAll('select');
  selectors[0].value = 'legacy-stock'; selectors[0].dispatchEvent(new Event('change')); await flush();
  selectors[1].value = 'SAMSUNG'; selectors[1].dispatchEvent(new Event('change')); await flush();
  const request = deferred(); http.put.mockReturnValueOnce(request.promise);
  const form = host.querySelector('form');
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await flush();
  expect(http.put).toHaveBeenCalledTimes(1);
  expect(http.put).toHaveBeenCalledWith('/api/portfolio/accounts/legacy-stock', { broker: 'SAMSUNG', name: '장기', purpose: 'LONG_TERM' });
  expect(http.post).not.toHaveBeenCalled();
  request.reject(new Error('offline')); await flush();
  expect(host.querySelector('input').value).toBe('장기'); expect(saved).not.toHaveBeenCalled();
  expect(host.querySelector('fieldset').disabled).toBe(false);
});


test('failed market switch cannot relabel previous domestic top10 as US data', async () => {
  const { vm } = await mount('Top10Panel.vue');
  http.get.mockResolvedValueOnce({ data: [{ name: 'domestic' }] }); await vm.loadTop10();
  http.get.mockRejectedValueOnce(new Error('offline')); vm.switchTop10('us'); await flush();
  expect(vm.top10Data).toEqual([]); expect(vm.top10Error).not.toBe('');
});


test.each(['null', '[]', '"damaged"'])('malformed import progress %s cannot block reading the server account', async ledger => {
  localStorage.setItem('stock_portfolio', JSON.stringify([holding()]));
  localStorage.setItem('stock_portfolio:imported:42', ledger);
  const { vm } = await mount('PortfolioPanel.vue');
  expect(vm.initialLoading).toBe(false); expect(vm.loadError).toBe('');
  expect(vm.legacyRows[0].done).toBe(false); expect(http.post).not.toHaveBeenCalled();
});
