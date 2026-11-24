/** @jest-environment jsdom */
const fs = require('fs'), path = require('path')
const { parse, compileScript } = require('@vue/compiler-sfc')
const { transformSync } = require('@babel/core')
const { createApp, nextTick } = require('vue')
const http = require('@/axios').default
const { usStrategyDeploymentApi } = require('@/api/usStrategyDeploymentApi')
jest.mock('@/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
const filename = path.resolve(__dirname, '../../src/components/stock/UsStrategyDeploymentPanel.vue')
const { descriptor } = parse(fs.readFileSync(filename, 'utf8'), { filename })
const code = transformSync(compileScript(descriptor, { id: 'deployment', inlineTemplate: true }).content, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code
const compiled = { exports: {} }
new Function('require', 'module', 'exports', code)(require, compiled, compiled.exports)
const BASE = '/api/kiwoom/us/strategy-deployments'
const sample = overrides => ({ bridgeEnabled: true, revision: 4, accountScope: 'scope-123456', managed: false, active: null, blockers: [], lastExecution: '',
  candidate: { id: 'bundle-1', candidateId: 'balanced_trend:recovery_vol', name: '검증 후보', version: 'version-1', reportId: 'report-1', historicalAnnualizedPct: 11, forwardReturnPct: 4, forwardDays: 64, forwardFillCount: 22, eligible: true, reasons: [] }, ...overrides })
let app
const flush = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); await nextTick() }
const button = text => [...document.querySelectorAll('button')].find(item => item.textContent.trim() === text)
async function mount(data = sample()) { http.get.mockResolvedValue({ data }); const host = document.createElement('div'); document.body.appendChild(host); app = createApp(compiled.exports.default); app.mount(host); await flush() }
async function agree(index = 0) { const input = document.querySelectorAll('input[type=checkbox]')[index]; input.checked = true; input.dispatchEvent(new Event('change', { bubbles: true })); await flush() }
async function selectFile(text, size = 200) { const input = document.querySelector('input[type=file]'); Object.defineProperty(input, 'files', { configurable: true, value: [{ size, name: 'report.json', text: async () => text }] }); input.dispatchEvent(new Event('change', { bubbles: true })); await flush() }
afterEach(() => { app?.unmount(); app = null; document.body.innerHTML = ''; jest.resetAllMocks() })

test('API binds live approval to report/version/revision and has no trading start call', async () => {
  const signal = new AbortController().signal
  const decision = { candidateId: 'bundle-1', expectedRevision: 4, reportId: 'report-1', version: 'version-1', confirmLive: true }
  await usStrategyDeploymentApi.status(signal); await usStrategyDeploymentApi.importReport({ payloadJson: '{}', signature: 'signature' }, signal)
  await usStrategyDeploymentApi.approve(decision, signal); await usStrategyDeploymentApi.revoke(4, signal)
  expect(http.get.mock.calls[0]).toEqual([`${BASE}/status`, { signal, timeout: 30000 }])
  expect(http.post.mock.calls.map(call => call.slice(0, 2))).toEqual([[`${BASE}/imports`, { payloadJson: '{}', signature: 'signature' }], [`${BASE}/approve`, decision], [`${BASE}/revoke`, { expectedRevision: 4 }]])
})
test('disabled bridge locks import and approval without mutations', async () => {
  await mount(sample({ bridgeEnabled: false }))
  expect(document.body.textContent).toContain('실계좌 전략 연결 비활성')
  expect(document.querySelector('input[type=file]').disabled).toBe(true)
  expect(button('이 버전을 실계좌용 전략으로 승인').disabled).toBe(true)
  expect(http.post).not.toHaveBeenCalled()
})
test('explicit consent and fresh identity are required for live strategy approval', async () => {
  await mount(); expect(button('이 버전을 실계좌용 전략으로 승인').disabled).toBe(true)
  await agree(); http.post.mockResolvedValue({ data: {} })
  button('이 버전을 실계좌용 전략으로 승인').click(); await flush()
  expect(http.get).toHaveBeenCalledTimes(3)
  expect(http.post.mock.calls[0].slice(0, 2)).toEqual([`${BASE}/approve`, { candidateId: 'bundle-1', expectedRevision: 4, reportId: 'report-1', version: 'version-1', confirmLive: true }])
  expect(document.body.textContent).toContain('자동매매를 시작하거나 주문하지 않았습니다')
  expect(document.querySelector('input[type=checkbox]').checked).toBe(false)
})
test.each(['revision', 'accountScope', 'candidateVersion'])('changed %s before approval refuses mutation', async changed => {
  await mount(); await agree()
  const latest = changed === 'candidateVersion' ? sample({ candidate: { ...sample().candidate, version: 'version-2' } }) : sample({ [changed]: changed === 'revision' ? 5 : 'other-account' })
  http.get.mockResolvedValue({ data: latest })
  button('이 버전을 실계좌용 전략으로 승인').click(); await flush()
  expect(http.post).not.toHaveBeenCalled()
  expect(document.body.textContent).toContain('다시 동의하세요')
})
test('new risk blocker immediately before approval refuses mutation', async () => {
  await mount(); await agree(); http.get.mockResolvedValue({ data: sample({ blockers: ['손실 차단'] }) })
  button('이 버전을 실계좌용 전략으로 승인').click(); await flush()
  expect(http.post).not.toHaveBeenCalled(); expect(document.body.textContent).toContain('승인 조건이 변경되었습니다')
})
test('ineligible candidate and missing scope fail closed', async () => {
  await mount(sample({ accountScope: '', candidate: { ...sample().candidate, eligible: false, reasons: ['관찰 부족'] } }))
  expect(document.body.textContent).toContain('관찰 부족')
  expect(document.querySelector('input[type=checkbox]').disabled).toBe(true)
  expect(button('이 버전을 실계좌용 전략으로 승인').disabled).toBe(true)
})
test('report import validates envelope and does not approve or start trading', async () => {
  await mount(); http.post.mockResolvedValue({ data: {} })
  await selectFile('{"payloadJson":"{}","signature":"signed-value"}')
  expect(button('보고서 검증·등록').disabled).toBe(false)
  button('보고서 검증·등록').click(); await flush()
  expect(http.post.mock.calls.map(call => call.slice(0, 2))).toEqual([[`${BASE}/imports`, { payloadJson: '{}', signature: 'signed-value' }]])
  expect(document.body.textContent).toContain('별도로 승인하세요')
})
test('malformed and oversized report never submits', async () => {
  await mount(); await selectFile('{"force":true}')
  expect(button('보고서 검증·등록').disabled).toBe(true)
  await selectFile('{}', 1024 * 1024 + 1)
  expect(document.body.textContent).toContain('1MB 이하')
  expect(http.post).not.toHaveBeenCalled()
})
test('refresh failure retains last values and cancels consent until successful refresh', async () => {
  await mount(); await agree(); http.get.mockRejectedValueOnce(new Error('read failure'))
  button('연결 상태 확인').click(); await flush()
  expect(document.body.textContent).toContain('scope-123456')
  expect(button('이 버전을 실계좌용 전략으로 승인').disabled).toBe(true)
  expect(document.querySelector('input[type=checkbox]').checked).toBe(false)
  http.get.mockResolvedValue({ data: sample() }); button('연결 상태 확인').click(); await flush()
  expect(document.querySelector('input[type=checkbox]').disabled).toBe(false)
  expect(button('이 버전을 실계좌용 전략으로 승인').disabled).toBe(true)
})
test('revocation requires explicit separate consent and preserves risk warning', async () => {
  await mount(sample({ active: { candidateId: 'active', version: 'v1', reportId: 'r1' }, managed: true }))
  expect(button('연구 전략 승인 철회').disabled).toBe(true)
  await agree(1); http.post.mockResolvedValue({ data: {} }); button('연구 전략 승인 철회').click(); await flush()
  expect(http.post.mock.calls[0].slice(0, 2)).toEqual([`${BASE}/revoke`, { expectedRevision: 4 }])
  expect(document.body.textContent).toContain('다른 전략을 자동으로 시작하지 않았습니다')
  expect(document.body.textContent).toContain('고점·손실 차단 이력을 초기화하지 않습니다')
})
test('malformed status exposes no usable live approval controls', async () => {
  await mount({ autoTrading: true })
  expect(document.body.textContent).toContain('서버의 응답을 확인할 수 없습니다')
  expect(button('이 버전을 실계좌용 전략으로 승인')).toBeUndefined()
  expect(http.post).not.toHaveBeenCalled()
})

test('revoked managed account is shown as stopped with no legacy fallback', async () => {
  await mount(sample({ managed: true, active: null }))
  expect(document.body.textContent).toContain('연구 전략 중지 · 기존 전략 자동 복귀 없음')
  expect(document.body.textContent).not.toContain('연구 전략 관리 전')
})

test('browser fixture retains managed ownership after revoking approval', async () => {
  const { default: mock, resetScenario } = require('../../scripts/strategy-deployment-mock')
  resetScenario('ready')
  await mock.post(`${BASE}/approve`, { expectedRevision: 4, confirmLive: true })
  await mock.post(`${BASE}/revoke`, { expectedRevision: 5 })
  const { data } = await mock.get(`${BASE}/status`)
  expect(data.managed).toBe(true)
  expect(data.active).toBeNull()
})
