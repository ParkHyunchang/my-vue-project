import { ref } from 'vue';
import { useHoldingsPricing, useHoldingDisplay, buildAnalysisContext } from '@/composables/useHoldingsPricing';
import { usePortfolioStats } from '@/composables/usePortfolioStats';
import { fetchQuote, fetchUsdKrwQuote } from '@/api/stockApi';

jest.mock('@/api/stockApi', () => ({ fetchQuote: jest.fn(), fetchUsdKrwQuote: jest.fn() }));

const kr = { id: 1, symbol: 'KR', name: '한국', market: 'KR', quantity: 2, avgPrice: 9000 };
const us = { id: 2, symbol: 'US', name: '미국', market: 'US', quantity: 2, avgPrice: 9 };
function context(list = [kr, us]) {
  const holdings = ref(list);
  const pricing = useHoldingsPricing({ holdings, active: true });
  const marketFilter = ref('all'); const sortKey = ref('value'); const sortDir = ref('desc');
  const stats = usePortfolioStats({ holdings, ...pricing, marketFilter, sortKey, sortDir });
  return { holdings, ...pricing, ...stats, marketFilter, sortKey, sortDir };
}
beforeEach(() => {
  jest.resetAllMocks();
  fetchQuote.mockImplementation(async symbol => ({ data: { price: symbol === 'KR' ? 10000 : 10, changePercent: 1 } }));
  fetchUsdKrwQuote.mockResolvedValue({ data: { price: 1400 } });
});

test('first quote failure produces unknown totals and no false loss or allocation', async () => {
  fetchQuote.mockRejectedValue(new Error('offline'));
  const c = context([kr]);
  await c.fetchPrices();
  expect(c.pricingStatus.value).toBe('missing');
  expect(c.lastUpdatedAt.value).toBeNull();
  expect(c.holdPnl(kr)).toBeNull();
  expect(c.krTotal.value).toBeNull();
  expect(c.totalPnl.value).toBeNull();
  expect(c.totalPnlPct.value).toBeNull();
  expect(c.totalValKRW.value).toBeNull();
  expect(c.chartSegments.value).toEqual([]);
});

test('failed refresh retains last good values and does not advance successful timestamp', async () => {
  const c = context([kr]);
  await c.fetchPrices();
  const last = c.lastUpdatedAt.value;
  const quoteAt = c.prices.value.KR.fetchedAt;
  fetchQuote.mockRejectedValue(new Error('offline'));
  await c.fetchPrices();
  expect(c.pricingStatus.value).toBe('stale');
  expect(c.prices.value.KR).toMatchObject({ price: 10000, stale: true, fetchedAt: quoteAt });
  expect(c.lastUpdatedAt.value).toBe(last);
  expect(c.totalValKRW.value).toBe(20000);
  expect(c.totalPnl.value).toBe(2000);
  const display = useHoldingDisplay({ ...c, displayCurrency: ref('native') });
  expect(display.fmtCurPrice(kr)).toContain('이전 시세');
});

test('partial refresh preserves failed symbol while applying successful quote', async () => {
  const c = context();
  await c.fetchPrices();
  const last = c.lastUpdatedAt.value;
  fetchQuote.mockImplementation(async symbol => {
    if (symbol === 'US') throw new Error('offline');
    return { data: { price: 12000 } };
  });
  await c.fetchPrices();
  expect(c.pricingStatus.value).toBe('partial');
  expect(c.prices.value.KR.price).toBe(12000);
  expect(c.prices.value.US).toMatchObject({ price: 10, stale: true });
  expect(c.totalValKRW.value).toBe(52000);
  expect(c.lastUpdatedAt.value).toBe(last);
});

test.each([null, 0, -1, 'not-a-price', Infinity])('invalid quote %s cannot replace a valid previous price', async price => {
  const c = context([kr]);
  await c.fetchPrices();
  fetchQuote.mockResolvedValue({ data: { price } });
  await c.fetchPrices();
  expect(c.prices.value.KR.price).toBe(10000);
  expect(c.pricingStatus.value).toBe('stale');
});

test('missing exchange rate does not drop US value from combined totals', async () => {
  fetchUsdKrwQuote.mockRejectedValue(new Error('offline'));
  const c = context();
  await c.fetchPrices();
  expect(c.krTotal.value).toBe(20000);
  expect(c.usTotal.value).toBe(20);
  expect(c.totalValKRW.value).toBeNull();
  expect(c.totalPnlKRW.value).toBeNull();
  expect(c.valuationComplete.value).toBe(false);
  expect(c.chartSegments.value).toEqual([]);
  expect(c.lastUpdatedAt.value).toBeNull();
  expect(c.sortNotice.value).toContain('환율 미확인');
});

test('exchange rate refresh failure preserves last rate and explicitly marks it stale', async () => {
  const c = context();
  await c.fetchPrices();
  const last = c.lastUpdatedAt.value;
  fetchUsdKrwQuote.mockRejectedValue(new Error('offline'));
  await c.fetchPrices();
  expect(c.exchangeRate.value).toBe(1400);
  expect(c.exchangeStatus.value).toBe('stale');
  expect(c.pricingMessage.value).toContain('환율도 이전 값');
  expect(c.lastUpdatedAt.value).toBe(last);
});

test.each(['value', 'curPrice'])('mixed %s sorting uses KRW, irrespective of native display', async sort => {
  const c = context();
  await c.fetchPrices(); c.sortKey.value = sort;
  expect(c.sortedHoldings.value.map(h => h.symbol)).toEqual(['US', 'KR']);
  c.sortDir.value = 'asc';
  expect(c.sortedHoldings.value.map(h => h.symbol)).toEqual(['KR', 'US']);
});

test('unknown values sort last in both directions and US-only sort needs no exchange rate', async () => {
  fetchUsdKrwQuote.mockRejectedValue(new Error('offline'));
  const c = context(); await c.fetchPrices();
  for (const direction of ['asc', 'desc']) {
    c.sortDir.value = direction;
    expect(c.sortedHoldings.value.map(h => h.symbol)).toEqual(['KR', 'US']);
  }
  c.holdings.value = [us, { ...us, id: 3, symbol: 'US2', name: '미국2' }];
  c.prices.value.US2 = { price: 20 };
  c.sortDir.value = 'desc';
  expect(c.sortedHoldings.value.map(h => h.symbol)).toEqual(['US2', 'US']);
});

test('newly missing symbol prevents partial totals and AI context claiming current completeness', async () => {
  const c = context();
  fetchQuote.mockImplementation(async symbol => {
    if (symbol === 'US') throw new Error('missing');
    return { data: { price: 10000 } };
  });
  await c.fetchPrices();
  const result = buildAnalysisContext(c);
  expect(result.totalValueKRW).toBeNull();
  expect(result.asOf).toBeNull();
  expect(result.holdings[1]).toMatchObject({ currentPrice: null, marketValue: null, weightPct: null, quoteStatus: 'missing' });
});

test('cash needs no quote or exchange rate and successful recovery clears stale status', async () => {
  const c = context([{ ...kr, assetType: 'CASH', quantity: 100, avgPrice: 1 }]);
  await c.fetchPrices();
  expect(fetchQuote).not.toHaveBeenCalled();
  expect(c.totalValKRW.value).toBe(100);
  c.holdings.value = [kr];
  fetchQuote.mockRejectedValueOnce(new Error('offline'));
  await c.fetchPrices();
  await c.fetchPrices();
  expect(c.pricingStatus.value).toBe('fresh');
  expect(c.prices.value.KR.stale).toBe(false);
});
