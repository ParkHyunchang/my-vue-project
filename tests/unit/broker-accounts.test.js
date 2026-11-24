/** @jest-environment jsdom */
const fs = require('fs');
const path = require('path');
const { parse, compileScript } = require('@vue/compiler-sfc');
const { transformSync } = require('@babel/core');
const { createApp, nextTick } = require('vue');
const http = require('@/axios').default;
jest.mock('@/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() } }));

function component() {
  const filename = path.resolve(__dirname, '../../src/components/stock/BrokerAccountsPanel.vue');
  const { descriptor } = parse(fs.readFileSync(filename, 'utf8'), { filename });
  const script = compileScript(descriptor, { id: 'broker', inlineTemplate: true });
  const { code } = transformSync(script.content, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] });
  const result = { exports: {} };
  new Function('require', 'module', 'exports', code)(require, result, result.exports);
  return result.exports.default;
}
let app;
async function flush() { for (let i = 0; i < 10; i++) { await Promise.resolve(); await nextTick(); } }
async function mount() {
  const host = document.createElement('div'); document.body.append(host);
  app = createApp(component()); app.mount(host); await flush(); return host;
}
const response = markets => ({ data: { broker: 'KIWOOM', queriedAt: '2026-11-24T03:00:00Z', markets } });
beforeEach(() => jest.clearAllMocks());
afterEach(() => { app?.unmount(); document.body.innerHTML = ''; });

test('read-only overview keeps successful market and labels failed market as unknown, not zero holdings', async () => {
  http.get.mockResolvedValue(response([
    { market: 'KR', status: 'OK', currency: 'KRW', cash: null, dataAsOf: null, queriedAt: '2026-11-24T03:00:00Z', holdings: [{ symbol: 'KR1', name: '국내 보유', quantity: 3, currentPrice: 1200, averagePrice: 1000, profitLoss: null }] },
    { market: 'US', status: 'ERROR', currency: 'USD', holdings: [], notice: '일시적 조회 실패' },
  ]));
  const host = await mount();
  expect(http.get).toHaveBeenCalledWith('/api/kiwoom/accounts/overview');
  const cards = host.querySelectorAll('.broker-markets')[0].querySelectorAll('.broker-card');
  expect(cards[0].textContent).toContain('국내 보유');
  expect(cards[0].textContent).toContain('증권사 기준 시각 미제공');
  expect(cards[0].querySelector('.cash-line strong').textContent).toBe('—');
  expect(cards[1].textContent).toContain('잔고를 확인하지 못했습니다');
  expect(cards[1].textContent).not.toContain('조회된 보유 종목이 없습니다');
  expect(http.post).not.toHaveBeenCalled(); expect(http.patch).not.toHaveBeenCalled();
});

test('only a successful empty response means no holdings; unconfigured account stays unconnected', async () => {
  http.get.mockResolvedValue(response([
    { market: 'KR', status: 'OK', currency: 'KRW', holdings: [], cash: 0 },
    { market: 'US', status: 'UNCONFIGURED', currency: 'USD', holdings: [], cash: null },
  ]));
  const host = await mount();
  expect(host.querySelectorAll('.broker-markets')[0].textContent.match(/조회된 보유 종목이 없습니다/g)).toHaveLength(1);
  expect(host.textContent).toContain('이 시장의 계좌 연결이 설정되지 않았습니다');
  expect(host.querySelectorAll('input')).toHaveLength(0);
});

test('pending lookup disables repeat requests and forbidden response offers retry without stale balance', async () => {
  let reject;
  http.get.mockImplementationOnce(() => new Promise((resolve, fail) => { reject = fail; }));
  const host = await mount();
  const button = host.querySelector('button');
  expect(button.disabled).toBe(true); button.click();
  expect(http.get).toHaveBeenCalledTimes(1);
  reject({ response: { status: 403 } }); await flush();
  expect(host.textContent).toContain('관리자 권한이 필요'); expect(button.disabled).toBe(false);
  http.get.mockResolvedValue(response([{ market: 'KR', status: 'OK', currency: 'KRW', holdings: [] }]));
  button.click(); await flush();
  expect(http.get).toHaveBeenCalledTimes(2); expect(host.querySelector('[role="alert"]')).toBeNull();
});
