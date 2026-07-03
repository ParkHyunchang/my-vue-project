<template>
  <div>
    <!-- 초기 로딩 -->
    <div v-if="initialLoading" class="loading-state" style="padding: 48px 0">
      <div class="spinner"></div>
      <span>{{ accountUi.label }} 보유 종목 불러오는 중...</span>
    </div>

    <!-- 빈 상태 -->
    <div v-else-if="holdings.length === 0" class="portfolio-empty">
      <div class="portfolio-empty-icon">📊</div>
      <h3>{{ accountUi.emptyTitle }}</h3>
      <p>{{ accountUi.emptyDescription }}</p>
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
          {{ accountUi.aiButtonLabel }}
        </button>
        <span class="portfolio-ai-hint">{{ accountUi.aiHint }}</span>
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
          :fmt-k-r-w="fmtKRW"
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
      :allow-cash="accountUi.allowCash"
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
      :title="accountUi.aiButtonLabel"
      :portfolio-context="portfolioAnalysisContext"
      @close="closePortfolioAnalysis"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import axios from "@/axios";
import { logAudit } from "@/utils/audit";
import { apiErrorMessage } from "@/utils/apiError";
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
import AddHoldingModal from "@/components/stock/AddHoldingModal.vue";
import StockAnalysisModal from "@/components/stock/StockAnalysisModal.vue";
import PortfolioAnalysisModal from "@/components/stock/PortfolioAnalysisModal.vue";
import { ACCOUNT_CONFIGS, isCashHolding, normalizeAccountType } from "@/config/stockAccounts";

function makeLocalHoldingId(accountType) {
  return `${accountType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

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
    accountType: { type: String, default: "stock" },
    accountLabel: { type: String, default: "" },
  },
  emits: ["holdings-changed"],
  setup(props, { emit }) {
    const { fmtKRW, fmtUSD, fmtByMkt, pnlCls } = useStockFormatters();
    const normalizedAccountType = normalizeAccountType(props.accountType);
    const baseAccountConfig = ACCOUNT_CONFIGS[normalizedAccountType];
    const accountUi = computed(() => ({
      ...baseAccountConfig,
      label: props.accountLabel || baseAccountConfig.label,
    }));
    const usesRemotePortfolio = baseAccountConfig.remote;
    const portfolioApiPath = baseAccountConfig.apiPath;

    const holdings = ref([]);
    const initialLoading = ref(true);
    const portfolioView = ref("grid");
    const marketFilter = ref("all");
    const displayCurrency = ref(
      localStorage.getItem(baseAccountConfig.displayCurrencyKey) === "krw" ? "krw" : "native",
    );
    function setDisplayCurrency(v) {
      displayCurrency.value = v;
      localStorage.setItem(baseAccountConfig.displayCurrencyKey, v);
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
      assetType: "STOCK", market: "US", name: "", symbol: "", quantity: null, avgPrice: null,
    });
    let searchTimer = null;

    const editingId = ref(null);
    const editForm = ref({ quantity: null, avgPrice: null });

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
      holdings,
      active: () => props.active,
      refreshGuard: () => editingId.value === null,
      freshThresholdSec: 10,
      relativeSuffix: " 업데이트",
    });
    const sortKey = ref(localStorage.getItem(baseAccountConfig.sortKey) || "");
    const sortDir = ref(localStorage.getItem(baseAccountConfig.sortDirKey) || "asc");
    const hoveredSegId = ref(null);

    function emitHoldingsChanged() {
      emit("holdings-changed", holdings.value);
    }

    function toNum(v) {
      if (v == null || v === "") return null;
      const n = Number(String(v).replace(",", "."));
      return Number.isFinite(n) ? n : null;
    }

    function normalizeHoldingForAccount(holding) {
      const assetType = holding.assetType || "STOCK";
      return {
        ...holding,
        id: holding.id ?? makeLocalHoldingId(normalizedAccountType),
        accountType: holding.accountType || normalizedAccountType,
        assetType,
        avgPrice: assetType === "CASH" ? 1 : holding.avgPrice,
      };
    }

    function readLocalHoldings() {
      try {
        const parsed = JSON.parse(localStorage.getItem(baseAccountConfig.storageKey)) || [];
        return parsed.map(normalizeHoldingForAccount);
      } catch {
        return [];
      }
    }

    function writeLocalHoldings(list = holdings.value) {
      localStorage.setItem(baseAccountConfig.storageKey, JSON.stringify(list));
    }

    function accountRequestConfig() {
      return { params: { accountType: normalizedAccountType } };
    }

    function belongsToAccount(holding) {
      if (normalizedAccountType === "stock") {
        return !holding.accountType || holding.accountType === "stock" || holding.accountType === "general";
      }
      return !holding.accountType || holding.accountType === normalizedAccountType;
    }

    async function initPortfolio() {
      holdings.value = readLocalHoldings();
      const localData = [...holdings.value];
      if (!usesRemotePortfolio) {
        emitHoldingsChanged();
        return;
      }
      try {
        const res = await axios.get(portfolioApiPath, accountRequestConfig());
        const serverData = (res.data || [])
          .filter(belongsToAccount)
          .map(normalizeHoldingForAccount);
        if (serverData.length > 0) {
          holdings.value = serverData;
          localStorage.removeItem(baseAccountConfig.storageKey);
        } else if (localData.length > 0) {
          for (const h of localData) {
            await axios.post(portfolioApiPath, {
              assetType: h.assetType || "STOCK",
              accountType: normalizedAccountType,
              market: h.assetType === "CASH" ? "KR" : h.market,
              name: h.name,
              symbol: h.symbol || `CASH-${normalizedAccountType.toUpperCase()}-${Date.now()}`,
              quantity: h.quantity,
              avgPrice: h.assetType === "CASH" ? 1 : h.avgPrice,
            }, accountRequestConfig());
          }
          const refreshed = await axios.get(portfolioApiPath, accountRequestConfig());
          holdings.value = (refreshed.data || [])
            .filter(belongsToAccount)
            .map(normalizeHoldingForAccount);
          localStorage.removeItem(baseAccountConfig.storageKey);
        }
      } catch {
        holdings.value = normalizedAccountType === "stock" ? localData : [];
      }
      emitHoldingsChanged();
    }

    function openAddModal() { showAddModal.value = true; }

    function openAnalysis(h) {
      analysisTarget.value = h;
      showAnalysisModal.value = true;
      logAudit(accountUi.value.auditAnalysis, "OPEN", h?.symbol);
    }
    function closeAnalysis() {
      showAnalysisModal.value = false;
      analysisTarget.value = null;
    }

    function openPortfolioAnalysis() {
      showPortfolioAnalysis.value = true;
      logAudit(accountUi.value.auditPortfolio, "OPEN");
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
        assetType: "STOCK", market: "US", name: "", symbol: "", quantity: null, avgPrice: null,
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
      newHolding.value.assetType = "STOCK";
      newHolding.value.name = s.name;
      newHolding.value.symbol = s.symbol;
      newHolding.value.market = s.market;
      searchQ.value = s.name;
      showDropdown.value = false;
    }
    function onSearchBlur() {
      setTimeout(() => { showDropdown.value = false; }, 200);
    }

    async function addHolding() {
      const h = newHolding.value;
      const assetType = h.assetType === "CASH" ? "CASH" : "STOCK";
      const sym = assetType === "CASH"
        ? (h.symbol || `CASH-${normalizedAccountType.toUpperCase()}-${Date.now()}`).trim().toUpperCase()
        : h.symbol.trim().toUpperCase();
      const market =
        assetType === "CASH"
          ? "KR"
          : h.market || (sym.endsWith(".KS") || sym.endsWith(".KQ") ? "KR" : "US");
      if (holdings.value.some((x) => x.symbol.toUpperCase() === sym)) {
        alert(`'${h.name}' 종목은 이미 추가되어 있습니다.`);
        return;
      }
      const payload = {
        assetType,
        accountType: normalizedAccountType,
        market,
        name: h.name.trim() || "현금성 대기자산",
        symbol: sym,
        quantity: h.quantity,
        avgPrice: assetType === "CASH" ? 1 : toNum(h.avgPrice),
      };
      if (!usesRemotePortfolio) {
        holdings.value.push(normalizeHoldingForAccount(payload));
        writeLocalHoldings();
        emitHoldingsChanged();
        closeAddModal();
        fetchPrices();
        return;
      }
      try {
        const res = await axios.post(portfolioApiPath, payload, accountRequestConfig());
        holdings.value.push(normalizeHoldingForAccount(res.data));
        emitHoldingsChanged();
        closeAddModal();
        fetchPrices();
      } catch (err) {
        alert(apiErrorMessage(err, "종목 추가에 실패했습니다."));
      }
    }

    async function toggleCore(h) {
      const next = !h.core;
      if (!usesRemotePortfolio) {
        const idx = holdings.value.findIndex((x) => x.id === h.id);
        if (idx !== -1) {
          holdings.value[idx] = { ...holdings.value[idx], core: next };
          writeLocalHoldings();
          emitHoldingsChanged();
        }
        return;
      }
      try {
        const res = await axios.put(`${portfolioApiPath}/${h.id}/core`, {
          accountType: normalizedAccountType,
          core: next,
        }, accountRequestConfig());
        const idx = holdings.value.findIndex((x) => x.id === h.id);
        if (idx !== -1) holdings.value[idx] = normalizeHoldingForAccount(res.data);
        emitHoldingsChanged();
      } catch (err) {
        alert(apiErrorMessage(err, "코어 설정 변경에 실패했습니다."));
      }
    }

    async function removeHolding(id) {
      const target = holdings.value.find((h) => h.id === id);
      const name = target ? target.name : "이 종목";
      if (!confirm(`'${name}'을(를) 삭제하시겠습니까?`)) return;
      if (!usesRemotePortfolio) {
        holdings.value = holdings.value.filter((h) => h.id !== id);
        writeLocalHoldings();
        emitHoldingsChanged();
        return;
      }
      try {
        await axios.delete(`${portfolioApiPath}/${id}`, accountRequestConfig());
        holdings.value = holdings.value.filter((h) => h.id !== id);
        emitHoldingsChanged();
      } catch (err) {
        alert(apiErrorMessage(err, "종목 삭제에 실패했습니다."));
      }
    }

    function startEdit(h) {
      editingId.value = h.id;
      editForm.value = { quantity: h.quantity, avgPrice: h.avgPrice };
    }
    async function saveEdit(h) {
      const payload = {
        accountType: normalizedAccountType,
        quantity: editForm.value.quantity,
        avgPrice: isCashHolding(h) ? 1 : toNum(editForm.value.avgPrice),
      };
      if (!usesRemotePortfolio) {
        const idx = holdings.value.findIndex((x) => x.id === h.id);
        if (idx !== -1) {
          holdings.value[idx] = normalizeHoldingForAccount({
            ...holdings.value[idx],
            ...payload,
          });
        }
        editingId.value = null;
        writeLocalHoldings();
        emitHoldingsChanged();
        fetchPrices();
        return;
      }
      try {
        const res = await axios.put(`${portfolioApiPath}/${h.id}`, payload, accountRequestConfig());
        const idx = holdings.value.findIndex((x) => x.id === h.id);
        if (idx !== -1) holdings.value[idx] = normalizeHoldingForAccount(res.data);
        editingId.value = null;
        emitHoldingsChanged();
        fetchPrices();
      } catch (err) {
        alert(apiErrorMessage(err, "종목 수정에 실패했습니다."));
      }
    }

    const canAdd = computed(
      () => {
        if (newHolding.value.assetType === "CASH") {
          return newHolding.value.name.trim() && Number(newHolding.value.quantity) > 0;
        }
        return newHolding.value.name.trim() &&
          newHolding.value.symbol.trim() &&
          newHolding.value.quantity > 0;
      },
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

    function toggleSort(key) {
      if (sortKey.value === key) {
        sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
      } else {
        sortKey.value = key;
        sortDir.value = (key === "value" || key === "pnlPct") ? "desc" : "asc";
      }
      localStorage.setItem(baseAccountConfig.sortKey, sortKey.value);
      localStorage.setItem(baseAccountConfig.sortDirKey, sortDir.value);
    }

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

    const hoveredSegment = computed(() =>
      hoveredSegId.value ? chartSegments.value.find((s) => s.id === hoveredSegId.value) : null,
    );

    const portfolioAnalysisContext = computed(() =>
      buildAnalysisContext({
        accountType: normalizedAccountType,
        accountLabel: accountUi.value.label,
        accountNote: accountUi.value.analysisNote,
        filteredHoldings,
        prices,
        exchangeRate,
        chartSegments,
        holdPnlPct,
        totalValKRW,
        marketFilter,
        lastUpdatedAt,
        instruction: `This is the user's ${accountUi.value.label} account. Use holdings[].weightPct as the current portfolio weight. If weightPct is present, do not ask the user for weights. ${accountUi.value.analysisNote}`,
      }),
    );

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
          logAudit(accountUi.value.auditView);
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
        logAudit(accountUi.value.auditView);
        fetchPrices();
      }
      startTimers();
      document.addEventListener("keydown", onKeydown);
    });

    onBeforeUnmount(() => {
      stopTimers();
      clearTimeout(searchTimer);
      document.removeEventListener("keydown", onKeydown);
    });

    return {
      accountUi,
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
