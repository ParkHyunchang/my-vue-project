import http from '@/axios';

const OVERVIEW_PATH = '/api/kiwoom/accounts/overview';

/** ADMIN read-only live account view. No portfolio import or trading-state sync.
 * Response: { broker, queriedAt, markets: [{ market, status, currency, source,
 * queriedAt, dataAsOf, holdings: [{ symbol, name, quantity, averagePrice,
 * currentPrice, profitLoss, profitLossPercent, currency }], cash, notice }] }
 */
export function fetchKiwoomAccountsOverview() {
  return http.get(OVERVIEW_PATH);
}
