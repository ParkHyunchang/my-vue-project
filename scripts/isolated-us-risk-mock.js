import { reactive } from 'vue'
export const callLog = reactive([])
let scenario, risk, summary, status, settings
const now = () => new Date().toISOString()
const copy = value => JSON.parse(JSON.stringify(value))
export function resetScenario(name) {
  scenario = name; callLog.splice(0)
  risk = { enabled: name !== 'inactive', capitalFlowConfirmed: !['inactive', 'review'].includes(name), triggered: name === 'triggered', liquidationPending: name === 'triggered', equityUsd: name === 'triggered' ? 9000 : 10000, peakEquityUsd: 10000, drawdownPercent: name === 'triggered' ? 10 : 0, limitPercent: 10, observedAt: name === 'inactive' ? null : name === 'stale' ? new Date(Date.now() - 120000).toISOString() : now(), message: '로컬 모의 상태입니다. 실제 계좌와 무관합니다.' }
  status = { configured: true, autoTrading: false, orderEnabled: true, strategyEnabled: true, marketOpen: true, entryWindow: true, marketSession: '정규장', unresolvedUnknownOrders: name === 'unknown' ? 1 : 0 }
  summary = { cash: { availableUsd: 4000, krwOrderSettingAmount: 0, usdOnlyBuyAllowed: true }, totalAssetUsd: 10000, automatedCapitalUsd: 10000, perOrderLimitUsd: 2500, stockEvaluationUsd: 6000, managedEvaluationUsd: 3000, positionCount: 2, managedPositionCount: 1, fresh: name !== 'unknown', capturedAt: now(), krwOrderServiceStatus: { code: 'CANCELED', label: '해지됨' }, buyingPower: { signalMode: 'TREND', maxOrderPercent: 25, maxPositions: 4, riskPerTradePercent: 0.5, riskBudgetUsd: 50, reservedUsd: 100, unreservedUsd: 3900, allocationLimitUsd: 2500, pendingPositionCount: 1, holdingsSyncedAt: now() } }
  settings = { signalMode: 'TREND', minRelativeStrengthPercent: 0, riskPerTradePercent: 0.5, atrStopMultiplier: 2, maxEntryExtensionAtr: 1, trailingStopAtrMultiplier: 2, trailingActivationR: 1, maxHoldingTradingDays: 5, fundamentalFilterEnabled: true, maxForwardPe: 50, minRoePercent: 10, minChangePercent: 2, maxChangePercent: 8, minVolumeRatio: 1.2, maxSpreadPercent: 0.15, maxOrderPercent: 25, maxPositions: 4, dailyMaxBuys: 2, symbolCooldownDays: 5, maxHoldingDays: 5, stopLossPercent: 3, takeProfitPercent: 5, takeProfitPercent2: 8, dailyLossLimitPercent: 3 }
}
async function request(method, url, body) {
  callLog.push({ method, url, body: copy(body ?? null) })
  const base = '/api/kiwoom/us/auto-trade'
  if (!url.startsWith(base + '/')) throw new Error(`HARNESS blocked unlisted URL: ${url}`)
  const endpoint = url.slice(base.length)
  let data
  if (method === 'GET') {
    if (endpoint === '/risk') { if (scenario === 'failure') throw new Error('MOCK 위험 API 조회 실패'); data = risk }
    else if (endpoint === '/status') data = status
    else if (endpoint === '/summary') data = summary
    else if (endpoint === '/settings') data = settings
    else if (endpoint === '/holdings') data = [
      { exchange: 'NAS', symbol: 'MOCKA', stockName: '모의 기존 보유', quantity: 10, managedQuantity: 0, currentPrice: 300, profitLossPercent: 2.5 },
      { exchange: 'NAS', symbol: 'MOCKB', stockName: '모의 추세 자동관리', quantity: 20, managedQuantity: 20, managedAveragePrice: 145, currentPrice: 150, profitLossPercent: 3.45, trendStopPrice: 140, trendHighWaterPrice: 152, trendStartedOn: '2026-11-16', trendExitPlan: { trendEntryAtr: 2.5, trendRiskPerShare: 5, trendTrailActivationR: 1, trendTrailAtrMultiplier: 2, trendMaxHoldingTradingDays: 5 } },
    ]
    else if (['/audit', '/candidates'].includes(endpoint)) data = []
    else throw new Error(`HARNESS unsupported GET: ${endpoint}`)
  } else if (method === 'POST') {
    if (endpoint === '/risk/activate') { risk.enabled = true; risk.capitalFlowConfirmed = true; risk.observedAt = now(); status.autoTrading = false; data = risk }
    else if (endpoint === '/risk/capital-flow-review') { risk.capitalFlowConfirmed = false; data = risk }
    else if (endpoint === '/risk/capital-flow') { risk.capitalFlowConfirmed = true; risk.observedAt = now(); risk.message = `MOCK 원장 ${body.reference}: ${body.amountUsd} USD 확인됨`; data = risk }
    else if (endpoint === '/sync') { summary.fresh = true; summary.capturedAt = now(); risk.observedAt = now(); data = { snapshot: summary, warnings: [] } }
    else if (endpoint === '/control') { status.autoTrading = body.enabled; data = status }
    else if (endpoint === '/decide') data = { message: 'MOCK 후보 확인 완료 · 주문 전송 없음' }
    else if (endpoint === '/index-universe/refresh') data = { message: 'MOCK 완료' }
    else throw new Error(`HARNESS unsupported POST: ${endpoint}`)
  } else if (method === 'PATCH' && endpoint === '/settings') { settings = copy(body); data = settings }
  else throw new Error(`HARNESS unsupported method: ${method} ${endpoint}`)
  return { data: copy(data) }
}
export default { get: url => request('GET', url), post: (url, body) => request('POST', url, body), patch: (url, body) => request('PATCH', url, body) }
