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

  function holdPnl(h) {
    if (!h.avgPrice) return null;
    const p = prices.value[h.symbol]?.price;
    return p != null ? (p - h.avgPrice) * h.quantity : null;
  }
  function holdPnlPct(h) {
    if (!h.avgPrice) return null;
    const p = prices.value[h.symbol]?.price;
    return p != null && h.avgPrice !== 0
      ? ((p - h.avgPrice) / h.avgPrice) * 100
      : null;
  }
  function holdValKRW(h) {
    if (h.market !== 'US' || !exchangeRate.value) return 0;
    const p = prices.value[h.symbol]?.price;
    return p ? p * h.quantity * exchangeRate.value : 0;
  }

  const sortedHoldings = computed(() => {
    const arr = [...filteredHoldings.value];
    if (!sortKey.value) return arr;
    return arr.sort((a, b) => {
      if (sortKey.value === 'name') {
        return sortDir.value === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      let va; let vb;
      if (sortKey.value === 'value') {
        va = (prices.value[a.symbol]?.price || 0) * a.quantity;
        vb = (prices.value[b.symbol]?.price || 0) * b.quantity;
      } else if (sortKey.value === 'curPrice') {
        va = prices.value[a.symbol]?.price || 0;
        vb = prices.value[b.symbol]?.price || 0;
      } else if (sortKey.value === 'pnlPct') {
        va = holdPnlPct(a) ?? -Infinity;
        vb = holdPnlPct(b) ?? -Infinity;
      } else if (sortKey.value === 'changePct') {
        va = prices.value[a.symbol]?.changePercent ?? -Infinity;
        vb = prices.value[b.symbol]?.changePercent ?? -Infinity;
      } else {
        return 0;
      }
      return sortDir.value === 'asc' ? va - vb : vb - va;
    });
  });

  const krHoldingsCount = computed(() => holdings.value.filter((h) => h.market === 'KR').length);
  const usHoldingsCount = computed(() => holdings.value.filter((h) => h.market === 'US').length);

  const krTotal = computed(() =>
    filteredHoldings.value
      .filter((h) => h.market === 'KR')
      .reduce((s, h) => s + (prices.value[h.symbol]?.price || 0) * h.quantity, 0),
  );
  const usTotal = computed(() =>
    filteredHoldings.value
      .filter((h) => h.market === 'US')
      .reduce((s, h) => s + (prices.value[h.symbol]?.price || 0) * h.quantity, 0),
  );
  const usTotalKRW = computed(() =>
    exchangeRate.value > 0 ? usTotal.value * exchangeRate.value : 0,
  );
  const hasAvgPrice = computed(() => filteredHoldings.value.some((h) => h.avgPrice));

  const totalPnl = computed(() =>
    filteredHoldings.value.reduce((s, h) => {
      if (!h.avgPrice) return s;
      const p = prices.value[h.symbol]?.price;
      return p ? s + (p - h.avgPrice) * h.quantity : s;
    }, 0),
  );
  const totalCost = computed(() =>
    filteredHoldings.value.reduce(
      (s, h) => (h.avgPrice ? s + h.avgPrice * h.quantity : s),
      0,
    ),
  );
  const totalPnlPct = computed(() =>
    totalCost.value === 0 ? 0 : (totalPnl.value / totalCost.value) * 100,
  );

  const krPnl = computed(() =>
    holdings.value.filter((h) => h.market === 'KR').reduce((s, h) => {
      if (!h.avgPrice) return s;
      const p = prices.value[h.symbol]?.price;
      return p ? s + (p - h.avgPrice) * h.quantity : s;
    }, 0),
  );
  const krCost = computed(() =>
    holdings.value
      .filter((h) => h.market === 'KR')
      .reduce((s, h) => (h.avgPrice ? s + h.avgPrice * h.quantity : s), 0),
  );
  const krPnlPct = computed(() => (krCost.value === 0 ? 0 : (krPnl.value / krCost.value) * 100));
  const krHasAvgPrice = computed(() =>
    holdings.value.filter((h) => h.market === 'KR').some((h) => h.avgPrice),
  );

  const usPnl = computed(() =>
    holdings.value.filter((h) => h.market === 'US').reduce((s, h) => {
      if (!h.avgPrice) return s;
      const p = prices.value[h.symbol]?.price;
      return p ? s + (p - h.avgPrice) * h.quantity : s;
    }, 0),
  );
  const usCost = computed(() =>
    holdings.value
      .filter((h) => h.market === 'US')
      .reduce((s, h) => (h.avgPrice ? s + h.avgPrice * h.quantity : s), 0),
  );
  const usPnlPct = computed(() => (usCost.value === 0 ? 0 : (usPnl.value / usCost.value) * 100));
  const usHasAvgPrice = computed(() =>
    holdings.value.filter((h) => h.market === 'US').some((h) => h.avgPrice),
  );

  const totalValKRW = computed(() => krTotal.value + usTotalKRW.value);
  const totalPnlKRW = computed(() =>
    krPnl.value + (exchangeRate.value > 0 ? usPnl.value * exchangeRate.value : 0),
  );
  const totalCostKRW = computed(() =>
    krCost.value + (exchangeRate.value > 0 ? usCost.value * exchangeRate.value : 0),
  );
  const totalPnlKRWPct = computed(() =>
    totalCostKRW.value === 0 ? 0 : (totalPnlKRW.value / totalCostKRW.value) * 100,
  );

  const chartSegments = computed(() => {
    const toKRW = (h, price) => {
      const raw = price * h.quantity;
      if (h.market === 'KR') return raw;
      if (exchangeRate.value > 0) return raw * exchangeRate.value;
      const hasKR = filteredHoldings.value.some((x) => x.market === 'KR');
      return hasKR ? 0 : raw;
    };

    const items = filteredHoldings.value
      .map((h) => {
        const p = prices.value[h.symbol]?.price || 0;
        const valKRW = toKRW(h, p);
        return { h, val: p * h.quantity, valKRW, currency: h.market === 'KR' ? 'KRW' : 'USD' };
      })
      .filter((item) => item.valKRW > 0)
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
    filteredHoldings, sortedHoldings,
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
