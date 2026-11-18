import { computed } from 'vue';

const CHART_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#3b82f6',
  '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6',
  '#f97316', '#a78bfa', '#34d399', '#fb923c',
];

function arcPath(s, e, ro, ri) {
  const cos = Math.cos;
  const sin = Math.sin;
  const large = e - s > Math.PI ? 1 : 0;
  return [
    `M ${ro * cos(s)} ${ro * sin(s)}`,
    `A ${ro} ${ro} 0 ${large} 1 ${ro * cos(e)} ${ro * sin(e)}`,
    `L ${ri * cos(e)} ${ri * sin(e)}`,
    `A ${ri} ${ri} 0 ${large} 0 ${ri * cos(s)} ${ri * sin(s)}`,
    'Z',
  ].join(' ');
}

/**
 * 포트폴리오 통계/차트 계산 컴포저블.
 *
 * @param {Object} ctx
 * @param {import('vue').Ref<Array>} ctx.holdings
 * @param {import('vue').Ref<Object>} ctx.prices
 * @param {import('vue').Ref<string>} ctx.marketFilter
 * @param {import('vue').Ref<number>} ctx.exchangeRate
 * @param {import('vue').Ref<string>} ctx.sortKey
 * @param {import('vue').Ref<string>} ctx.sortDir
 */
export function usePortfolioStats({ holdings, prices, marketFilter, exchangeRate, sortKey, sortDir }) {
  const filteredHoldings = computed(() => {
    if (marketFilter.value === 'kr') return holdings.value.filter((h) => h.market === 'KR');
    if (marketFilter.value === 'us') return holdings.value.filter((h) => h.market === 'US');
    return holdings.value;
  });

  function priceOf(h) {
    if (h.assetType === 'CASH') return 1;
    const price = prices.value[h.symbol]?.price;
    return typeof price === 'number' && Number.isFinite(price) && price > 0 ? price : null;
  }
  function toKRW(value, h) {
    if (value == null) return null;
    return h.market === 'US' ? (exchangeRate.value > 0 ? value * exchangeRate.value : null) : value;
  }
  function sumKnown(list, valueFor) {
    const values = list.map(valueFor);
    return values.some(value => value == null) ? null : values.reduce((sum, value) => sum + value, 0);
  }
  function valueOf(h) {
    const price = priceOf(h);
    return price == null ? null : price * h.quantity;
  }
  function holdPnl(h) {
    if (!h.avgPrice || priceOf(h) == null) return null;
    return (priceOf(h) - h.avgPrice) * h.quantity;
  }
  function holdPnlPct(h) {
    const pnl = holdPnl(h);
    return pnl == null ? null : ((priceOf(h) - h.avgPrice) / h.avgPrice) * 100;
  }
  function holdValKRW(h) { return toKRW(valueOf(h), h); }
  const valuationComplete = computed(() => filteredHoldings.value.every(h => holdValKRW(h) != null));
  const mixedMarkets = computed(() => new Set(filteredHoldings.value.map(h => h.market)).size > 1);
  const sortNotice = computed(() => {
    if (!['value', 'curPrice'].includes(sortKey.value) || !mixedMarkets.value) return '';
    return exchangeRate.value > 0
      ? '금액 정렬은 원화 환산 기준입니다.'
      : '환율 미확인 · 미국 종목의 환산 금액 정렬 대기 (목록 뒤에 표시)';
  });
  const sortedHoldings = computed(() => {
    const arr = [...filteredHoldings.value];
    if (!sortKey.value) return arr;
    const amount = (h, value) => mixedMarkets.value ? toKRW(value, h) : value;
    function sortValue(h) {
      if (sortKey.value === 'value') return amount(h, valueOf(h));
      if (sortKey.value === 'curPrice') return amount(h, priceOf(h));
      if (sortKey.value === 'pnlPct') return holdPnlPct(h);
      if (sortKey.value === 'changePct') return prices.value[h.symbol]?.changePercent ?? null;
      return null;
    }
    return arr.sort((a, b) => {
      if (sortKey.value === 'name') return (sortDir.value === 'asc' ? 1 : -1) * a.name.localeCompare(b.name);
      const va = sortValue(a); const vb = sortValue(b);
      // Unknown amounts always stay last, regardless of ascending/descending order.
      if (va == null || vb == null) return va == null ? (vb == null ? 0 : 1) : -1;
      return sortDir.value === 'asc' ? va - vb : vb - va;
    });
  });
  const krHoldingsCount = computed(() => holdings.value.filter(h => h.market === 'KR').length);
  const usHoldingsCount = computed(() => holdings.value.filter(h => h.market === 'US').length);
  const marketList = market => filteredHoldings.value.filter(h => h.market === market);
  const costOf = h => h.avgPrice ? h.avgPrice * h.quantity : 0;
  const pnlOf = h => h.avgPrice ? holdPnl(h) : 0;
  const pct = (pnl, cost) => pnl == null || cost == null ? null : (cost === 0 ? 0 : pnl / cost * 100);
  const krTotal = computed(() => sumKnown(marketList('KR'), valueOf));
  const usTotal = computed(() => sumKnown(marketList('US'), valueOf));
  const usTotalKRW = computed(() => marketList('US').length ? toKRW(usTotal.value, { market: 'US' }) : 0);
  const hasAvgPrice = computed(() => filteredHoldings.value.some(h => h.avgPrice));
  const krCost = computed(() => sumKnown(marketList('KR'), costOf));
  const usCost = computed(() => sumKnown(marketList('US'), costOf));
  const krPnl = computed(() => sumKnown(marketList('KR'), pnlOf));
  const usPnl = computed(() => sumKnown(marketList('US'), pnlOf));
  const krPnlPct = computed(() => pct(krPnl.value, krCost.value));
  const usPnlPct = computed(() => pct(usPnl.value, usCost.value));
  const krHasAvgPrice = computed(() => marketList('KR').some(h => h.avgPrice));
  const usHasAvgPrice = computed(() => marketList('US').some(h => h.avgPrice));
  const totalValKRW = computed(() => sumKnown(filteredHoldings.value, holdValKRW));
  const totalCostKRW = computed(() => sumKnown(filteredHoldings.value, h => toKRW(costOf(h), h)));
  const totalPnlKRW = computed(() => sumKnown(filteredHoldings.value, h => toKRW(pnlOf(h), h)));
  const totalPnlKRWPct = computed(() => pct(totalPnlKRW.value, totalCostKRW.value));
  const totalCost = computed(() => mixedMarkets.value ? totalCostKRW.value : sumKnown(filteredHoldings.value, costOf));
  const totalPnl = computed(() => mixedMarkets.value ? totalPnlKRW.value : sumKnown(filteredHoldings.value, pnlOf));
  const totalPnlPct = computed(() => pct(totalPnl.value, totalCost.value));

  const chartSegments = computed(() => {
    // Incomplete prices/rates must not create a misleading partial 100% allocation.
    if (!valuationComplete.value) return [];
    const items = filteredHoldings.value
      .map(h => ({ h, val: valueOf(h), valKRW: holdValKRW(h), currency: h.market === 'KR' ? 'KRW' : 'USD' }))
      .filter(item => item.valKRW > 0)
      .sort((a, b) => b.valKRW - a.valKRW);

    const totalKRW = items.reduce((s, item) => s + item.valKRW, 0);
    if (totalKRW === 0) return [];

    const segs = [];
    let cum = -Math.PI / 2;
    const gap = items.length > 1 ? 0.025 : 0;
    const TEXT_R = 63;

    items.forEach(({ h, val, valKRW, currency }, idx) => {
      const pct = valKRW / totalKRW;
      const angle = pct * 2 * Math.PI;
      const start = cum + gap / 2;
      const end = cum + angle - gap / 2;
      const mid = (start + end) / 2;
      segs.push({
        id: h.id,
        name: h.name,
        value: val,
        valKRW,
        pct,
        color: CHART_COLORS[idx % CHART_COLORS.length],
        path: arcPath(start, end, 78, 48),
        currency,
        labelX: TEXT_R * Math.cos(mid),
        labelY: TEXT_R * Math.sin(mid),
      });
      cum += angle;
    });
    return segs;
  });

  return {
    filteredHoldings, sortedHoldings, valuationComplete, sortNotice,
    krHoldingsCount, usHoldingsCount,
    krTotal, usTotal, usTotalKRW, hasAvgPrice,
    totalPnl, totalCost, totalPnlPct,
    krPnl, krPnlPct, krHasAvgPrice,
    usPnl, usPnlPct, usHasAvgPrice,
    totalValKRW, totalPnlKRW, totalCostKRW, totalPnlKRWPct,
    chartSegments,
    holdPnl, holdPnlPct, holdValKRW,
  };
}
