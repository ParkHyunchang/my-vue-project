<template>
  <div class="portfolio-summary">
    <div class="ps-left">
      <span class="ps-count">
        {{ marketFilter === 'all' ? '전체' : marketFilter === 'kr' ? '🇰🇷 한국' : '🇺🇸 미국' }}
        {{ filteredHoldings.length }}종목
      </span>
      <template v-if="marketFilter === 'all' && krHoldingsCount > 0 && usHoldingsCount > 0">
        <div class="ps-breakdown">
          <div class="ps-bd-row">
            <span class="ps-bd-label">🇰🇷 한국</span>
            <span class="ps-bd-val">{{ fmtKRW(krTotal) }}</span>
            <span v-if="krHasAvgPrice" :class="['ps-bd-pnl', pnlCls(krPnl)]">
              {{ krPnl >= 0 ? "▲" : "▼" }} {{ fmtKRW(Math.abs(krPnl)) }}
              <span class="ps-bd-pct">({{ krPnlPct >= 0 ? "+" : "" }}{{ krPnlPct.toFixed(2) }}%)</span>
            </span>
          </div>
          <div class="ps-bd-row">
            <span class="ps-bd-label">🇺🇸 미국</span>
            <div class="ps-bd-val-group">
              <span class="ps-bd-val">{{ usShowKRW ? fmtKRW(usTotalKRW) : fmtUSD(usTotal) }}</span>
              <span v-if="!usShowKRW && usTotalKRW > 0" class="ps-us-krw">≈ {{ fmtKRW(usTotalKRW) }}</span>
            </div>
            <span v-if="usHasAvgPrice" :class="['ps-bd-pnl', pnlCls(usPnl)]">
              {{ usPnl >= 0 ? "▲" : "▼" }}
              {{ usShowKRW ? fmtKRW(Math.abs(usPnl) * exchangeRate) : fmtUSD(Math.abs(usPnl)) }}
              <span class="ps-bd-pct">({{ usPnlPct >= 0 ? "+" : "" }}{{ usPnlPct.toFixed(2) }}%)</span>
            </span>
          </div>
          <div class="ps-bd-total">
            <span class="ps-bd-total-label">전체</span>
            <span v-if="exchangeRate > 0" class="ps-bd-val">{{ fmtKRW(totalValKRW) }}</span>
            <template v-if="krHasAvgPrice || (usHasAvgPrice && exchangeRate > 0)">
              <span class="ps-cost-label">투자원금 {{ fmtKRW(totalCostKRW) }}</span>
              <span :class="['ps-pnl-val', pnlCls(totalPnlKRW)]">
                {{ totalPnlKRW >= 0 ? "▲" : "▼" }} {{ fmtKRW(Math.abs(totalPnlKRW)) }}
              </span>
              <span :class="['ps-pnl-pct', pnlCls(totalPnlKRW)]">
                ({{ totalPnlKRWPct >= 0 ? "+" : "" }}{{ totalPnlKRWPct.toFixed(2) }}%)
              </span>
            </template>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="ps-totals">
          <span v-if="krTotal > 0" class="ps-total-val">🇰🇷 {{ fmtKRW(krTotal) }}</span>
          <span v-if="krTotal > 0 && usTotal > 0" class="ps-sep">·</span>
          <div v-if="usTotal > 0" class="ps-us-wrap">
            <span class="ps-total-val">🇺🇸 {{ usShowKRW ? fmtKRW(usTotalKRW) : fmtUSD(usTotal) }}</span>
            <span v-if="!usShowKRW && usTotalKRW > 0" class="ps-us-krw">≈ {{ fmtKRW(usTotalKRW) }}</span>
          </div>
        </div>
        <div v-if="hasAvgPrice" class="ps-pnl">
          <span class="ps-cost-label">투자원금 {{ fmtAbsPnl(totalCost) }}</span>
          <span :class="['ps-pnl-val', pnlCls(totalPnl)]">
            {{ totalPnl >= 0 ? "▲" : "▼" }} {{ fmtAbsPnl(totalPnl) }}
          </span>
          <span :class="['ps-pnl-pct', pnlCls(totalPnl)]">
            ({{ totalPnlPct >= 0 ? "+" : "" }}{{ totalPnlPct.toFixed(2) }}%)
          </span>
        </div>
      </template>
    </div>
    <button class="btn-add-sm" @click="$emit('add')">＋ 추가</button>
  </div>
</template>

<script>
import { computed } from 'vue';

export default {
  name: 'PortfolioSummary',
  props: {
    marketFilter: { type: String, required: true },
    displayCurrency: { type: String, default: 'native' },
    filteredHoldings: { type: Array, required: true },
    krHoldingsCount: { type: Number, required: true },
    usHoldingsCount: { type: Number, required: true },
    krTotal: { type: Number, required: true },
    usTotal: { type: Number, required: true },
    usTotalKRW: { type: Number, required: true },
    krPnl: { type: Number, required: true },
    krPnlPct: { type: Number, required: true },
    krHasAvgPrice: { type: Boolean, required: true },
    usPnl: { type: Number, required: true },
    usPnlPct: { type: Number, required: true },
    usHasAvgPrice: { type: Boolean, required: true },
    exchangeRate: { type: Number, required: true },
    totalValKRW: { type: Number, required: true },
    totalCostKRW: { type: Number, required: true },
    totalPnlKRW: { type: Number, required: true },
    totalPnlKRWPct: { type: Number, required: true },
    hasAvgPrice: { type: Boolean, required: true },
    totalCost: { type: Number, required: true },
    totalPnl: { type: Number, required: true },
    totalPnlPct: { type: Number, required: true },
    fmtKRW: { type: Function, required: true },
    fmtUSD: { type: Function, required: true },
    fmtAbsPnl: { type: Function, required: true },
    pnlCls: { type: Function, required: true },
  },
  emits: ['add'],
  setup(props) {
    const usShowKRW = computed(
      () => props.displayCurrency === 'krw' && props.exchangeRate > 0,
    );
    return { usShowKRW };
  },
};
</script>

<style src="@/assets/css/stock.css" scoped></style>
