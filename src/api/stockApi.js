import http from '@/axios'

// OpenAPI 타입 참조 — `npm run gen:api` 실행 후 src/generated/api.d.ts 가 생성되면 활성화됨.
/** @typedef {import('@/generated/api').components['schemas']['StockQuoteDto']} StockQuoteDto */

const QUOTE_PATH = '/api/stock/quote'

// 원/달러 환율 조회용 야후 심볼
export const USD_KRW_SYMBOL = 'USDKRW=X'

/**
 * 종목 실시간 시세 조회.
 * 응답: StockQuoteDto — { symbol, name, price, change, changePercent, marketCap, currency, volume }
 * @param {string} symbol - 종목 심볼 (KR: 6자리 코드, US: 티커)
 * @param {string} market - 'kr' | 'us'
 */
export function fetchQuote(symbol, market) {
  return http.get(QUOTE_PATH, { params: { symbol, market } })
}

/**
 * 원/달러 환율 시세 조회. 응답의 price 필드가 환율.
 */
export function fetchUsdKrwQuote() {
  return http.get(QUOTE_PATH, { params: { symbol: USD_KRW_SYMBOL, market: 'us' } })
}
