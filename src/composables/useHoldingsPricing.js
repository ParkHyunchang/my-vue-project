import { ref, computed } from "vue";
import { fetchQuote, fetchUsdKrwQuote } from "@/api/stockApi";
import { isCashHolding } from "@/config/stockAccounts";
import { useStockFormatters } from "@/composables/useStockFormatters";

function activeNow(active) {
  if (typeof active === "function") return active();
  if (active && typeof active === "object" && "value" in active) return active.value;
  return Boolean(active);
}

function updateRelativeTime(lastUpdatedAt, relativeUpdated, { freshThresholdSec, relativeSuffix }) {
  if (!lastUpdatedAt.value) return;
  const diffSec = Math.floor((Date.now() - lastUpdatedAt.value.getTime()) / 1000);
  if (diffSec < freshThresholdSec) relativeUpdated.value = `방금 전${relativeSuffix}`;
  else if (diffSec < 60) relativeUpdated.value = `${diffSec}초 전${relativeSuffix}`;
  else relativeUpdated.value = `${Math.floor(diffSec / 60)}분 전${relativeSuffix}`;
}

export function useHoldingsPricing({
  holdings,
  active,
  refreshGuard = () => true,
  freshThresholdSec = 5,
  relativeSuffix = "",
}) {
  const prices = ref({});
  const priceLoading = ref(false);
  const exchangeRate = ref(0);
  const exRateAt = ref("");
  const lastUpdatedAt = ref(null);
  const relativeUpdated = ref("");
  const exchangeStatus = ref('missing');
  const quoteStates = ref({});
  const pricingStatus = computed(() => {
    const list = (holdings.value || []).filter(h => !isCashHolding(h));
    const states = list.map(h => quoteStates.value[h.symbol] || 'missing');
    if (list.some(h => h.market === 'US')) states.push(exchangeStatus.value);
    if (states.every(state => state === 'fresh')) return 'fresh';
    if (states.some(state => state === 'fresh')) return 'partial';
    return states.some(state => state === 'stale') ? 'stale' : 'missing';
  });
  const pricingMessage = computed(() => {
    if (priceLoading.value) return '시세 확인 중…';
    const messages = {
      fresh: '시세 확인 완료',
      partial: '일부 시세 또는 환율 조회 실패 · 이전 값 유지, 미확인 값은 — 표시',
      stale: '시세 갱신 실패 · 마지막 정상 시세 기준 (최신 아님)',
      missing: '시세를 확인하지 못했습니다 · 평가금액·손익 계산 대기',
    };
    const fx = exchangeStatus.value === 'stale' ? ' · 환율도 이전 값 사용' : '';
    return messages[pricingStatus.value] + fx;
  });

  let refreshPending = false;
  let refreshTimer = null;
  let relativeTimer = null;

  async function fetchExchangeRate() {
    try {
      const res = await fetchUsdKrwQuote();
      if (Number.isFinite(Number(res.data?.price)) && Number(res.data.price) > 0) {
        exchangeRate.value = Number(res.data.price);
        exchangeStatus.value = 'fresh';
        exRateAt.value = new Date().toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
        });
        return true;
      }
    } catch { /* retain last valid rate */ }
    exchangeStatus.value = exchangeRate.value > 0 ? 'stale' : 'missing';
    return false;
  }

  async function fetchPrices() {
    if (priceLoading.value) {
      // Account holdings arrive independently. Do not drop a refresh requested
      // while the previous account snapshot is still being priced.
      refreshPending = true;
      return;
    }
    const list = [...(holdings.value || [])];
    if (list.length === 0) return;

    priceLoading.value = true;
    try {
      const results = {};
      const states = {};
      list.forEach((holding) => {
        if (isCashHolding(holding)) results[holding.symbol] = { price: 1, changePercent: null };
      });

      const uniqueSymbols = new Map();
      list.filter((holding) => !isCashHolding(holding)).forEach((holding) => {
        if (!uniqueSymbols.has(holding.symbol)) uniqueSymbols.set(holding.symbol, holding.market);
      });

      const tasks = [...uniqueSymbols.entries()].map(async ([symbol, market]) => {
        try {
          const res = await fetchQuote(symbol, market.toLowerCase());
          const price = Number(res.data?.price);
          if (!Number.isFinite(price) || price <= 0) throw new Error('Missing quote');
          results[symbol] = { ...res.data, price, stale: false, fetchedAt: new Date().toISOString() };
          states[symbol] = 'fresh';
        } catch {
          const previous = prices.value[symbol];
          if (previous?.price > 0) results[symbol] = { ...previous, stale: true };
          states[symbol] = previous?.price > 0 ? 'stale' : 'missing';
        }
      });

      const hasUs = list.some((holding) => !isCashHolding(holding) && holding.market === "US");
      if (hasUs) tasks.push(fetchExchangeRate());

      await Promise.all(tasks);
      prices.value = results;
      quoteStates.value = states;
      if (pricingStatus.value === 'fresh') lastUpdatedAt.value = new Date();
      updateRelativeTime(lastUpdatedAt, relativeUpdated, { freshThresholdSec, relativeSuffix });
    } finally {
      priceLoading.value = false;
      if (refreshPending) {
        refreshPending = false;
        if (activeNow(active)) await fetchPrices();
      }
    }
  }

  function startTimers({ refreshMs = 120000, relativeMs = 10000 } = {}) {
    stopTimers();
    refreshTimer = setInterval(() => {
      if (activeNow(active) && refreshGuard()) fetchPrices();
    }, refreshMs);
    relativeTimer = setInterval(() => {
      updateRelativeTime(lastUpdatedAt, relativeUpdated, { freshThresholdSec, relativeSuffix });
    }, relativeMs);
  }

  function stopTimers() {
    refreshPending = false;
    clearInterval(refreshTimer);
    clearInterval(relativeTimer);
    refreshTimer = null;
    relativeTimer = null;
  }

  return {
    prices,
    priceLoading,
    exchangeRate,
    exRateAt,
    lastUpdatedAt,
    relativeUpdated,
    pricingStatus,
    pricingMessage,
    exchangeStatus,
    quoteStates,
    fetchPrices,
    fetchExchangeRate,
    startTimers,
    stopTimers,
  };
}

export function useHoldingDisplay({
  displayCurrency,
  exchangeRate,
  prices,
  filteredHoldings,
  holdPnl,
  holdPnlPct,
}) {
  const { fmtKRW, fmtUSD, pnlCls } = useStockFormatters();

  function usToKRW(v) {
    return exchangeRate.value > 0 ? v * exchangeRate.value : v;
  }

  function inKRWMode(market) {
    return market === "US" && displayCurrency.value === "krw" && exchangeRate.value > 0;
  }

  function fmtMoney(v, market) {
    if (v == null) return "—";
    if (market === "KR") return fmtKRW(v);
    return inKRWMode(market) ? fmtKRW(usToKRW(v)) : fmtUSD(v);
  }

  function fmtAbsPnl(v) {
    const abs = Math.abs(v);
    const krPart = filteredHoldings.value.filter((holding) => holding.market === "KR" && holding.avgPrice).length;
    if (krPart > 0) return fmtKRW(abs);
    return displayCurrency.value === "krw" && exchangeRate.value > 0
      ? fmtKRW(usToKRW(abs))
      : fmtUSD(abs);
  }

  function fmtCurPrice(holding) {
    if (isCashHolding(holding)) return "현금";
    const price = prices.value[holding.symbol];
    return price ? fmtMoney(price.price, holding.market) + (price.stale ? ' (이전 시세)' : '') : "—";
  }

  function fmtHoldVal(holding) {
    if (isCashHolding(holding)) return fmtKRW(Number(holding.quantity) || 0);
    const price = prices.value[holding.symbol];
    return price ? fmtMoney(price.price * holding.quantity, holding.market) : "—";
  }

  function fmtHoldPnl(holding) {
    if (isCashHolding(holding)) return "—";
    const value = holdPnl(holding);
    if (value === null) return "—";
    return (value >= 0 ? "+" : "") + fmtMoney(value, holding.market);
  }

  function fmtHoldPnlPct(holding) {
    if (isCashHolding(holding)) return "—";
    const value = holdPnlPct(holding);
    if (value === null) return "—";
    return (value >= 0 ? "+" : "") + value.toFixed(2) + "%";
  }

  function fmtLegVal(seg) {
    if (seg.currency === "KRW") {
      return seg.value >= 1e8
        ? (seg.value / 1e8).toFixed(1) + "억"
        : fmtKRW(seg.value);
    }
    const usdStr = "$" + seg.value.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    if (seg.valKRW > 0) {
      const krwStr = seg.valKRW >= 1e8
        ? (seg.valKRW / 1e8).toFixed(1) + "억"
        : fmtKRW(seg.valKRW);
      return `${usdStr} ≈ ${krwStr}`;
    }
    return usdStr;
  }

  function fmtChangePct(holding) {
    if (isCashHolding(holding)) return null;
    return prices.value[holding.symbol]?.changePercent ?? null;
  }

  function fmtChangePctDisplay(holding) {
    const value = fmtChangePct(holding);
    if (value === null) return "—";
    return (value >= 0 ? "+" : "") + value.toFixed(2) + "%";
  }

  function changePctCls(holding) {
    if (isCashHolding(holding)) return "";
    return pnlCls(fmtChangePct(holding));
  }

  return {
    usToKRW,
    inKRWMode,
    fmtMoney,
    fmtAbsPnl,
    fmtCurPrice,
    fmtHoldVal,
    fmtHoldPnl,
    fmtHoldPnlPct,
    fmtLegVal,
    fmtChangePct,
    fmtChangePctDisplay,
    changePctCls,
  };
}

export function buildAnalysisContext({
  accountType,
  accountLabel,
  accountNote,
  instruction,
  filteredHoldings,
  prices,
  exchangeRate,
  chartSegments,
  holdPnlPct,
  totalValKRW,
  marketFilter,
  lastUpdatedAt,
  extraHoldingFields = () => ({}),
}) {
  const totalKRW = chartSegments.value.reduce((sum, seg) => sum + (seg.valKRW || 0), 0);
  const segmentById = new Map(chartSegments.value.map((seg) => [seg.id, seg]));
  const enrichedHoldings = filteredHoldings.value.map((holding) => {
    const quote = prices.value[holding.symbol] || {};
    const seg = segmentById.get(holding.id);
    const currentPrice = quote.price ?? null;
    const marketValue = currentPrice != null ? currentPrice * holding.quantity : null;
    const marketValueKRW = holding.market === "KR"
      ? marketValue
      : (marketValue != null && exchangeRate.value > 0 ? marketValue * exchangeRate.value : null);
    const weightPct = totalKRW > 0 && marketValueKRW != null
      ? (marketValueKRW / totalKRW) * 100
      : null;

    return {
      id: holding.id,
      assetType: holding.assetType || "STOCK",
      market: holding.market,
      name: holding.name,
      symbol: holding.symbol,
      core: !!holding.core,
      ...extraHoldingFields(holding),
      quantity: holding.quantity,
      avgPrice: holding.avgPrice ?? null,
      currentPrice,
      quoteStatus: quote.stale ? 'stale' : (currentPrice == null ? 'missing' : 'fresh'),
      quoteFetchedAt: quote.fetchedAt || null,
      marketValue,
      marketValueKRW,
      weightPct,
      changePercent: quote.changePercent ?? null,
      pnlPct: holdPnlPct(holding),
      chartWeightPct: seg ? seg.pct * 100 : null,
    };
  });

  return {
    accountType,
    accountLabel,
    accountNote,
    asOf: lastUpdatedAt.value ? lastUpdatedAt.value.toISOString() : null,
    exchangeRate: exchangeRate.value || null,
    totalValueKRW: totalValKRW.value,
    holdings: enrichedHoldings,
    marketFilter: marketFilter.value !== "all" ? marketFilter.value.toUpperCase() : null,
    instruction,
  };
}
