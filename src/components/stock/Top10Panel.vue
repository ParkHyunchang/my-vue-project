<template>
  <div>
    <div class="top10-controls">
      <button
        :class="['market-btn', { active: top10Market === 'kr' }]"
        @click="switchTop10('kr')"
      >
        🇰🇷 코스피
      </button>
      <button
        :class="['market-btn', { active: top10Market === 'kosdaq' }]"
        @click="switchTop10('kosdaq')"
      >
        🇰🇷 코스닥
      </button>
      <button
        :class="['market-btn', { active: top10Market === 'us' }]"
        @click="switchTop10('us')"
      >
        🇺🇸 미국
      </button>
      <span v-if="top10UpdateTime" class="last-updated">기준: {{ top10UpdateTime }}</span>
      <span class="auto-refresh-info">🕐 실시간 (2분 자동 갱신)</span>
    </div>

    <div v-if="top10Loading && top10Data.length === 0" class="loading-state">
      <div class="spinner"></div>
      <span>시세 데이터를 불러오는 중...</span>
    </div>

    <div v-else-if="top10Error && top10Data.length === 0" class="error-state">
      <span>⚠️ {{ top10Error }}</span>
      <button class="retry-btn" @click="loadTop10">다시 시도</button>
    </div>

    <div v-else-if="top10Data.length === 0" class="empty-state">
      데이터가 없습니다.
    </div>

    <template v-else>
      <div v-if="top10Loading" class="top10-refreshing">
        <div class="top10-refreshing-dot"></div> 갱신 중...
      </div>
      <div v-if="top10Error && top10Data.length > 0" class="top10-error-inline">⚠️ {{ top10Error }}</div>

      <div class="top10-table-wrap">
        <table class="top10-table">
          <thead>
            <tr>
              <th class="col-rank">순위</th>
              <th class="col-name">종목</th>
              <th class="col-price">현재가</th>
              <th class="col-change">등락률</th>
              <th class="col-mcap">시가총액</th>
              <th class="col-vol">거래량</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="stock in top10Data" :key="stock.symbol">
              <td class="col-rank">
                <span :class="['rank-badge', rankClass(stock.rank)]">{{ stock.rank }}</span>
                <span v-if="stock.rankChange > 0" class="rank-chg rank-up">▲{{ stock.rankChange }}</span>
                <span v-else-if="stock.rankChange < 0" class="rank-chg rank-down">▼{{ Math.abs(stock.rankChange) }}</span>
                <span v-else class="rank-chg rank-neutral">—</span>
              </td>
              <td class="col-name">
                <div class="stock-name-cell">
                  <span class="stock-name">{{ stock.name }}</span>
                  <span class="stock-symbol">{{ stock.symbol }}</span>
                </div>
              </td>
              <td class="col-price">{{ formatPrice(stock.price, stock.currency) }}</td>
              <td class="col-change">
                <span :class="['change-badge', changeClass(stock.changePercent)]">
                  {{ formatChangePct(stock.changePercent) }}
                </span>
              </td>
              <td class="col-mcap">{{ formatMarketCap(stock.marketCap, stock.currency) }}</td>
              <td class="col-vol">{{ formatVolume(stock.volume) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="top10-cards">
        <div v-for="stock in top10Data" :key="'card-' + stock.symbol" class="top10-card">
          <div class="t10c-header">
            <div class="t10c-rank-wrap">
              <span :class="['rank-badge', rankClass(stock.rank)]">{{ stock.rank }}</span>
              <span v-if="stock.rankChange > 0" class="rank-chg rank-up">▲{{ stock.rankChange }}</span>
              <span v-else-if="stock.rankChange < 0" class="rank-chg rank-down">▼{{ Math.abs(stock.rankChange) }}</span>
              <span v-else class="rank-chg rank-neutral">—</span>
            </div>
            <div class="t10c-name-wrap">
              <span class="stock-name">{{ stock.name }}</span>
              <span class="stock-symbol">{{ stock.symbol }}</span>
            </div>
            <div class="t10c-price-wrap">
              <span class="t10c-price">{{ formatPrice(stock.price, stock.currency) }}</span>
              <span :class="['change-badge', changeClass(stock.changePercent)]">{{ formatChangePct(stock.changePercent) }}</span>
            </div>
          </div>
          <div class="t10c-mcap">
            시가총액 {{ formatMarketCap(stock.marketCap, stock.currency) }}
            <span v-if="stock.volume" class="t10c-vol"> · 거래량 {{ formatVolume(stock.volume) }}</span>
          </div>
        </div>
      </div>
    </template>

    <div class="schedule-info">
      <span class="schedule-info-title">⏰ 자동 갱신 스케줄</span>
      <div class="schedule-items">
        <div class="schedule-item">
          <span class="schedule-flag">🇰🇷</span>
          <div class="schedule-detail">
            <strong>코스피 / 코스닥</strong>
            <span>매일 09:00 KST — KRX 공식 API, 한국 장 개장 직전 갱신</span>
          </div>
          <span class="schedule-time">09:00</span>
        </div>
        <div class="schedule-item">
          <span class="schedule-flag">🇺🇸</span>
          <div class="schedule-detail">
            <strong>미국 (NYSE/NASDAQ)</strong>
            <span>매일 23:30 KST — 미국 장 개장 직전 갱신</span>
          </div>
          <span class="schedule-time">23:30</span>
        </div>
      </div>
      <p class="schedule-note">
        🇰🇷 KRX 공식 API · 전일 종가 기준 · 🇺🇸 Yahoo Finance v8 기반 ·
        캐시 유효 시간 6시간 · 순위 변동(▲▼)은 직전 갱신 대비
      </p>
    </div>

    <p class="data-credit">시세 데이터: KRX 공식 API · Naver Finance · Yahoo Finance</p>
  </div>
</template>

<script>
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
import axios from "@/axios";
import { useStockFormatters } from "@/composables/useStockFormatters";

export default {
  name: "Top10Panel",
  props: {
    active: { type: Boolean, default: false },
  },
  setup(props) {
    const {
      formatPrice,
      formatVolume,
      formatMarketCap,
      formatChangePct,
      changeClass,
      rankClass,
    } = useStockFormatters();

    const top10Market = ref("kr");
    const top10Data = ref([]);
    const top10Loading = ref(false);
    const top10Error = ref("");
    const top10UpdateTime = ref("");

    let refreshTimer = null;

    async function loadTop10() {
      top10Loading.value = true;
      top10Error.value = "";
      try {
        const endpoint =
          top10Market.value === "kr"
            ? "/api/stock/top10/kr"
            : top10Market.value === "kosdaq"
            ? "/api/stock/top10/kosdaq"
            : "/api/stock/top10/us";
        const res = await axios.get(endpoint);
        top10Data.value = res.data;
        top10UpdateTime.value = new Date().toLocaleTimeString("ko-KR");
      } catch {
        top10Error.value = "시세 데이터를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.";
      } finally {
        top10Loading.value = false;
      }
    }

    function switchTop10(market) {
      top10Market.value = market;
      loadTop10();
    }

    watch(
      () => props.active,
      (isActive) => {
        if (isActive && top10Data.value.length === 0) loadTop10();
      },
    );

    onMounted(() => {
      if (props.active) loadTop10();
      refreshTimer = setInterval(() => {
        if (props.active) loadTop10();
      }, 120000);
    });

    onBeforeUnmount(() => {
      clearInterval(refreshTimer);
    });

    return {
      top10Market, top10Data, top10Loading, top10Error, top10UpdateTime,
      switchTop10, loadTop10,
      formatPrice, formatVolume, formatMarketCap, formatChangePct,
      changeClass, rankClass,
    };
  },
};
</script>

<style scoped>
.col-vol {
  text-align: right;
  color: var(--text-secondary);
  font-size: 13px;
  white-space: nowrap;
}
.t10c-vol {
  color: var(--text-muted);
  font-size: 12px;
}
</style>

<style src="@/assets/css/stock.css" scoped></style>
