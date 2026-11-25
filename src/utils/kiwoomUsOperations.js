import { isTradingToday, tradingTimestamp } from './tradingTime'

export function usTodayOperations(logs, now = Date.now()) {
  const items = logs.filter(item => isTradingToday(item.createdAt, now))
    .sort((a, b) => tradingTimestamp(b.createdAt) - tradingTimestamp(a.createdAt))
  const count = types => items.filter(item => types.includes(item.eventType || item.type)).length
  return {
    items,
    decisions: count(['DECISION_RESULT']),
    orders: count(['BUY_ORDER', 'SELL_ORDER', 'RESEARCH_ORDER']),
    fills: count(['BUY_FILLED', 'SELL_FILLED']),
    blocks: count(['USD_CASH_BLOCK', 'CANDIDATE_REJECTED', 'ORDER_UNKNOWN', 'RISK_REVIEW']),
  }
}

export const usPendingOrder = item => ['SUBMITTING', 'ORDERED', 'PARTIALLY_FILLED', 'CANCEL_REQUESTED', 'UNKNOWN'].includes(item.status)
export const usOrderLabel = status => ({ PROPOSED: '검토 기록', SUBMITTING: '전송 중', ORDERED: '접수·미체결', PARTIALLY_FILLED: '부분 체결', FILLED: '체결 완료', CANCEL_REQUESTED: '취소 요청 중', PARTIALLY_FILLED_CANCELED: '부분 체결 후 취소', CANCELED: '취소 완료', FAILED: '실패', UNKNOWN: '결과 미확인' }[status] || '상태 확인 필요')
