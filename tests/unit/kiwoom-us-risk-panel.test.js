/** @jest-environment jsdom */
const fs = require('fs')
const path = require('path')
const { parse, compileScript } = require('@vue/compiler-sfc')
const { transformSync } = require('@babel/core')
const { createApp, nextTick } = require('vue')
const http = require('@/axios').default
const { kiwoomUsRiskApi } = require('@/api/kiwoomUsRiskApi')
jest.mock('@/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))

const filename = path.resolve(__dirname, '../../src/components/stock/KiwoomUsRiskPanel.vue')
const { descriptor } = parse(fs.readFileSync(filename, 'utf8'), { filename })
const code = transformSync(compileScript(descriptor, { id: 'risk-panel', inlineTemplate: true }).content, {
  configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code
const componentModule = { exports: {} }
new Function('require', 'module', 'exports', code)(require, componentModule, componentModule.exports)
let app, events
async function mount(risk, options = {}) {
  events = { activate: jest.fn(), review: jest.fn(), flow: jest.fn() }
  const host = document.createElement('div'); document.body.appendChild(host)
  app = createApp(componentModule.exports.default, {
    loaded: true, fresh: true, risk, ...options,
    onActivate: events.activate, onReview: events.review, onCapitalFlow: events.flow,
  })
  app.mount(host); await nextTick()
}
const button = text => [...document.querySelectorAll('button')].find(el => el.textContent.trim() === text)
async function change(el, value) {
  if (el.type === 'checkbox') { el.checked = value; el.dispatchEvent(new Event('change', { bubbles: true })) }
  else { el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })) }
  await nextTick()
}
afterEach(() => { app?.unmount(); document.body.innerHTML = ''; jest.clearAllMocks() })

test('first activation requires both scope acknowledgements and never starts buying', async () => {
  await mount({ enabled: false, capitalFlowConfirmed: false })
  const activate = button('전체 계좌 위험 정책 활성화')
  expect(activate.disabled).toBe(true)
  const checks = document.querySelectorAll('input[type=checkbox]')
  await change(checks[0], true); expect(activate.disabled).toBe(true)
  await change(checks[1], true); expect(activate.disabled).toBe(false)
  activate.click(); await nextTick()
  expect(events.activate).toHaveBeenCalledTimes(1)
  expect(http.post).not.toHaveBeenCalled()
  expect(document.body.textContent).toContain('신규 자동매수를 시작하지 않습니다')
  expect(document.body.textContent).toContain('조건 충족 시 실제 매도 주문이 나갈 수 있습니다')
  expect(checks[0].parentElement.textContent).toContain('신규 매수를 켜지 않아도 매도 감시가 시작')
})

test.each(['-150.25', '0'])('capital flow %s requires ledger reference and explicit reconciliation', async amount => {
  await mount({ enabled: true, capitalFlowConfirmed: false })
  const submit = button('확인한 입출금 반영')
  await change(document.querySelector('#risk-flow-amount'), amount)
  expect(submit.disabled).toBe(true)
  await change(document.querySelector('#risk-flow-reference'), ' ledger-2026-001 ')
  expect(submit.disabled).toBe(true)
  await change(document.querySelector('input[type=checkbox]'), true)
  expect(submit.disabled).toBe(false)
  document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  await nextTick()
  expect(events.flow).toHaveBeenCalledWith({ reference: 'ledger-2026-001', amountUsd: amount })
  expect(http.post).not.toHaveBeenCalled()
})

test('latched state explains pending liquidation without offering reset or automatic peak inference', async () => {
  await mount({ enabled: true, triggered: true, liquidationPending: true, capitalFlowConfirmed: false, equityUsd: 900, peakEquityUsd: 1000, drawdownPercent: 10 })
  expect(document.body.textContent).toContain('손실 중단 잠금')
  expect(document.body.textContent).toContain('청산 진행 중')
  expect(document.body.textContent).toContain('자동 추정하지 않습니다')
  expect(document.body.textContent).toContain('실제 손실은 10%를 넘을 수 있습니다')
  expect(button('전체 계좌 위험 정책 활성화')).toBeUndefined()
  expect([...document.querySelectorAll('button')].some(el => /초기화|잠금 해제/.test(el.textContent))).toBe(false)
})

test('unavailable risk information displays unknown rather than zero and blocks acknowledgement', async () => {
  await mount({ enabled: false }, { fresh: false, error: '조회 실패' })
  expect(document.querySelector('dd').textContent).toBe('—')
  expect(button('전체 계좌 위험 정책 활성화').disabled).toBe(true)
  expect(document.body.textContent).toContain('조회 실패')
})

test('risk API contracts are separate from live trading control endpoints', async () => {
  await kiwoomUsRiskApi.get()
  await kiwoomUsRiskApi.activate()
  await kiwoomUsRiskApi.requireCapitalFlowReview()
  await kiwoomUsRiskApi.confirmCapitalFlow({ reference: 'bank-1', amountUsd: '-50' })
  const base = '/api/kiwoom/us/auto-trade/risk'
  expect(http.get).toHaveBeenCalledWith(base)
  expect(http.post.mock.calls).toEqual([
    [`${base}/activate`, { confirmAllHoldings: true, confirmCapitalFlows: true }],
    [`${base}/capital-flow-review`, { required: true }],
    [`${base}/capital-flow`, { reference: 'bank-1', amountUsd: '-50', confirm: true }],
  ])
})
