<template>
  <div>
    <!-- 초기 로딩: 계좌 패널들이 DB에서 보유 종목을 불러오는 동안 "없음"으로 오표시하지 않는다 -->
    <div v-if="loading && mergedHoldings.length === 0" class="loading-state" style="padding: 48px 0">
      <div class="spinner"></div>
      <span>계좌별 보유 종목 불러오는 중...</span>
    </div>

    <!-- 빈 상태 (모든 계좌 로드 완료 후에도 종목이 없을 때만) -->
    <div v-else-if="mergedHoldings.length === 0" class="portfolio-empty">
      <div class="portfolio-empty-icon">📊</div>
      <h3>합산할 보유 종목이 없습니다</h3>
      <p>단기/ISA/IRP/장기 계좌 탭에서 종목을 추가하면 이곳에서 전체 현황을 합쳐 볼 수 있습니다.</p>
    </div>

    <template v-else>
      <!-- 요약 바 -->
      <PortfolioSummary
        readonly
        :market-filter="marketFilter"
        :display-currency="displayCurrency"
        :filtered-holdings="filteredHoldings"
        :kr-holdings-count="krHoldingsCount"
        :us-holdings-count="usHoldingsCount"
        :kr-total="krTotal"
        :us-total="usTotal"
        :us-total-k-r-w="usTotalKRW"
        :kr-pnl="krPnl"
        :kr-pnl-pct="krPnlPct"
        :kr-has-avg-price="krHasAvgPrice"
        :us-pnl="usPnl"
        :us-pnl-pct="usPnlPct"
        :us-has-avg-price="usHasAvgPrice"
        :exchange-rate="exchangeRate"
        :total-val-k-r-w="totalValKRW"
        :total-cost-k-r-w="totalCostKRW"
        :total-pnl-k-r-w="totalPnlKRW"
        :total-pnl-k-r-w-pct="totalPnlKRWPct"
        :has-avg-price="hasAvgPrice"
        :total-cost="totalCost"
        :total-pnl="totalPnl"
        :total-pnl-pct="totalPnlPct"
        :fmt-k-r-w="fmtKRW"
        :fmt-u-s-d="fmtUSD"
        :fmt-abs-pnl="fmtAbsPnl"
        :pnl-cls="pnlCls"
      />

      <!-- AI 포트폴리오 진단 액션 바 -->
      <div class="portfolio-ai-bar">
        <button class="portfolio-ai-btn" @click="openPortfolioAnalysis">
          🧠 전체 포트폴리오 AI 진단
        </button>
        <span class="portfolio-ai-hint">장기·단기·ISA·IRP 4개 계좌를 합친 통합 자산배분 진단</span>
      </div>

      <!-- 마켓 필터 바 -->
      <div class="balance-filter-bar">
        <button :class="['bfb-btn', { active: marketFilter === 'all' }]" @click="marketFilter = 'all'">
          전체 <span class="bfb-count">{{ mergedHoldings.length }}</span>
        </button>
        <button :class="['bfb-btn', { active: marketFilter === 'kr' }]" @click="marketFilter = 'kr'">
          🇰🇷 한국 <span class="bfb-count">{{ krHoldingsCount }}</span>
        </button>
        <button :class="['bfb-btn', { active: marketFilter === 'us' }]" @click="marketFilter = 'us'">
          🇺🇸 미국 <span class="bfb-count">{{ usHoldingsCount }}</span>
        </button>
        <div v-if="showCurrencyToggle" class="ccy-toggle" role="group" aria-label="미국 주식 표시 통화">
          <button
            type="button"
            :class="['ccy-btn', { active: displayCurrency === 'native' }]"
            @click="setDisplayCurrency('native')"
          >외화</button>
          <button
            type="button"
            :class="['ccy-btn', { active: displayCurrency === 'krw' }]"
            @click="setDisplayCurrency('krw')"
          >원화</button>
        </div>
        <div v-if="exchangeRate > 0" class="exrate-info">
          <span class="exrate-val">1$ = {{ fmtKRW(exchangeRate) }}</span>
          <span v-if="exRateAt" class="exrate-at">{{ exRateAt }} 기준</span>
        </div>
      </div>

      <!-- 목록 / 차트 전환 탭 -->
      <div class="portfolio-view-tabs">
        <button :class="['pv-tab', { active: portfolioView === 'grid' }]" @click="portfolioView = 'grid'">
          ≡ 목록
        </button>
        <button :class="['pv-tab', { active: portfolioView === 'chart' }]" @click="portfolioView = 'chart'">
          ◎ 차트
        </button>
      </div>

      <!-- 새로고침 바 -->
      <div class="price-refresh-bar">
        <span v-if="lastUpdatedAt" class="prf-updated">↻ {{ relativeUpdated }}</span>
        <button class="prf-btn" :disabled="priceLoading" @click="fetchPrices">
          {{ priceLoading ? '로딩 중...' : '↻ 새로고침' }}
        </button>
      </div>

      <!-- 현재가 로딩 -->
      <div v-if="priceLoading" class="loading-state" style="padding: 24px 0">
        <div class="spinner"></div>
        <span>현재가 조회 중...</span>
      </div>

      <!-- 필터 결과 없음 -->
      <div v-else-if="sortedHoldings.length === 0" class="filter-empty">
        <span>{{ marketFilter === 'kr' ? '🇰🇷 국내' : '🇺🇸 미국' }} 보유 종목이 없습니다</span>
      </div>

      <!-- 목록 뷰 -->
      <template v-else-if="portfolioView === 'grid'">
        <HoldingsTable
          readonly
          :sorted-holdings="sortedHoldings"
          :sort-key="sortKey"
          :sort-dir="sortDir"
          :editing-id="null"
          :display-currency="displayCurrency"
          :edit-form="{ quantity: null, avgPrice: null }"
          :fmt-cur-price="fmtCurPrice"
          :fmt-change-pct-display="fmtChangePctDisplay"
          :change-pct-cls="changePctCls"
          :fmt-hold-val="fmtHoldVal"
          :fmt-by-mkt="fmtMoney"
          :fmt-k-r-w="fmtKRW"
          :hold-val-k-r-w="holdValKRW"
          :hold-pnl="holdPnl"
          :fmt-hold-pnl="fmtHoldPnl"
          :hold-pnl-pct="holdPnlPct"
          :fmt-hold-pnl-pct="fmtHoldPnlPct"
          :pnl-cls="pnlCls"
          @toggle-sort="toggleSort"
          @analyze="openAnalysis"
        />

        <HoldingsCards
          readonly
          :sorted-holdings="sortedHoldings"
          :editing-id="null"
          :edit-form="{ quantity: null, avgPrice: null }"
          :fmt-cur-price="fmtCurPrice"
          :fmt-change-pct-display="fmtChangePctDisplay"
          :change-pct-cls="changePctCls"
          :fmt-hold-val="fmtHoldVal"
          :fmt-by-mkt="fmtMoney"
          :fmt-k-r-w="fmtKRW"
          :hold-pnl="holdPnl"
          :fmt-hold-pnl="fmtHoldPnl"
          :hold-pnl-pct="holdPnlPct"
          :fmt-hold-pnl-pct="fmtHoldPnlPct"
          :pnl-cls="pnlCls"
          @analyze="openAnalysis"
        />
      </template>

      <!-- 차트 뷰 -->
      <PortfolioChart
        v-else
        :chart-segments="chartSegments"
        v-model:hovered-seg-id="hoveredSegId"
        :hovered-segment="hoveredSegment"
        :filtered-holdings-count="filteredHoldings.length"
        :fmt-leg-val="fmtLegVal"
      />
    </template>

    <!-- 종목 AI 분석 모달 -->
    <StockAnalysisModal
      :show="showAnalysisModal"
      :holding="analysisTarget"
      @close="closeAnalysis"
    />

    <!-- AI 포트폴리오 진단 모달 -->
    <PortfolioAnalysisModal
      :show="showPortfolioAnalysis"
      title="🧠 전체 포트폴리오 AI 진단"
      :portfolio-context="portfolioAnalysisContext"
      @close="closePortfolioAnalysis"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { logAudit } from "@/utils/audit";
import { useStockFormatters } from "@/composables/useStockFormatters";
import { usePortfolioStats } from "@/composables/usePortfolioStats";
import {
  buildAnalysisContext,
  useHoldingDisplay,
  useHoldingsPricing,
} from "@/composables/useHoldingsPricing";
import PortfolioSummary from "@/components/stock/PortfolioSummary.vue";
import HoldingsTable from "@/components/stock/HoldingsTable.vue";
import HoldingsCards from "@/components/stock/HoldingsCards.vue";
import PortfolioChart from "@/components/stock/PortfolioChart.vue";
import StockAnalysisModal from "@/components/stock/StockAnalysisModal.vue";
import PortfolioAnalysisModal from "@/components/stock/PortfolioAnalysisModal.vue";
import { ACCOUNT_LABELS, ACCOUNT_ORDER } from "@/config/stockAccounts";

export default {
  name: "AllAccountsPanel",
  components: {
    PortfolioSummary, HoldingsTable, HoldingsCards, PortfolioChart,
    StockAnalysisModal, PortfolioAnalysisModal,
  },
  props: {
    active: { type: Boolean, default: false },
    holdingsByAccount: { type: Object, default: () => ({}) },
    /** 계좌 패널들의 최초 보유 종목 로드가 아직 진행 중인지 (stock.vue에서 전달) */
    loading: { type: Boolean, default: false },
  },
  setup(props) {
    const { fmtKRW, fmtUSD, pnlCls } = useStockFormatters();

    const mergedHoldings = computed(() => {
      const list = [];
      for (const acc of ACCOUNT_ORDER) {
        for (const h of props.holdingsByAccount?.[acc] || []) {
          list.push({ ...h, id: `${acc}_${h.id}`, accountType: acc, accountLabel: ACCOUNT_LABELS[acc] });
        }
      }
      return list;
    });

    const portfolioView = ref("grid");
    const marketFilter = ref("all");
    const displayCurrency = ref("native");
    function setDisplayCurrency(v) { displayCurrency.value = v; }

    const showAnalysisModal = ref(false);
    const analysisTarget = ref(null);
    const showPortfolioAnalysis = ref(false);

    const sortKey = ref("");
    const sortDir = ref("asc");
    const hoveredSegId = ref(null);

    const {
      prices,
      priceLoading,
      exchangeRate,
      exRateAt,
      lastUpdatedAt,
      relativeUpdated,
      fetchPrices,
      startTimers,
      stopTimers,
    } = useHoldingsPricing({
      holdings: mergedHoldings,
      active: () => props.active,
    });

    const stats = usePortfolioStats({
      holdings: mergedHoldings, prices, marketFilter, exchangeRate, sortKey, sortDir,
    });
    const {
      filteredHoldings, sortedHoldings,
      krHoldingsCount, usHoldingsCount,
      krTotal, usTotal, usTotalKRW, hasAvgPrice,
      totalPnl, totalCost, totalPnlPct,
      krPnl, krPnlPct, krHasAvgPrice,
      usPnl, usPnlPct, usHasAvgPrice,
      totalValKRW, totalPnlKRW, totalCostKRW, totalPnlKRWPct,
      chartSegments,
      holdPnl, holdPnlPct, holdValKRW,
    } = stats;

    const {
      fmtMoney,
      fmtAbsPnl,
      fmtCurPrice,
      fmtHoldVal,
      fmtHoldPnl,
      fmtHoldPnlPct,
      fmtLegVal,
      fmtChangePctDisplay,
      changePctCls,
    } = useHoldingDisplay({
      displayCurrency,
      exchangeRate,
      prices,
      filteredHoldings,
      holdPnl,
      holdPnlPct,
    });

    function openAnalysis(h) {
      analysisTarget.value = h;
      showAnalysisModal.value = true;
      logAudit("STOCK/ALL/AI-ANALYSIS", "OPEN", h?.symbol);
    }
    function closeAnalysis() {
      showAnalysisModal.value = false;
      analysisTarget.value = null;
    }

    function openPortfolioAnalysis() {
      showPortfolioAnalysis.value = true;
      logAudit("STOCK/ALL/AI-PORTFOLIO", "OPEN");
    }
    function closePortfolioAnalysis() {
      showPortfolioAnalysis.value = false;
    }

    function toggleSort(key) {
      if (sortKey.value === key) {
        sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
      } else {
        sortKey.value = key;
        sortDir.value = (key === "value" || key === "pnlPct") ? "desc" : "asc";
      }
    }

    const hoveredSegment = computed(() =>
      hoveredSegId.value ? chartSegments.value.find((s) => s.id === hoveredSegId.value) : null,
    );

    const showCurrencyToggle = computed(
      () => usHoldingsCount.value > 0 && marketFilter.value !== "kr" && exchangeRate.value > 0,
    );

    const portfolioAnalysisContext = computed(() =>
      buildAnalysisContext({
        accountType: "all",
        accountLabel: "전체 계좌(종합)",
        accountNote: "장기·단기·ISA·IRP 4개 계좌를 합친 통합 뷰입니다.",
        filteredHoldings,
        prices,
        exchangeRate,
        chartSegments,
        holdPnlPct,
        totalValKRW,
        marketFilter,
        lastUpdatedAt,
        extraHoldingFields: (holding) => ({ accountLabel: holding.accountLabel }),
        instruction: "This is the user's combined view across 4 accounts (장기/단기/ISA/IRP). Each holding carries accountLabel indicating its account. Use holdings[].weightPct as the current combined portfolio weight.",
      }),
    );

    watch(mergedHoldings, (list) => {
      if (props.active && list.length > 0) fetchPrices();
    });

    watch(
      () => props.active,
      (isActive) => {
        if (isActive) {
          logAudit("STOCK/ALL");
          fetchPrices();
        }
      },
    );

    onMounted(() => {
      if (props.active) {
        logAudit("STOCK/ALL");
        fetchPrices();
      }
      startTimers();
    });

    onBeforeUnmount(() => {
      stopTimers();
    });

    return {
      mergedHoldings,
      filteredHoldings, sortedHoldings,
      krHoldingsCount, usHoldingsCount,
      krTotal, usTotal, usTotalKRW, hasAvgPrice,
      totalPnl, totalCost, totalPnlPct,
      krPnl, krPnlPct, krHasAvgPrice,
      usPnl, usPnlPct, usHasAvgPrice,
      totalValKRW, totalPnlKRW, totalCostKRW, totalPnlKRWPct,
      chartSegments, hoveredSegId, hoveredSegment,
      holdPnl, holdPnlPct, holdValKRW,
      priceLoading, portfolioView, marketFilter,
      exchangeRate, exRateAt, displayCurrency, setDisplayCurrency,
      showAnalysisModal, analysisTarget, showPortfolioAnalysis,
      lastUpdatedAt, relativeUpdated, sortKey, sortDir,
      fetchPrices, openAnalysis, closeAnalysis,
      openPortfolioAnalysis, closePortfolioAnalysis,
      fmtKRW, fmtUSD, pnlCls, fmtMoney, fmtAbsPnl,
      fmtCurPrice, fmtHoldVal, fmtHoldPnl, fmtHoldPnlPct, fmtLegVal,
      fmtChangePctDisplay, changePctCls, toggleSort,
      showCurrencyToggle, portfolioAnalysisContext,
    };
  },
};
</script>

<style src="@/assets/css/stock.css" scoped></style>
