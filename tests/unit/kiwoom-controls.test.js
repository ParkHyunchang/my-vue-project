/** @jest-environment jsdom */
const fs = require('fs')
const path = require('path')
const { parse, compileScript } = require('@vue/compiler-sfc')
const { transformSync } = require('@babel/core')
const { createApp, nextTick } = require('vue')
const http = require('@/axios').default

jest.mock('@/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() } }))

// Compile and mount the real Vue templates without an extra test-utils dependency.
const components = new Map()
function component(name) {
  if (components.has(name)) return components.get(name)
  const filename = path.resolve(__dirname, '../../src/components/stock', name)
  const { descriptor } = parse(fs.readFileSync(filename, 'utf8'), { filename })
  const script = compileScript(descriptor, { id: name, inlineTemplate: true })
  const { code } = transformSync(script.content, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(request => request.endsWith('.vue')
    ? { __esModule: true, default: component(path.basename(request)) } : require(request), module, module.exports)
  components.set(name, module.exports.default)
  return module.exports.default
}

const US = '/api/kiwoom/us/auto-trade'
const KR = '/api/kiwoom/auto-trade'
const STRATEGY = '/api/kiwoom/strategy'
const initialSettings = {
  signalMode: 'OBSERVE', minRelativeStrengthPercent: 0, riskPerTradePercent: 0.5, atrStopMultiplier: 2, maxEntryExtensionAtr: 1,
  trailingStopAtrMultiplier: 2, trailingActivationR: 1, maxHoldingTradingDays: 5,
  fundamentalFilterEnabled: true, maxForwardPe: 50, minRoePercent: 10, minChangePercent: 2, maxChangePercent: 8,
  minVolumeRatio: 1.2, maxSpreadPercent: 0.15, maxOrderPercent: 10, maxPositions: 3, dailyMaxBuys: 2,
  symbolCooldownDays: 5, maxHoldingDays: 5, stopLossPercent: 3, takeProfitPercent: 5, takeProfitPercent2: 8, dailyLossLimitPercent: 3
}
let app, status, settings, summary, risk, handlers, calls, failSummary, failSettings, syncResponse, controlResponse
async function flush() { for (let i = 0; i < 25; i++) { await Promise.resolve(); await nextTick() } }
async function mount(name, props = {}) {
  const host = document.createElement('div'); document.body.appendChild(host)
  app = createApp(component(name), props); app.mount(host); await flush()
}
const button = text => [...document.querySelectorAll('button')].find(el => el.textContent.trim() === text)
async function click(text) { const el = button(text); expect(el).toBeDefined(); expect(el.disabled).toBe(false); el.click(); await flush() }
function field(label) {
  const row = [...document.querySelectorAll('.setting-field')].find(el => el.querySelector('label')?.textContent.startsWith(label))
  return row.querySelector('input')
}
async function input(el, value) { el.value = value; el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); await flush() }

beforeAll(() => { component('KiwoomUsAutoTrade.vue'); component('KiwoomAutoTrade.vue'); component('KiwoomStrategySettingsModal.vue') })
beforeEach(() => {
  jest.useFakeTimers(); jest.clearAllMocks()
  settings = { ...initialSettings }; status = { configured: true, autoTrading: false, orderEnabled: true, strategyEnabled: true }
  summary = { cash: { availableUsd: 1000, usdOnlyBuyAllowed: true }, automatedCapitalUsd: 1000,
    perOrderLimitUsd: 80, managedPositionCount: 0, managedEvaluationUsd: 0, stockEvaluationUsd: 0,
    fresh: true, capturedAt: '2026-10-02T16:00:00', krwOrderServiceStatus: { code: 'CANCELED', label: '해지됨' },
    buyingPower: { signalMode: 'OBSERVE', maxOrderPercent: 10, maxPositions: 3, riskPerTradePercent: 0.5,
      reservedUsd: 200, unreservedUsd: 800, allocationLimitUsd: 80, pendingPositionCount: 1, holdingsSyncedAt: '2026-10-02T16:00:00' } }
  risk = { enabled: true, capitalFlowConfirmed: true, triggered: false, liquidationPending: false, equityUsd: 1000, peakEquityUsd: 1000, drawdownPercent: 0, limitPercent: 10, observedAt: new Date().toISOString() }
  handlers = {}; calls = []; failSummary = false; failSettings = false; syncResponse = { success: true, updated: 0, message: '동기화 대상 주문이 없습니다.' }; controlResponse = {}
  window.confirm = jest.fn(() => true)
  global.EventSource = jest.fn(function () { this.addEventListener = (name, fn) => { handlers[name] = fn }; this.close = jest.fn() })
  http.get.mockImplementation(async url => {
    calls.push(url)
    if (url === `${US}/risk`) return { data: { ...risk } }
    if (url.endsWith('/status')) return { data: { ...status } }
    if (url.endsWith('/summary')) { if (failSummary) throw new Error('account unavailable'); return { data: summary } }
    if (url.endsWith('/settings')) { if (failSettings) throw new Error('settings unavailable'); return { data: url.startsWith(US) ? { ...settings } : { autoExecute: false, prompt: 'preserved prompt' } } }
    if (url.endsWith('/config')) return { data: { autoExecute: status.autoTrading, orderEnabled: true } }
    if (url.endsWith('/health')) return { data: { risk: { riskLoopEnabled: status.autoTrading } } }
    return { data: [] }
  })
  http.post.mockImplementation(async (url, body) => {
    calls.push(url)
    if (url.endsWith('/control')) { status.autoTrading = body.enabled; return { data: { autoTrading: body.enabled, ...controlResponse } } }
    if (url === `${US}/sync`) return { data: { snapshot: summary, ...syncResponse } }
    return { data: syncResponse }
  })
  http.patch.mockImplementation(async (url, body) => { settings = { ...body }; return { data: { ...settings } } })
})
afterEach(() => { app?.unmount(); document.body.innerHTML = ''; jest.clearAllTimers(); jest.useRealTimers() })

test('US research-managed account displays approved research strategy instead of legacy as active', async () => {
  const previous = http.get.getMockImplementation()
  http.get.mockImplementation(url => url === '/api/kiwoom/us/strategy-deployments/status'
    ? Promise.resolve({ data: { bridgeEnabled: true, revision: 1, managed: true, accountScope: 'mock-scope', active: { candidateId: 'balanced_trend:recovery_vol', version: 'v1', reportId: 'r1' }, candidate: null, blockers: [] } }) : previous(url))
  await mount('KiwoomUsAutoTrade.vue')
  expect(document.querySelector('.hero').textContent).toContain('연구 전략: balanced_trend:recovery_vol')
  expect(document.querySelector('.hero').textContent).not.toContain('저장된 기본 전략')
  expect(document.body.textContent).toContain('기존 매매 설정 · 연구 전략 진입에는 미적용')
})

test('US revoked managed account cannot start buys or imply automatic legacy fallback', async () => {
  const previous = http.get.getMockImplementation()
  http.get.mockImplementation(url => url === '/api/kiwoom/us/strategy-deployments/status'
    ? Promise.resolve({ data: { bridgeEnabled: false, revision: 2, managed: true, accountScope: 'mock-scope', active: null, candidate: null, blockers: [] } }) : previous(url))
  await mount('KiwoomUsAutoTrade.vue')
  expect(document.querySelector('.hero').textContent).toContain('승인 철회·중지 상태')
  expect(button('신규매수 시작').disabled).toBe(true)
  expect(document.body.textContent).toContain('기존 전략으로 자동 복귀하지 않습니다')
})

test('US popup separates trend lifecycle controls from unused legacy rules', async () => {
  await mount('KiwoomUsAutoTrade.vue'); await click('전략 설정')
  const mode = document.querySelector('#us-signal-mode')
  expect(mode.closest('form').id).toBe('us-strategy-settings')
  await input(mode, 'TREND')
  const labels = [...document.querySelectorAll('.setting-field > label')].map(el => el.textContent)
  for (const name of ['오늘 최소 상승률', '오늘 최대 상승률', '1차 이익 실현', '가장 오래 보유할 기간']) {
    expect(labels.some(text => text.startsWith(name))).toBe(false)
  }
  expect(document.querySelector('.legacy-reference').open).toBe(false)
  await input(document.querySelector('#us-trail-atr'), '3')
  document.querySelector('#us-strategy-settings').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await flush()
  expect(http.patch).toHaveBeenCalledWith(`${US}/settings`, expect.objectContaining({ signalMode: 'TREND', maxChangePercent: 8, minChangePercent: 2, riskPerTradePercent: 0.5, trailingStopAtrMultiplier: 3 }))
  expect(document.querySelector('#us-signal-mode')).toBeNull()
})

test('US trend preset is reviewable before saving and never starts trading', async () => {
  settings = { ...settings, minVolumeRatio: 3, maxSpreadPercent: 0.5, dailyMaxBuys: 8,
    fundamentalFilterEnabled: false, stopLossPercent: 10, takeProfitPercent2: 12 }
  await mount('KiwoomUsAutoTrade.vue'); await click('전략 설정'); await click('추세 전략 시작값 불러오기')
  expect(document.querySelector('#us-signal-mode').value).toBe('TREND')
  expect(field('1회 매수 최대 비중').value).toBe('25')
  expect(document.querySelector('#us-trend-days').value).toBe('5')
  expect(field('최소 시간보정 거래량').value).toBe('1.2')
  expect(field('최대 호가 스프레드').value).toBe('0.15')
  expect(field('하루에 새로 살 수 있는 횟수').value).toBe('2')
  expect(field('최대 손절률').value).toBe('3')
  expect(field('PER·ROE 기업 필터').checked).toBe(true)
  expect(document.querySelector('.legacy-reference').textContent).toContain('2차 익절 +12%')
  expect(document.querySelector('.rules > ol').textContent).toContain('기존 조건 + 새 신호 비교 관찰')
  expect(http.post).not.toHaveBeenCalled(); expect(http.patch).not.toHaveBeenCalled()
  await input(document.querySelector('#us-trail-atr'), '0')
  expect(button('저장하기').disabled).toBe(true)
  await click('취소')
  expect(document.querySelector('.rules > ol').textContent).toContain('분할 익절')
})

test('US main budget uses server reservation amount and stays on saved rules while editing', async () => {
  await mount('KiwoomUsAutoTrade.vue')
  const cap = document.querySelector('[data-testid=order-limit]')
  expect(cap.textContent).toContain('$80.00')
  expect(document.querySelector('.budget').textContent).toContain('$200.00')
  await click('전략 설정')
  await input(field('1회 매수 최대 비중'), '20')
  expect(cap.textContent).toContain('$80.00')
  expect(field('1회 매수 최대 비중').closest('.setting-field').textContent).toContain('$160.00')
  await input(document.querySelector('#us-signal-mode'), 'TREND')
  expect(document.querySelector('.rules > ol').textContent).toContain('기존 조건 + 새 신호 비교 관찰')
  expect(field('1회 매수 최대 비중').closest('.setting-field').textContent).toContain('$200.00')
  await click('취소')
  expect(cap.textContent).toContain('$80.00')
})

test('US saved TREND budget and ownership quantities are explained separately', async () => {
  settings.signalMode = 'TREND'; summary.positionCount = 1; summary.managedPositionCount = 1; summary.managedEvaluationUsd = 500
  summary.automatedCapitalUsd = 1500; summary.perOrderLimitUsd = 150
  summary.buyingPower = { ...summary.buyingPower, signalMode: 'TREND', allocationLimitUsd: 150, riskBudgetUsd: 7.5 }
  const original = http.get.getMockImplementation()
  http.get.mockImplementation(url => url === `${US}/holdings`
    ? Promise.resolve({ data: [{ symbol: 'TEST', exchange: 'ND', quantity: 10, managedQuantity: 5 }] }) : original(url))
  await mount('KiwoomUsAutoTrade.vue')
  expect(document.querySelector('[data-testid=managed-positions]').textContent).toContain('1 / 3종목')
  expect(document.querySelector('.budget').textContent).toContain('$7.50')
  expect(document.querySelector('[data-testid=order-limit]').textContent).toContain('ATR 위험 한도 적용 전')
  expect(document.body.textContent).toContain('자동 5주수동 5주')
})

test('US failed or stale account never presents fallback zeroes as current buying power', async () => {
  settings.signalMode = 'TREND'
  failSummary = true; await mount('KiwoomUsAutoTrade.vue')
  expect(document.querySelector('[data-testid=order-limit] strong').textContent).toBe('—')
  expect(button('신규매수 시작').disabled).toBe(true)
  expect(document.querySelector('.usd-notice').textContent).toContain('계좌 확인 필요')
  failSummary = false; await click('계좌·체결 동기화')
  expect(document.querySelector('[data-testid=order-limit]').textContent).toContain('$80.00')
  expect(button('신규매수 시작').disabled).toBe(false)
  summary = { ...summary, fresh: false }
  jest.advanceTimersByTime(30000); await flush()
  expect(document.querySelector('.budget').textContent).toContain('이전 조회값')
  expect(button('신규매수 시작').disabled).toBe(true)
})

test('US exchange refresh after funding updates the server budget and failed refresh marks old data', async () => {
  await mount('KiwoomUsAutoTrade.vue')
  summary = { ...summary, cash: { ...summary.cash, availableUsd: 2000 }, perOrderLimitUsd: 180,
    buyingPower: { ...summary.buyingPower, unreservedUsd: 1800, allocationLimitUsd: 180 } }
  await click('계좌·체결 동기화')
  expect(document.querySelector('[data-testid=order-limit]').textContent).toContain('$180.00')
  failSummary = true; jest.advanceTimersByTime(30000); await flush()
  expect(document.querySelector('.budget').textContent).toContain('이전 조회값')
  expect(document.querySelector('[data-testid=order-limit]').textContent).toContain('$180.00')
})

test('US cancel discards a draft and polling preserves it while open', async () => {
  await mount('KiwoomUsAutoTrade.vue'); await click('전략 설정'); await input(document.querySelector('#us-signal-mode'), 'TREND')
  jest.advanceTimersByTime(30000); await flush()
  expect(document.querySelector('#us-signal-mode').value).toBe('TREND')
  await click('취소'); await click('전략 설정')
  expect(document.querySelector('#us-signal-mode').value).toBe('OBSERVE')
  expect(http.patch).not.toHaveBeenCalled()
})

test('US reopening the popup uses current saved settings after another session updates them', async () => {
  await mount('KiwoomUsAutoTrade.vue'); await click('전략 설정')
  await input(field('1회 매수 최대 비중'), '20')
  settings = { ...settings, maxOrderPercent: 30 }
  jest.advanceTimersByTime(30000); await flush()
  expect(field('1회 매수 최대 비중').value).toBe('20')
  await click('취소'); await click('전략 설정')
  expect(field('1회 매수 최대 비중').value).toBe('30')
})

test('US status polling failure marks the existing budget as old without blocking stop', async () => {
  status.autoTrading = true; await mount('KiwoomUsAutoTrade.vue')
  http.get.mockRejectedValueOnce(new Error('status unavailable'))
  jest.advanceTimersByTime(30000); await flush()
  expect(document.querySelector('.budget').textContent).toContain('이전 조회값')
  expect(button('신규매수 중지').disabled).toBe(false)
})

test('US stop is available with funding blocked and only posts control false', async () => {
  status.autoTrading = true; summary.cash.usdOnlyBuyAllowed = false
  await mount('KiwoomUsAutoTrade.vue'); await click('신규매수 중지')
  expect(http.post).toHaveBeenCalledTimes(1)
  expect(http.post).toHaveBeenCalledWith(`${US}/control`, { enabled: false })
  expect(window.confirm.mock.calls[0][0]).toContain('손절·익절 감시')
})

test('US control forces a fresh read after an older in-flight poll completes', async () => {
  settings.signalMode = 'TREND'
  await mount('KiwoomUsAutoTrade.vue')
  const originalGet = http.get.getMockImplementation()
  let release
  http.get.mockImplementationOnce(() => new Promise(resolve => { release = resolve }))
  jest.advanceTimersByTime(30000); await flush()
  button('신규매수 시작').click(); await flush()
  expect(http.post).toHaveBeenCalledWith(`${US}/control`, { enabled: true })
  http.get.mockImplementation(originalGet)
  release({ data: { ...status, autoTrading: false } }); await flush()
  expect(button('신규매수 중지')).toBeDefined()
})

test('US rejected start shows the error without switching the button', async () => {
  settings.signalMode = 'TREND'
  await mount('KiwoomUsAutoTrade.vue')
  http.post.mockRejectedValueOnce({ response: { data: { message: 'UNKNOWN 주문 확인 필요' } } })
  await click('신규매수 시작')
  expect(button('신규매수 시작')).toBeDefined()
  expect(document.body.textContent).toContain('UNKNOWN 주문 확인 필요')
})

test('US saving settings cannot be overwritten by an older background response', async () => {
  await mount('KiwoomUsAutoTrade.vue'); await click('전략 설정')
  const originalGet = http.get.getMockImplementation()
  let release
  http.get.mockImplementation(url => url === `${US}/settings`
    ? new Promise(resolve => { release = resolve }) : originalGet(url))
  jest.advanceTimersByTime(30000); await flush()
  await input(document.querySelector('#us-signal-mode'), 'TREND')
  document.querySelector('#us-strategy-settings').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await flush()
  http.get.mockImplementation(originalGet); release({ data: { ...initialSettings } }); await flush()
  await click('전략 설정')
  expect(document.querySelector('#us-signal-mode').value).toBe('TREND')
})

test('US preview never enables orders; running decision requires confirmation', async () => {
  settings.signalMode = 'TREND'
  await mount('KiwoomUsAutoTrade.vue'); await click('후보만 확인')
  expect(http.post).toHaveBeenCalledWith(`${US}/decide`, null, { params: { allowOrder: false } })
  await click('신규매수 시작'); http.post.mockClear(); window.confirm.mockReturnValue(false)
  await click('후보 확인·매수 판단'); expect(http.post).not.toHaveBeenCalled()
  window.confirm.mockReturnValue(true); await click('후보 확인·매수 판단')
  expect(http.post).toHaveBeenCalledWith(`${US}/decide`, null, { params: { allowOrder: true } })
})

test('US synchronization reads holdings afterwards and shows partial failure', async () => {
  await mount('KiwoomUsAutoTrade.vue'); calls = []
  syncResponse = { success: false, warnings: ['주문 대사 실패: 잔고만 갱신했습니다.'] }
  await click('계좌·체결 동기화')
  expect(calls.indexOf(`${US}/holdings`)).toBeGreaterThan(calls.indexOf(`${US}/sync`))
  expect(document.querySelector('[role=status]').textContent).toContain('주문 대사 실패')
})

test('US account outage still loads saved settings and polling recovers', async () => {
  failSummary = true; settings.signalMode = 'TREND'
  await mount('KiwoomUsAutoTrade.vue'); await click('전략 설정')
  expect(document.querySelector('#us-signal-mode').value).toBe('TREND')
  await click('취소'); failSummary = false; status.autoTrading = true
  handlers['kiwoom-us']({ data: JSON.stringify({ type: 'START', message: 'started' }) })
  jest.advanceTimersByTime(1500); await flush()
  expect(button('신규매수 중지')).toBeDefined()
})

test('KR start refreshes strategy flags and reports incomplete exit preparation', async () => {
  controlResponse.exitManagementReady = false
  await mount('KiwoomAutoTrade.vue'); await click('○ 자동주문 시작')
  expect(http.post).toHaveBeenCalledWith(`${KR}/control`, { enabled: true })
  expect(document.body.textContent).toContain('완전 자동매매 활성')
  expect(document.body.textContent).toContain('청산 관리 준비가 완료되지 않았습니다')
  expect(window.confirm.mock.calls[0][0]).toContain('루프도 함께 켜고')
})

test('KR stop displays cancellation failures and does not issue a liquidation request', async () => {
  status.autoTrading = true; controlResponse = { orderCancellationRequested: 2, orderCancellationFailed: 1 }
  await mount('KiwoomAutoTrade.vue'); await click('● 자동주문 완전 중지')
  expect(http.post).toHaveBeenCalledTimes(1)
  expect(http.post).toHaveBeenCalledWith(`${KR}/control`, { enabled: false })
  expect(document.body.textContent).toContain('취소 실패 1건')
})

test('KR zero-change sync is normal and still refreshes holdings and risk status', async () => {
  await mount('KiwoomAutoTrade.vue'); calls = []; await click('주문 상태 동기화')
  expect(document.querySelector('.strategy-panel > .error')).toBeNull()
  expect(document.body.textContent).toContain('동기화 대상 주문이 없습니다.')
  expect(calls.indexOf(`${KR}/holdings`)).toBeGreaterThan(calls.indexOf(`${STRATEGY}/orders/sync`))
  expect(calls).toContain(`${STRATEGY}/health`)
})

test('KR manual decision honors confirmation and token refresh stays on its endpoint', async () => {
  await mount('KiwoomAutoTrade.vue')
  window.confirm.mockReturnValue(false); await click('지금 재판단')
  expect(http.post).not.toHaveBeenCalled()
  window.confirm.mockReturnValue(true); await click('지금 재판단')
  expect(http.post).toHaveBeenCalledWith(`${STRATEGY}/decide`)
  http.post.mockClear(); await click('접속 토큰 갱신')
  expect(http.post).toHaveBeenCalledTimes(1)
  expect(http.post).toHaveBeenCalledWith(`${KR}/token/refresh`)
})

test('KR stop response survives a failed status refresh and releases the controls', async () => {
  status.autoTrading = true; await mount('KiwoomAutoTrade.vue')
  http.get.mockRejectedValueOnce(new Error('status unavailable'))
  await click('● 자동주문 완전 중지')
  expect(button('○ 자동주문 시작').disabled).toBe(false)
  expect(document.body.textContent).toContain('갱신에 실패')
})

test('KR failed sync displays error even when HTTP response is successful', async () => {
  syncResponse = { success: false, updated: 0, message: '주문 상태 동기화 실패: timeout' }
  await mount('KiwoomAutoTrade.vue'); await click('주문 상태 동기화')
  expect(document.querySelector('.strategy-panel > .error').textContent).toContain('timeout')
})

test('KR server-side stop event updates the button and strategy view', async () => {
  status.autoTrading = true; await mount('KiwoomAutoTrade.vue'); status.autoTrading = false
  handlers.kiwoom({ data: JSON.stringify({ type: 'error', message: 'stopped' }) })
  jest.advanceTimersByTime(1500); await flush()
  expect(button('○ 자동주문 시작')).toBeDefined()
  expect(document.body.textContent).toContain('자동주문 완전 중지')
})

test('KR settings load failure cannot save fallback defaults', async () => {
  failSettings = true; await mount('KiwoomStrategySettingsModal.vue')
  expect(button('저장하기').disabled).toBe(true)
  expect(http.patch).not.toHaveBeenCalled()
})

test('KR popup saves its own strategy endpoint and preserves the AI prompt', async () => {
  await mount('KiwoomAutoTrade.vue'); await click('전략 설정')
  const inputEl = document.querySelector('#ks-max-positions')
  expect(inputEl).not.toBeNull(); await input(inputEl, '4'); await click('저장하기')
  expect(http.patch).toHaveBeenCalledWith(`${STRATEGY}/settings`, expect.objectContaining({ maxPositions: 4, prompt: 'preserved prompt' }))
  expect(http.patch.mock.calls[0][0]).not.toContain('/us/')
})


test.each([
  { enabled: false }, { capitalFlowConfirmed: false }, { triggered: true }, { liquidationPending: true },
])('US whole-account risk state blocks starting while keeping stop available: %j', async patch => {
  settings.signalMode = 'TREND'; risk = { ...risk, ...patch }
  await mount('KiwoomUsAutoTrade.vue')
  expect(button('신규매수 시작').disabled).toBe(true)
  expect(http.post).not.toHaveBeenCalled()
  status.autoTrading = true; jest.advanceTimersByTime(30000); await flush()
  expect(button('신규매수 중지').disabled).toBe(false)
})

test('US risk read failure keeps previous values marked stale and prevents starting', async () => {
  settings.signalMode = 'TREND'; await mount('KiwoomUsAutoTrade.vue')
  const original = http.get.getMockImplementation()
  http.get.mockImplementation(url => url === `${US}/risk` ? Promise.reject(new Error('risk unavailable')) : original(url))
  jest.advanceTimersByTime(30000); await flush()
  expect(button('신규매수 시작').disabled).toBe(true)
  expect(document.querySelector('.risk-panel').textContent).toContain('risk unavailable')
  expect(document.querySelector('.risk-panel').textContent).toContain('이전 수치는 참고용')
})

test('US successful risk reads cannot extend valuation freshness past 90 seconds', async () => {
  settings.signalMode = 'TREND'
  await mount('KiwoomUsAutoTrade.vue')
  expect(button('신규매수 시작').disabled).toBe(false)
  jest.advanceTimersByTime(90000); await flush()
  expect(button('신규매수 시작').disabled).toBe(true)
  expect(document.querySelector('.risk-panel').textContent).toContain('90초 이상')
  expect(http.post).not.toHaveBeenCalled()
})

test('US missing risk observation time cannot enable buys', async () => {
  settings.signalMode = 'TREND'; risk.observedAt = null
  await mount('KiwoomUsAutoTrade.vue')
  expect(button('신규매수 시작').disabled).toBe(true)
})

test('US whole-account policy counts existing holdings and describes bid limit liquidation', async () => {
  settings.signalMode = 'TREND'; settings.maxPositions = 3
  summary.positionCount = 2; summary.managedPositionCount = 0
  await mount('KiwoomUsAutoTrade.vue')
  expect(document.querySelector('.summary').textContent).toContain('계좌 전체 보유 종목')
  expect(document.body.textContent).toContain('계좌 전체 보유·신규 미체결 매수가 최대 종목 수에 도달했습니다.')
  expect(document.querySelector('.rules').textContent).toContain('모든 매도에 매수 1호가 지정가')
  expect(document.querySelector('.rules').textContent).not.toContain('정규장에서는 시장가')
  await click('전략 설정')
  expect(document.body.textContent).toContain('계좌 전체 보유와 신규 미체결 매수 종목')
})

test('US mixed holding displays whole-position exit rules instead of the automatic lot ATR plan', async () => {
  settings.signalMode = 'TREND'
  const original = http.get.getMockImplementation()
  http.get.mockImplementation(url => url === `${US}/holdings`
    ? Promise.resolve({ data: [{ symbol: 'MIX', exchange: 'ND', quantity: 10, managedQuantity: 5,
      trendExitPlan: { trendEntryAtr: 2, trendMaxHoldingTradingDays: 5 }, profitLossPercent: -2 }] }) : original(url))
  await mount('KiwoomUsAutoTrade.vue')
  const plan = document.querySelector('.holdings-table .signal-cell')
  expect(plan.textContent).toContain('혼합 보유 · 전체 수익률 기준')
  expect(plan.textContent).toContain('자동매수 ATR 계획 미적용')
  expect(plan.textContent).not.toContain('ATR 추적 청산')
})

test('US settings dialog focuses close, traps Tab and returns focus after Escape', async () => {
  await mount('KiwoomUsAutoTrade.vue')
  const trigger = button('전략 설정'); trigger.focus(); await click('전략 설정')
  const dialog = document.querySelector('[role=dialog]'), close = dialog.querySelector('.amodal-close')
  expect(dialog.getAttribute('aria-modal')).toBe('true')
  expect(document.activeElement).toBe(close)
  close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }))
  expect(document.activeElement).toBe(button('취소'))
  document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }))
  expect(document.activeElement).toBe(close)
  close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); await flush()
  expect(document.querySelector('[role=dialog]')).toBeNull()
  expect(document.activeElement).toBe(trigger)
})

test('US settings Escape cannot dismiss while saving and successful save restores trigger focus', async () => {
  settings.signalMode = 'TREND'
  await mount('KiwoomUsAutoTrade.vue'); await click('전략 설정')
  await input(document.querySelector('#us-trail-atr'), '3')
  let resolveSave
  http.patch.mockImplementation((url, body) => new Promise(resolve => { resolveSave = () => resolve({ data: body }) }))
  await click('저장하기')
  const dialog = document.querySelector('[role=dialog]')
  dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); await flush()
  expect(document.querySelector('[role=dialog]')).toBe(dialog)
  resolveSave(); await flush()
  expect(document.querySelector('[role=dialog]')).toBeNull()
  expect(document.activeElement).toBe(button('전략 설정'))
})

test('US observation remains clearly non-paper and cannot start under whole-account policy', async () => {
  await mount('KiwoomUsAutoTrade.vue')
  expect(button('신규매수 시작').disabled).toBe(true)
  expect(document.querySelector('.validation-note').textContent).toContain('모의매매가 아니며')
  expect(document.querySelector('.validation-note').textContent).toContain('검증 전')
  await click('후보만 확인')
  expect(http.post).toHaveBeenCalledWith(`${US}/decide`, null, { params: { allowOrder: false } })
})
