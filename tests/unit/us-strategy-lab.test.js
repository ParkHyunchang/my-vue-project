/** @jest-environment jsdom */
const fs = require('fs')
const path = require('path')
const { parse, compileScript } = require('@vue/compiler-sfc')
const { transformSync } = require('@babel/core')
const { createApp, nextTick } = require('vue')
const http = require('@/axios').default
const { usStrategyLabApi } = require('@/api/usStrategyLabApi')
jest.mock('@/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))

const filename = path.resolve(__dirname, '../../src/components/stock/UsStrategyLab.vue')
const { descriptor } = parse(fs.readFileSync(filename, 'utf8'), { filename })
const code = transformSync(compileScript(descriptor, { id: 'strategy-lab', inlineTemplate: true }).content, {
  configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code
const componentModule = { exports: {} }
new Function('require', 'module', 'exports', code)(require, componentModule, componentModule.exports)
const BASE = '/api/strategy-lab'
const candidate = overrides => ({ id: 'candidate-2', name: '분산 추세 후보', version: 'version-2',
  historical: { annualizedPct: 12.3, passed: true, periods: [{ period: 'continuous', annualized_pct: 12.3, mdd_pct: 6, cost_bps: 25 }] },
  forward: { returnPct: 4.2, maxDrawdownPct: 2.1, days: 70, fillCount: 25 }, eligible: true, reasons: [], ...overrides })
const sample = overrides => ({ paperOnly: true, revision: 5, registeredDate: '2026-01-02', lastMarketDate: '2026-11-20',
  running: false, scheduler: { enabled: false, intervalSeconds: 3600, lastRunAt: null, nextRunAt: null, error: null },
  market: { lastDate: '2026-11-20', source: 'fixture', stale: false },
  activeStrategy: { id: 'active-1', name: '기존 가상 전략', version: 'version-1' },
  paperAccount: { cashUsd: 6000, equityUsd: 10200, peakUsd: 10500, drawdownPct: 2.86, hardLatched: false,
    holdings: [{ symbol: 'SPY', quantity: 7 }], unsettledUsd: 0, dividendReceivableUsd: 0 },
  report: { id: 'report-1', createdAt: '2026-11-20T22:00:00Z', dataThrough: '2026-11-20', targetAnnualPct: 10 },
  candidates: [candidate()], audit: [], ...overrides })
let app
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); await nextTick() }
const button = text => [...document.querySelectorAll('button')].find(el => el.textContent.trim() === text)
async function mount(status = sample()) {
  http.get.mockResolvedValue({ data: status })
  const host = document.createElement('div'); document.body.appendChild(host)
  app = createApp(componentModule.exports.default); app.mount(host); await flush()
}
async function review() { button('비교 상세 확인').click(); await flush() }
async function confirm() {
  const input = document.querySelector('input[type=checkbox]')
  input.checked = true; input.dispatchEvent(new Event('change', { bubbles: true })); await flush()
}
beforeEach(() => jest.useFakeTimers())
afterEach(() => { app?.unmount(); app = null; document.body.innerHTML = ''; jest.clearAllMocks(); jest.useRealTimers() })

test('research API binds approval to exact report and revision on isolated endpoints', async () => {
  http.get.mockResolvedValue({ data: sample() }); http.post.mockResolvedValue({ data: {} })
  const signal = new AbortController().signal
  const decision = { candidateId: 'candidate-2', reportId: 'report-1', expectedRevision: 5 }
  await usStrategyLabApi.status(signal); await usStrategyLabApi.cycle(signal)
  await usStrategyLabApi.scheduler(true, signal)
  await usStrategyLabApi.approve(decision, signal); await usStrategyLabApi.reject(decision, signal)
  expect(http.get.mock.calls[0]).toEqual([`${BASE}/status`, { signal, timeout: 30000 }])
  expect(http.post.mock.calls.map(call => call.slice(0, 2))).toEqual([
    [`${BASE}/cycle`, {}], [`${BASE}/scheduler`, { enabled: true }],
    [`${BASE}/approve`, decision], [`${BASE}/reject`, decision],
  ])
})

test('initial state neither starts research nor fabricates forward performance', async () => {
  await mount(sample({ report: null, candidates: [] }))
  expect(document.body.textContent).toContain('아직 비교 보고서가 없습니다')
  expect(document.body.textContent).toContain('실제 운용 전략은 변경하지 않습니다')
  expect(http.post).not.toHaveBeenCalled()
  expect(button('지금 연구 실행').disabled).toBe(false)
})

test('zero observation days show waiting instead of zero profit evidence', async () => {
  await mount(sample({ candidates: [candidate({ eligible: false, forward: { days: 0, fillCount: 0, returnPct: 0, maxDrawdownPct: 0 }, reasons: ['관찰 기간 부족'] })] }))
  expect(document.body.textContent).toContain('관찰 대기')
  await review()
  expect(button('가상 운용 전략 교체').disabled).toBe(true)
  expect(document.querySelector('input[type=checkbox]').disabled).toBe(true)
})

test('approval requires explicit confirmation then rechecks exact report before submission', async () => {
  await mount(); await review()
  expect(document.activeElement.getAttribute('aria-labelledby')).toBe('review-title')
  expect(button('가상 운용 전략 교체').disabled).toBe(true)
  await confirm()
  http.post.mockResolvedValue({ data: {} })
  http.get.mockResolvedValue({ data: sample() })
  button('가상 운용 전략 교체').click(); await flush()
  expect(http.post.mock.calls).toHaveLength(1)
  expect(http.post.mock.calls[0].slice(0, 2)).toEqual([`${BASE}/approve`, { candidateId: 'candidate-2', reportId: 'report-1', expectedRevision: 5 }])
  expect(document.body.textContent).toContain('실제 계좌에는 반영하지 않았습니다')
})

test('changed revision during approval blocks mutation and requests fresh review', async () => {
  await mount(); await review(); await confirm()
  http.get.mockResolvedValue({ data: sample({ revision: 6, report: { id: 'report-2' } }) })
  button('가상 운용 전략 교체').click(); await flush()
  expect(http.post).not.toHaveBeenCalled()
  expect(document.body.textContent).toContain('최신 보고서를 다시 확인하세요')
})

test('polling invalidates confirmation when a different report arrives', async () => {
  await mount(); await review(); await confirm()
  http.get.mockResolvedValue({ data: sample({ revision: 6, report: { id: 'report-2' } }) })
  jest.advanceTimersByTime(10000); await flush()
  expect(button('가상 운용 전략 교체')).toBeUndefined()
  expect(document.body.textContent).toContain('최신 비교 결과를 다시 확인하세요')
})

test('hard latch and pending switch each block another approval', async () => {
  await mount(sample({ paperAccount: { ...sample().paperAccount, hardLatched: true } })); await review()
  expect(button('가상 운용 전략 교체').disabled).toBe(true)
  expect(document.body.textContent).toContain('전략 교체로 손실 차단을 우회할 수 없습니다')
  http.get.mockResolvedValue({ data: sample({ pendingSwitch: { candidateId: 'candidate-2', name: '승인된 후보' } }) })
  button('상태 새로고침').click(); await flush()
  expect(button('가상 운용 전략 교체').disabled).toBe(true)
  expect(document.body.textContent).toContain('승인된 후보 교체 적용 대기')
})

test('stale data prevents approval but permits requesting research refresh', async () => {
  await mount(sample({ market: { stale: true, lastDate: '2026-01-01' } })); await review()
  expect(button('가상 운용 전략 교체').disabled).toBe(true)
  expect(button('지금 연구 실행').disabled).toBe(false)
})

test('live report export is disabled unless the server explicitly enables it', async () => {
  await mount(); await review()
  expect(button('실계좌 검토용 보고서 내보내기').disabled).toBe(true)
  expect(http.post).not.toHaveBeenCalled()
})

test('export downloads a signed report and never approves a live or paper strategy', async () => {
  await mount(sample({ deploymentExportEnabled: true })); await review()
  const createUrl = jest.fn(() => 'blob:mock-report'), revokeUrl = jest.fn()
  URL.createObjectURL = createUrl; URL.revokeObjectURL = revokeUrl
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  http.post.mockResolvedValue({ data: { payloadJson: '{"reportId":"report-1"}', signature: 'test-signature' } })
  button('실계좌 검토용 보고서 내보내기').click(); await flush()
  expect(http.post.mock.calls.map(call => call.slice(0, 2))).toEqual([[`${BASE}/export`, { candidateId: 'candidate-2', reportId: 'report-1', expectedRevision: 5 }]])
  expect(createUrl).toHaveBeenCalledTimes(1); expect(click).toHaveBeenCalledTimes(1)
  expect(document.body.textContent).toContain('실계좌용 승인이나 주문은 하지 않았습니다')
  jest.advanceTimersByTime(1000); expect(revokeUrl).toHaveBeenCalledWith('blob:mock-report')
  click.mockRestore(); delete URL.createObjectURL; delete URL.revokeObjectURL
})

test('error preserves last values and blocks mutations until refreshed', async () => {
  await mount()
  http.get.mockRejectedValueOnce(new Error('연결 실패'))
  button('상태 새로고침').click(); await flush()
  expect(document.body.textContent).toContain('$10,200.00')
  expect(button('지금 연구 실행').disabled).toBe(true)
  http.get.mockResolvedValue({ data: sample() })
  button('연결 다시 확인').click(); await flush()
  expect(button('지금 연구 실행').disabled).toBe(false)
})

test('scheduler starts only on explicit action and reports server running state', async () => {
  await mount()
  http.post.mockResolvedValue({ data: {} })
  http.get.mockResolvedValue({ data: sample({ scheduler: { enabled: true } }) })
  button('자동 실행 켜기').click(); await flush()
  expect(http.post.mock.calls[0].slice(0, 2)).toEqual([`${BASE}/scheduler`, { enabled: true }])
  expect(button('자동 실행 끄기')).toBeDefined()
})

test('old pending read cannot overwrite mutation state and polling stays single-flight', async () => {
  await mount()
  let resolveRead
  http.get.mockImplementationOnce(() => new Promise(resolve => { resolveRead = resolve }))
  jest.advanceTimersByTime(10000); await flush()
  const reads = http.get.mock.calls.length
  jest.advanceTimersByTime(30000); await flush()
  expect(http.get.mock.calls).toHaveLength(reads)
  const oldSignal = http.get.mock.calls[reads - 1][1].signal
  http.post.mockResolvedValue({ data: {} })
  http.get.mockResolvedValue({ data: sample({ running: true }) })
  button('지금 연구 실행').click(); await flush()
  expect(oldSignal.aborted).toBe(true)
  resolveRead({ data: sample({ revision: 0 }) }); await flush()
  expect(button('연구 진행 중…').disabled).toBe(true)
})

test('response not explicitly paper-only fails closed', async () => {
  await mount(sample({ paperOnly: false }))
  expect(document.body.textContent).toContain('연구 전용 서버의 응답을 확인할 수 없습니다')
  expect(button('지금 연구 실행')).toBeUndefined()
  expect(http.post).not.toHaveBeenCalled()
})
