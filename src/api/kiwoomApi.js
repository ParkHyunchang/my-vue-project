import http from '@/axios'

// OpenAPI 타입 참조 — `npm run gen:api` 실행 후 src/generated/api.d.ts 가 생성되면 활성화됨.
/** @typedef {import('@/generated/api').components['schemas']['KiwoomStrategyRunResponse']} KiwoomStrategyRunResponse */

const STRATEGY_PATH = '/api/kiwoom/strategy'
const AUTO_TRADE_PATH = '/api/kiwoom/auto-trade'

/**
 * KRX 자동 스캔 매매 후보(유니버스) 조회 — 읽기 전용.
 * 응답: [{ code, name, market, closePrice, changePercent, volumeRatio, asOf }]
 */
export function fetchStrategyUniverse() {
  return http.get(`${STRATEGY_PATH}/universe`)
}

/**
 * 전략 판단 이력 조회 (최신순).
 * 응답: KiwoomStrategyRunResponse[] — { id, status, triggeredBy, marketView, errorMessage,
 *   aiCalled, inputTokens, outputTokens, createdAt, proposals[] }
 * @param {number} limit - 최대 50건까지 서버에서 제한됨
 */
export function fetchStrategyRuns(limit = 10) {
  return http.get(`${STRATEGY_PATH}/runs`, { params: { limit } })
}

/**
 * 전략 정적 설정 + 런타임 조정값 조회.
 * 응답: { enabled, orderEnabled, maxOrderAmount, dailyMaxProposals, cooldownMinutes,
 *   allowMarketOrders, autoExecute, autoExecuteMinConfidence, maxBuyDepositPercent,
 *   candidateReevaluationMinutes, swing*, riskLoopEnabled, dailyLossLimitAmount }
 */
export function fetchStrategyConfig() {
  return http.get(`${STRATEGY_PATH}/config`)
}

/**
 * 자동매매 운영 상태(health) 조회.
 * 응답: { configured, autoTrading, decisionRunning, consecutiveApiFailures,
 *   lastApiFailureAt, lastApiFailureMessage, lastRunAt, runCount, proposalCount, risk, recentAudit }
 */
export function fetchStrategyHealth() {
  return http.get(`${STRATEGY_PATH}/health`)
}

/**
 * 전략 설정 조회 (설정 모달용 — config와 달리 AI 프롬프트 원문 prompt 포함).
 */
export function fetchStrategySettings() {
  return http.get(`${STRATEGY_PATH}/settings`)
}

/**
 * 전략 설정 저장.
 * @param {Object} payload - { autoExecute, autoExecuteMinConfidence, maxBuyDepositPercent,
 *   candidateReevaluationMinutes, swingMinChangePercent, swingMaxChangePercent, swingMinVolumeRatio,
 *   swingStopLossPercent, swingTakeProfitPercent, swingMaxHoldingDays, riskLoopEnabled,
 *   dailyLossLimitAmount, dailyMaxProposals, prompt }
 */
export function updateStrategySettings(payload) {
  return http.patch(`${STRATEGY_PATH}/settings`, payload)
}

/** 즉시 재판단 실행. 판단 중복 실행 시 409. */
export function runStrategyDecision() {
  return http.post(`${STRATEGY_PATH}/decide`)
}

/**
 * 브로커 주문 상태 동기화.
 * 응답: { updated, message }
 */
export function syncStrategyOrders() {
  return http.post(`${STRATEGY_PATH}/orders/sync`)
}

/** 오늘의 일일 손실 차단 해제 — 현재 자산을 새 기준점으로 저장한다. */
export function resetDailyLossGuard() {
  return http.post(`${STRATEGY_PATH}/risk/daily-loss/reset`)
}

/**
 * 키움 실계좌 보유현황 조회.
 * 응답: [{ stockCode, stockName, quantity, sellableQuantity, averagePrice, positionOpenedAt, syncedAt }]
 */
export function fetchAccountHoldings() {
  return http.get(`${AUTO_TRADE_PATH}/holdings`)
}

/**
 * 보유 종목 수동 시장가 청산 — 미체결 매도 주문을 취소하고 매도가능수량이 돌아오는 대로 전량 매도한다.
 * 정규장 밖이거나 주문 전송이 꺼져 있으면 409.
 * @param {string[]} stockCodes - 비우면 보유 전 종목
 * 응답: { accepted, message, items: [{ stockCode, stockName, quantity, submittedQuantity,
 *   canceledOrders, brokerOrderNo, status, message }] } — status: SUBMITTED | WAITING_SELLABLE | FAILED
 */
export function liquidateHoldings(stockCodes = []) {
  return http.post(`${AUTO_TRADE_PATH}/holdings/liquidate`, { stockCodes })
}
