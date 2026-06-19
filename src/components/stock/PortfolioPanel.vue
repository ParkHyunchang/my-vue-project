<template>
  <div>
    <!-- 초기 로딩 -->
    <div v-if="initialLoading" class="loading-state" style="padding: 48px 0">
      <div class="spinner"></div>
      <span>보유 종목 불러오는 중...</span>
    </div>

    <!-- 빈 상태 -->
    <div v-else-if="holdings.length === 0" class="portfolio-empty">
      <div class="portfolio-empty-icon">📊</div>
      <h3>보유 종목이 없습니다</h3>
      <p>
        보유 중인 주식을 추가하면 평가금액과 종목 비중을 한눈에 확인할 수
        있습니다.
      </p>
      <button class="btn-add-primary" @click="openAddModal">
        ＋ 종목 추가
      </button>
    </div>

    <template v-else>
      <!-- 요약 바 -->
      <PortfolioSummary
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
        @add="openAddModal"
      />

      <!-- AI 포트폴리오 진단 액션 바 -->
      <div class="portfolio-ai-bar">
        <button class="portfolio-ai-btn" @click="openPortfolioAnalysis">
          📊 AI 포트폴리오 진단
        </button>
        <span class="portfolio-ai-hint">보유 종목 시그널 + 추천 종목 2개</span>
      </div>

      <!-- 마켓 필터 바 -->
      <div class="balance-filter-bar">
        <button :class="['bfb-btn', { active: marketFilter === 'all' }]" @click="marketFilter = 'all'">
          전체 <span class="bfb-count">{{ holdings.length }}</span>
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
        <button
          :class="['pv-tab', { active: portfolioView === 'grid' }]"
          @click="portfolioView = 'grid'"
        >
          ≡ 목록
        </button>
        <button
          :class="['pv-tab', { active: portfolioView === 'chart' }]"
          @click="portfolioView = 'chart'"
        >
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
          :sorted-holdings="sortedHoldings"
          :sort-key="sortKey"
          :sort-dir="sortDir"
          :editing-id="editingId"
          :display-currency="displayCurrency"
          v-model:edit-form="editForm"
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
          @start-edit="startEdit"
          @save-edit="saveEdit"
          @cancel-edit="editingId = null"
          @remove="removeHolding"
          @toggle-core="toggleCore"
          @analyze="openAnalysis"
        />

        <HoldingsCards
          :sorted-holdings="sortedHoldings"
          :editing-id="editingId"
          v-model:edit-form="editForm"
          :fmt-cur-price="fmtCurPrice"
          :fmt-change-pct-display="fmtChangePctDisplay"
          :change-pct-cls="changePctCls"
          :fmt-hold-val="fmtHoldVal"
          :fmt-by-mkt="fmtMoney"
          :hold-pnl="holdPnl"
          :fmt-hold-pnl="fmtHoldPnl"
          :hold-pnl-pct="holdPnlPct"
          :fmt-hold-pnl-pct="fmtHoldPnlPct"
          :pnl-cls="pnlCls"
          @start-edit="startEdit"
          @save-edit="saveEdit"
          @cancel-edit="editingId = null"
          @remove="removeHolding"
          @toggle-core="toggleCore"
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

    <!-- 종목 추가 모달 -->
    <AddHoldingModal
      :show="showAddModal"
      v-model:search-q="searchQ"
      v-model:show-dropdown="showDropdown"
      :search-results="searchResults"
      :search-loading="searchLoading"
      v-model:new-holding="newHolding"
      :can-add="canAdd"
      @close="closeAddModal"
      @add="addHolding"
      @select-stock="selectStock"
      @search-blur="onSearchBlur"
      @search-input="onSearchInput"
    />

    <!-- AI 분석 모달 -->
    <StockAnalysisModal
      :show="showAnalysisModal"
      :holding="analysisTarget"
      @close="closeAnalysis"
    />

    <!-- AI 포트폴리오 진단 모달 -->
    <PortfolioAnalysisModal
      :show="showPortfolioAnalysis"
      :portfolio-context="portfolioAnalysisContext"
      @close="closePortfolioAnalysis"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import axios from "@/axios";
import { logAudit } from "@/utils/audit";
import { useStockFormatters } from "@/composables/useStockFormatters";
import { usePortfolioStats } from "@/composables/usePortfolioStats";
import PortfolioSummary from "@/components/stock/PortfolioSummary.vue";
import HoldingsTable from "@/components/stock/HoldingsTable.vue";
import HoldingsCards from "@/components/stock/HoldingsCards.vue";
import PortfolioChart from "@/components/stock/PortfolioChart.vue";
import AddHoldingModal from "@/components/stock/AddHoldingModal.vue";
import StockAnalysisModal from "@/components/stock/StockAnalysisModal.vue";
import PortfolioAnalysisModal from "@/components/stock/PortfolioAnalysisModal.vue";

const PORTFOLIO_KEY = "stock_portfolio";
const DISPLAY_CCY_KEY = "stock_displayCurrency";

export default {
  name: "PortfolioPanel",
  components: {
    PortfolioSummary,
    HoldingsTable,
    HoldingsCards,
    PortfolioChart,
    AddHoldingModal,
    StockAnalysisModal,
    PortfolioAnalysisModal,
  },
  props: {
    active: { type: Boolean, default: false },
  },
  emits: ["holdings-changed"],
  setup(props, { emit }) {
    const { fmtKRW, fmtUSD, fmtByMkt, pnlCls } = useStockFormatters();

    const holdings = ref([]);
    const prices = ref({});
    const priceLoading = ref(false);
    const initialLoading = ref(true);
    const portfolioView = ref("grid");
    const marketFilter = ref("all");
    const exchangeRate = ref(0);
    const exRateAt = ref("");
    const displayCurrency = ref(
      localStorage.getItem(DISPLAY_CCY_KEY) === "krw" ? "krw" : "native",
    );
    function setDisplayCurrency(v) {
      displayCurrency.value = v;
      localStorage.setItem(DISPLAY_CCY_KEY, v);
    }

    const showAddModal = ref(false);
    const showAnalysisModal = ref(false);
    const analysisTarget = ref(null);
    const showPortfolioAnalysis = ref(false);
    const searchQ = ref("");
    const showDropdown = ref(false);
    const searchResults = ref([]);
    const searchLoading = ref(false);
    const newHolding = ref({
      market: "US", name: "", symbol: "", quantity: null, avgPrice: null,
    });
    let searchTimer = null;

    const editingId = ref(null);
    const editForm = ref({ quantity: null, avgPrice: null });

    const lastUpdatedAt = ref(null);
    const relativeUpdated = ref("");
    const sortKey = ref(localStorage.getItem("stock_sortKey") || "");
    const sortDir = ref(localStorage.getItem("stock_sortDir") || "asc");
    const hoveredSegId = ref(null);

    let refreshTimer = null;
    let relativeTimer = null;

    function emitHoldingsChanged() {
      emit("holdings-changed", holdings.value);
    }

    function toNum(v) {
      if (v == null || v === "") return null;
      const n = Number(String(v).replace(",", "."));
      return Number.isFinite(n) ? n : null;
    }

    async function initPortfolio() {
      try {
        holdings.value = JSON.parse(localStorage.getItem(PORTFOLIO_KEY)) || [];
      } catch {
        holdings.value = [];
      }
      const localData = [...holdings.value];
      try {
        const res = await axios.get("/api/portfolio/holdings");
        const serverData = res.data || [];
        if (serverData.length > 0) {
          holdings.value = serverData;
          localStorage.removeItem(PORTFOLIO_KEY);
        } else if (localData.length > 0) {
          for (const h of localData) {
            await axios.post("/api/portfolio/holdings", {
              market: h.market, name: h.name, symbol: h.symbol,
              quantity: h.quantity, avgPrice: h.avgPrice,
            });
          }
          const refreshed = await axios.get("/api/portfolio/holdings");
          holdings.value = refreshed.data || [];
          localStorage.removeItem(PORTFOLIO_KEY);
        }
      } catch {
        holdings.value = localData;
      }
      emitHoldingsChanged();
    }

    async function fetchPrices() {
      if (holdings.value.length === 0) return;
      priceLoading.value = true;
      const results = {};
      const tasks = holdings.value.map(async (h) => {
        try {
          const res = await axios.get("/api/stock/quote", {
            params: { symbol: h.symbol, market: h.market.toLowerCase() },
          });
          results[h.symbol] = res.data;
        } catch { /* noop */ }
      });
      const hasUs = holdings.value.some((h) => h.market === "US");
      if (hasUs) tasks.push(fetchExchangeRate());
      await Promise.all(tasks);
      prices.value = results;
      priceLoading.value = false;
      lastUpdatedAt.value = new Date();
      updateRelativeTime();
    }

    function updateRelativeTime() {
      if (!lastUpdatedAt.value) return;
      const sec = Math.floor((Date.now() - lastUpdatedAt.value.getTime()) / 1000);
      if (sec < 10) relativeUpdated.value = "방금 전 업데이트";
      else if (sec < 60) relativeUpdated.value = `${sec}초 전 업데이트`;
      else relativeUpdated.value = `${Math.floor(sec / 60)}분 전 업데이트`;
    }

    async function fetchExchangeRate() {
      try {
        const res = await axios.get("/api/stock/quote", {
          params: { symbol: "USDKRW=X", market: "us" },
        });
        if (res.data?.price) {
          exchangeRate.value = res.data.price;
          exRateAt.value = new Date().toLocaleTimeString("ko-KR", {
            hour: "2-digit", minute: "2-digit",
          });
        }
      } catch { /* noop */ }
    }

    function openAddModal() { showAddModal.value = true; }

    function openAnalysis(h) {
      analysisTarget.value = h;
      showAnalysisModal.value = true;
      logAudit("STOCK/AI-ANALYSIS", "OPEN", h?.symbol);
    }
    function closeAnalysis() {
      showAnalysisModal.value = false;
      analysisTarget.value = null;
    }

    function openPortfolioAnalysis() {
      showPortfolioAnalysis.value = true;
      logAudit("STOCK/AI-PORTFOLIO", "OPEN");
    }
    function closePortfolioAnalysis() {
      showPortfolioAnalysis.value = false;
    }

    function closeAddModal() {
      showAddModal.value = false;
      searchQ.value = "";
      showDropdown.value = false;
      searchResults.value = [];
      newHolding.value = {
        market: "US", name: "", symbol: "", quantity: null, avgPrice: null,
      };
    }

    function onSearchInput() {
      clearTimeout(searchTimer);
      showDropdown.value = true;
      if (!searchQ.value.trim()) {
        searchResults.value = [];
        searchLoading.value = false;
        return;
      }
      searchLoading.value = true;
      searchTimer = setTimeout(async () => {
        try {
          const res = await axios.get("/api/stock/search", {
            params: { q: searchQ.value.trim() },
          });
          searchResults.value = res.data;
        } catch {
          searchResults.value = [];
        } finally {
          searchLoading.value = false;
        }
      }, 300);
    }

    function selectStock(s) {
      newHolding.value.name = s.name;
      newHolding.value.symbol = s.symbol;
      newHolding.value.market = s.market;
      searchQ.value = s.name;
      showDropdown.value = false;
    }
    function onSearchBlur() {
      setTimeout(() => { showDropdown.value = false; }, 200);
    }

    function describeApiError(err, fallback) {
      const status = err?.response?.status;
      const body = err?.response?.data;
      const serverMsg = typeof body === "string" ? body : body?.message;
      if (status === 403) return serverMsg || "해당 작업에 대한 권한이 없습니다. 관리자에게 문의하세요.";
      if (status === 401) return "로그인이 만료되었습니다. 다시 로그인해주세요.";
      if (serverMsg) return serverMsg;
      return fallback;
    }

    async function addHolding() {
      const h = newHolding.value;
      const sym = h.symbol.trim().toUpperCase();
      const market =
        h.market || (sym.endsWith(".KS") || sym.endsWith(".KQ") ? "KR" : "US");
      if (holdings.value.some((x) => x.symbol.toUpperCase() === sym)) {
        alert(`'${h.name}' 종목은 이미 추가되어 있습니다.`);
        return;
      }
      try {
        const res = await axios.post("/api/portfolio/holdings", {
          market, name: h.name.trim(), symbol: sym,
          quantity: h.quantity, avgPrice: toNum(h.avgPrice),
        });
        holdings.value.push(res.data);
        emitHoldingsChanged();
        closeAddModal();
        fetchPrices();
      } catch (err) {
        alert(describeApiError(err, "종목 추가에 실패했습니다."));
      }
    }

    async function toggleCore(h) {
      const next = !h.core;
      try {
        const res = await axios.put(`/api/portfolio/holdings/${h.id}/core`, { core: next });
        const idx = holdings.value.findIndex((x) => x.id === h.id);
        if (idx !== -1) holdings.value[idx] = res.data;
        emitHoldingsChanged();
      } catch (err) {
        alert(describeApiError(err, "코어 설정 변경에 실패했습니다."));
      }
    }

    async function removeHolding(id) {
      const target = holdings.value.find((h) => h.id === id);
      const name = target ? target.name : "이 종목";
      if (!confirm(`'${name}'을(를) 삭제하시겠습니까?`)) return;
      try {
        await axios.delete(`/api/portfolio/holdings/${id}`);
        holdings.value = holdings.value.filter((h) => h.id !== id);
        emitHoldingsChanged();
      } catch (err) {
        alert(describeApiError(err, "종목 삭제에 실패했습니다."));
      }
    }

    function startEdit(h) {
      editingId.value = h.id;
      editForm.value = { quantity: h.quantity, avgPrice: h.avgPrice };
    }
    async function saveEdit(h) {
      const payload = {
        quantity: editForm.value.quantity,
        avgPrice: toNum(editForm.value.avgPrice),
      };
      try {
        const res = await axios.put(`/api/portfolio/holdings/${h.id}`, payload);
        const idx = holdings.value.findIndex((x) => x.id === h.id);
        if (idx !== -1) holdings.value[idx] = res.data;
        editingId.value = null;
        emitHoldingsChanged();
        fetchPrices();
      } catch (err) {
        alert(describeApiError(err, "종목 수정에 실패했습니다."));
      }
    }

    const canAdd = computed(
      () =>
        newHolding.value.name.trim() &&
        newHolding.value.symbol.trim() &&
        newHolding.value.quantity > 0,
    );

    const stats = usePortfolioStats({
      holdings, prices, marketFilter, exchangeRate, sortKey, sortDir,
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
      const krPart = filteredHoldings.value.filter(
        (h) => h.market === "KR" && h.avgPrice,
      ).length;
      if (krPart > 0) return fmtKRW(abs);
      return displayCurrency.value === "krw" && exchangeRate.value > 0
        ? fmtKRW(usToKRW(abs))
        : fmtUSD(abs);
    }
    function fmtCurPrice(h) {
      const p = prices.value[h.symbol];
      return p ? fmtMoney(p.price, h.market) : "—";
    }
    function fmtHoldVal(h) {
      const p = prices.value[h.symbol];
      return p ? fmtMoney(p.price * h.quantity, h.market) : "—";
    }
    function fmtHoldPnl(h) {
      const v = holdPnl(h);
      if (v === null) return "—";
      return (v >= 0 ? "+" : "") + fmtMoney(v, h.market);
    }
    function fmtHoldPnlPct(h) {
      const v = holdPnlPct(h);
      if (v === null) return "—";
      return (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
    }
    function fmtLegVal(seg) {
      if (seg.currency === "KRW") {
        return seg.value >= 1e8
          ? (seg.value / 1e8).toFixed(1) + "억"
          : fmtKRW(seg.value);
      }
      const usdStr = "$" + seg.value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      if (seg.valKRW > 0) {
        const krwStr = seg.valKRW >= 1e8
          ? (seg.valKRW / 1e8).toFixed(1) + "억"
          : fmtKRW(seg.valKRW);
        return `${usdStr} ≈ ${krwStr}`;
      }
      return usdStr;
    }

    function toggleSort(key) {
      if (sortKey.value === key) {
        sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
      } else {
        sortKey.value = key;
        sortDir.value = (key === "value" || key === "pnlPct") ? "desc" : "asc";
      }
      localStorage.setItem("stock_sortKey", sortKey.value);
      localStorage.setItem("stock_sortDir", sortDir.value);
    }

    function fmtChangePct(h) {
      return prices.value[h.symbol]?.changePercent ?? null;
    }
    function fmtChangePctDisplay(h) {
      const v = fmtChangePct(h);
      if (v === null) return "—";
      return (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
    }
    function changePctCls(h) {
      return pnlCls(fmtChangePct(h));
    }

    const hoveredSegment = computed(() =>
      hoveredSegId.value ? chartSegments.value.find((s) => s.id === hoveredSegId.value) : null,
    );

    const portfolioAnalysisContext = computed(() => {
      const totalKRW = chartSegments.value.reduce((sum, seg) => sum + (seg.valKRW || 0), 0);
      const segmentById = new Map(chartSegments.value.map((seg) => [seg.id, seg]));
      const enrichedHoldings = holdings.value.map((h) => {
        const quote = prices.value[h.symbol] || {};
        const seg = segmentById.get(h.id);
        const currentPrice = quote.price ?? null;
        const marketValue = currentPrice != null ? currentPrice * h.quantity : null;
        const marketValueKRW = h.market === "KR"
          ? marketValue
          : (marketValue != null && exchangeRate.value > 0 ? marketValue * exchangeRate.value : null);
        const weightPct = totalKRW > 0 && marketValueKRW != null
          ? (marketValueKRW / totalKRW) * 100
          : null;

        return {
          id: h.id,
          market: h.market,
          name: h.name,
          symbol: h.symbol,
          quantity: h.quantity,
          avgPrice: h.avgPrice ?? null,
          currentPrice,
          marketValue,
          marketValueKRW,
          weightPct,
          changePercent: quote.changePercent ?? null,
          pnlPct: holdPnlPct(h),
          chartWeightPct: seg ? seg.pct * 100 : null,
        };
      });

      return {
        asOf: lastUpdatedAt.value ? lastUpdatedAt.value.toISOString() : new Date().toISOString(),
        exchangeRate: exchangeRate.value || null,
        totalValueKRW: totalKRW || totalValKRW.value || null,
        holdings: enrichedHoldings,
        instruction: "Use holdings[].weightPct as the current portfolio weight. If weightPct is present, do not ask the user for weights.",
      };
    });

    const showCurrencyToggle = computed(
      () =>
        usHoldingsCount.value > 0 &&
        marketFilter.value !== "kr" &&
        exchangeRate.value > 0,
    );

    function onKeydown(e) {
      if (e.key === "Escape" && showAddModal.value) closeAddModal();
    }

    watch(
      () => props.active,
      (isActive) => {
        if (isActive) {
          logAudit("STOCK/HOLDING");
          fetchPrices();
        }
      },
    );

    onMounted(async () => {
      try {
        await initPortfolio();
      } finally {
        initialLoading.value = false;
      }
      if (props.active) {
        logAudit("STOCK/HOLDING");
        fetchPrices();
      }
      refreshTimer = setInterval(() => {
        if (props.active && editingId.value === null) fetchPrices();
      }, 120000);
      relativeTimer = setInterval(updateRelativeTime, 10000);
      document.addEventListener("keydown", onKeydown);
    });

    onBeforeUnmount(() => {
      clearInterval(refreshTimer);
      clearInterval(relativeTimer);
      clearTimeout(searchTimer);
      document.removeEventListener("keydown", onKeydown);
    });

    return {
      holdings, prices, priceLoading, initialLoading, portfolioView, marketFilter,
      displayCurrency, setDisplayCurrency, showCurrencyToggle,
      exchangeRate, exRateAt, lastUpdatedAt, relativeUpdated,
      sortKey, sortDir, hoveredSegId, hoveredSegment,
      showAddModal, showAnalysisModal, analysisTarget, showPortfolioAnalysis,
      searchQ, showDropdown, searchResults, searchLoading,
      newHolding, editingId, editForm, canAdd,
      filteredHoldings, sortedHoldings,
      krHoldingsCount, usHoldingsCount,
      krTotal, usTotal, usTotalKRW, hasAvgPrice,
      totalCost, totalPnl, totalPnlPct,
      krPnl, krPnlPct, krHasAvgPrice,
      usPnl, usPnlPct, usHasAvgPrice,
      totalValKRW, totalCostKRW, totalPnlKRW, totalPnlKRWPct,
      chartSegments, portfolioAnalysisContext,
      openAddModal, closeAddModal, openAnalysis, closeAnalysis,
      openPortfolioAnalysis, closePortfolioAnalysis,
      onSearchInput, selectStock, onSearchBlur,
      addHolding, removeHolding, toggleCore, startEdit, saveEdit, fetchPrices,
      fmtKRW, fmtUSD, fmtByMkt, fmtMoney, pnlCls,
      fmtAbsPnl, fmtCurPrice, fmtHoldVal, fmtHoldPnl, fmtHoldPnlPct,
      fmtLegVal, holdPnl, holdPnlPct, holdValKRW,
      toggleSort, fmtChangePctDisplay, changePctCls,
    };
  },
};
</script>

<style src="@/assets/css/stock.css" scoped></style>
