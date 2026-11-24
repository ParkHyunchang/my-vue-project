/** @jest-environment jsdom */
const fs = require('fs')
const path = require('path')
const { parse, compileScript } = require('@vue/compiler-sfc')
const { transformSync } = require('@babel/core')
const { createApp, nextTick } = require('vue')
const http = require('@/axios').default
const { usPaperTradingApi } = require('@/api/usPaperTradingApi')
jest.mock('@/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))

const filename = path.resolve(__dirname, '../../src/components/stock/UsPaperTradingPanel.vue')
const { descriptor } = parse(fs.readFileSync(filename, 'utf8'), { filename })
const code = transformSync(compileScript(descriptor, { id: 'paper-panel', inlineTemplate: true }).content, {
  configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code
const componentModule = { exports: {} }
new Function('require', 'module', 'exports', code)(require, componentModule, componentModule.exports)
const BASE = '/api/us-paper/sessions'
const sample = overrides => ({ id: 1, state: 'CREATED', paperOnly: true, initialCashUsd: 10000, cashUsd: 10000,
  quantity: 0, symbol: 'SPY', lastPriceUsd: null, equityUsd: 10000, peakEquityUsd: 10000,
  drawdownPercent: 0, maxDrawdownPercent: 0, hardLatched: false, liquidationPending: false,
  feeBps: 5, slippageBps: 5, quoteFresh: false, marketOpen: false, reason: 'CREATED',
  message: '정규장 시세를 기다립니다.', strategyReturnPercent: 0, benchmarkReturnPercent: null,
  excessReturnPoints: null, schedulerEnabled: true, fills: [], history: [], events: [], ...overrides })
let app
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); await nextTick() }
const button = text => [...document.querySelectorAll('button')].find(el => el.textContent.trim() === text)
async function mount(status) {
  http.get.mockImplementation(url => Promise.resolve({ data: url === BASE ? (status ? [status] : []) : status }))
  const host = document.createElement('div'); document.body.appendChild(host)
  app = createApp(componentModule.exports.default); app.mount(host); await flush()
}
beforeEach(() => jest.useFakeTimers())
afterEach(() => { app?.unmount(); app = null; document.body.innerHTML = ''; jest.clearAllMocks(); jest.useRealTimers() })

test('paper API always uses separate session endpoints and forwards cancellation', async () => {
  const signal = new AbortController().signal
  http.get.mockResolvedValue({ data: [] }); http.post.mockResolvedValue({ data: sample() })
  await usPaperTradingApi.list(signal); await usPaperTradingApi.get(8, signal)
  await usPaperTradingApi.create(10000, signal)
  for (const operation of ['start', 'stop', 'poll']) await usPaperTradingApi[operation](8, signal)
  expect(http.get.mock.calls).toEqual([[BASE, { signal, timeout: 30000 }], [`${BASE}/8`, { signal, timeout: 30000 }]])
  expect(http.post.mock.calls).toEqual([[BASE, { initialCashUsd: 10000 }, { signal, timeout: 30000 }],
    ...['start', 'stop', 'poll'].map(op => [`${BASE}/8/${op}`, {}, { signal, timeout: 30000 }])])
})

test('empty session can be created but is never started implicitly', async () => {
  await mount(null)
  expect(document.body.textContent).toContain('선택한 가상 세션이 없습니다')
  expect(http.post).not.toHaveBeenCalled()
  http.post.mockResolvedValue({ data: sample() })
  document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  await flush()
  expect(http.post.mock.calls[0][0]).toBe(BASE)
  expect(http.post).toHaveBeenCalledTimes(1)
  expect(button('모의매매 시작').disabled).toBe(false)
  expect(document.body.textContent).toContain('S&P 500 총수익지수 직접 비교가 아닙니다')
})

test('HARD has no resume or reset and explicitly shows pending liquidation', async () => {
  await mount(sample({ state: 'HARD', hardLatched: true, liquidationPending: true, drawdownPercent: 10.2 }))
  expect(button('모의매매 시작').disabled).toBe(true)
  expect(button('모의매매 재개')).toBeUndefined()
  expect(document.body.textContent).toContain('유효 시세에서 가상 청산을 기다립니다')
  expect([...document.querySelectorAll('button')].some(el => /초기화|잠금 해제|실계좌/.test(el.textContent))).toBe(false)
})

test('status error retains old values, blocks start and can be recovered', async () => {
  await mount(sample({ state: 'STOPPED' }))
  http.get.mockRejectedValueOnce({ response: { status: 503 } })
  button('상태 새로고침').click(); await flush()
  expect(document.body.textContent).toContain('마지막으로 확인한 값')
  expect(button('모의매매 재개').disabled).toBe(true)
  expect(document.body.textContent).toContain('$10,000.00')
  http.get.mockImplementation(url => Promise.resolve({ data: url === BASE ? [sample({ state: 'STOPPED' })] : sample({ state: 'STOPPED' }) }))
  button('연결 다시 확인').click(); await flush()
  expect(button('모의매매 재개').disabled).toBe(false)
})

test('starting rechecks server state and cannot resume a newly latched session', async () => {
  await mount(sample({ state: 'STOPPED' }))
  http.get.mockResolvedValueOnce({ data: sample({ state: 'HARD', hardLatched: true }) })
  button('모의매매 재개').click(); await flush()
  expect(http.post).not.toHaveBeenCalled()
  expect(button('모의매매 시작').disabled).toBe(true)
})

test('polling is single flight and read cancellation prevents stale response overwriting stop', async () => {
  await mount(sample({ state: 'RUNNING' }))
  let resolveRead
  http.get.mockImplementationOnce(() => new Promise(resolve => { resolveRead = resolve }))
  jest.advanceTimersByTime(10000); await flush()
  const reads = http.get.mock.calls.length
  jest.advanceTimersByTime(30000); await flush()
  expect(http.get).toHaveBeenCalledTimes(reads)
  const pendingSignal = http.get.mock.calls[reads - 1][1].signal
  http.post.mockResolvedValue({ data: sample({ state: 'STOPPED' }) })
  button('모의매매 중지').click(); await flush()
  expect(pendingSignal.aborted).toBe(true)
  resolveRead({ data: sample({ state: 'RUNNING' }) }); await flush()
  expect(button('모의매매 재개')).toBeDefined()
  expect(button('모의매매 중지')).toBeUndefined()
})

test('unmount cancels requests and stops polling', async () => {
  await mount(sample())
  http.get.mockImplementationOnce(() => new Promise(() => {}))
  jest.advanceTimersByTime(10000); await flush()
  const count = http.get.mock.calls.length, signal = http.get.mock.calls[count - 1][1].signal
  app.unmount(); app = null
  expect(signal.aborted).toBe(true)
  jest.advanceTimersByTime(60000)
  expect(http.get).toHaveBeenCalledTimes(count)
})

test('missing benchmark never appears as zero and price comparison charts explicit series', async () => {
  await mount(sample({ strategyReturnPercent: 1.2, history: [
    { at: '2026-11-18T15:00:00Z', strategyReturnPercent: 0, benchmarkReturnPercent: 0 },
    { at: '2026-11-18T15:01:00Z', strategyReturnPercent: 1.2, benchmarkReturnPercent: 2 },
  ] }))
  expect(document.querySelectorAll('.paper-return-grid dd')[1].textContent).toBe('—')
  expect(document.querySelector('svg[role=img]')).not.toBeNull()
  expect(document.body.textContent).toContain('배당 미포함')
})

test('disabled backend is clearly reported and cannot create or start', async () => {
  http.get.mockRejectedValue({ response: { status: 404 } })
  const host = document.createElement('div'); document.body.appendChild(host)
  app = createApp(componentModule.exports.default); app.mount(host); await flush()
  expect(document.querySelector('[role=alert]').textContent).toContain('모의매매 전용 서버가 준비되지 않았거나')
  expect(button('새 가상 세션 만들기').disabled).toBe(true)
  expect(http.post).not.toHaveBeenCalled()
})

test('paper tab mounts only when selected and does not mount real-order panels', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../src/pages/stock.vue'), 'utf8')
  expect(source).toMatch(/v-if="isAdmin && paperTradingEnabled && activeTab === 'paper-trade'"/)
  expect(source).toMatch(/v-if="isAdmin && activeTab === 'auto-trade'"/)
  expect(source).toContain('미국 모의매매')
})

test.each([
  [undefined, true, false],
  ['false', true, false],
  ['true', false, false],
  ['true', true, true],
])('paper deep link is available only with an explicit build flag and admin (%s, %s)', async (flag, admin, available) => {
  const filename = path.resolve(__dirname, '../../src/pages/stock.vue')
  const { descriptor } = parse(fs.readFileSync(filename, 'utf8'), { filename })
  const code = transformSync(compileScript(descriptor, { id: 'stock-paper-gate' }).content, {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code
  const result = { exports: {} }
  const localRequire = name => {
    if (name.endsWith('.vue')) return { render: () => null }
    if (name === 'vue-router') return { useRoute: () => ({ query: { tab: 'paper-trade' } }), useRouter: () => ({ replace: jest.fn() }) }
    if (name === 'vuex') return { useStore: () => ({ getters: { 'auth/isAdmin': admin } }) }
    return require(name)
  }
  new Function('require', 'module', 'exports', 'process', code)(localRequire, result, result.exports, { env: { VUE_APP_US_PAPER_ENABLED: flag } })
  const component = result.exports.default
  component.render = () => null
  http.get.mockResolvedValue({ data: {} })
  const host = document.createElement('div'); document.body.appendChild(host)
  app = createApp(component)
  const vm = app.mount(host)
  await flush()
  expect(vm.tabs.some(tab => tab.id === 'paper-trade')).toBe(available)
  expect(vm.activeTab).toBe(available ? 'paper-trade' : 'all')
  expect(http.get.mock.calls.every(([url]) => ['/api/stock/krx-config', '/api/portfolio/accounts'].includes(url))).toBe(true)
})
