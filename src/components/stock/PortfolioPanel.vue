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
import { useStockFormatters } from "@/composables/useStockFormatters";
import { usePortfolioStats } from "@/composables/usePortfolioStats";
import PortfolioSummary from "@/components/stock/PortfolioSummary.vue";
import HoldingsTable from "@/components/stock/HoldingsTable.vue";
import HoldingsCards from "@/components/stock/HoldingsCards.vue";
import PortfolioChart from "@/components/stock/PortfolioChart.vue";
import AddHoldingModal from "@/components/stock/AddHoldingModal.vue";
import StockAnalysisModal from "@/components/stock/StockAnalysisModal.vue";
import PortfolioAnalysisModal from "@/components/stock/PortfolioAnalysisModal.vue";

const ACCOUNT_CONFIGS = {
  stock: {
    label: "장기 주식계좌",
    storageKey: "stock_portfolio",
    apiPath: "/api/portfolio/holdings",
    displayCurrencyKey: "stock_displayCurrency",
    sortKey: "stock_sortKey",
    sortDirKey: "stock_sortDir",
    remote: true,
    allowCash: false,
    emptyTitle: "장기 주식계좌 보유 종목이 없습니다",
    emptyDescription: "장기 주식계좌에 담은 국내·미국 종목을 추가하면 장기 포트폴리오 현황을 한눈에 확인할 수 있습니다.",
    aiButtonLabel: "📊 장기 주식계좌 AI 진단",
    aiHint: "장기 보유 종목 시그널 + 코어/위성 전략 진단",
    auditView: "STOCK/HOLDING",
    auditAnalysis: "STOCK/AI-ANALYSIS",
    auditPortfolio: "STOCK/AI-PORTFOLIO",
    analysisNote: "장기 주식계좌입니다. 국내·미국 주식을 장기 보유하는 계좌로, 코어/위성 전략 기준으로 종목별 펀더멘털·밸류에이션 분석을 중심으로 진단하세요.",
  },
  isa: {
    label: "ISA 계좌",
    storageKey: "stock_portfolio_isa",
    apiPath: "/api/portfolio/isa/holdings",
    displayCurrencyKey: "stock_isa_displayCurrency",
    sortKey: "stock_isa_sortKey",
    sortDirKey: "stock_isa_sortDir",
    remote: true,
    allowCash: true,
    emptyTitle: "ISA 보유 종목이 없습니다",
    emptyDescription: "ISA 계좌에 담은 종목을 추가하면 중장기 적립식 포트폴리오를 따로 관리할 수 있습니다.",
    aiButtonLabel: "📊 ISA 포트폴리오 AI 진단",
    aiHint: "중장기 적립식 포트폴리오 — 세제혜택 + 적립 전략 진단",
    auditView: "STOCK/ISA",
    auditAnalysis: "STOCK/ISA/AI-ANALYSIS",
    auditPortfolio: "STOCK/ISA/AI-PORTFOLIO",
    analysisNote: "ISA 계좌입니다. 중장기 적립식 운용 전략으로 계속 모아가는 계좌입니다. 서민형 ISA 기본정보는 내부 판단 기준으로만 사용하고, 세제·의무기간 판단에 직접 필요할 때만 언급하세요.",
  },
  general: {
    label: "단기 주식계좌",
    storageKey: "stock_portfolio_general",
    apiPath: "/api/portfolio/general/holdings",
    displayCurrencyKey: "stock_general_displayCurrency",
    sortKey: "stock_general_sortKey",
    sortDirKey: "stock_general_sortDir",
    remote: true,
    allowCash: true,
    emptyTitle: "단기 주식계좌 보유 종목이 없습니다",
    emptyDescription: "단기 주식계좌에 단기매매 중인 종목을 추가하면 매매 포지션 현황을 한눈에 확인할 수 있습니다.",
    aiButtonLabel: "📈 단기 포트폴리오 AI 진단",
    aiHint: "단기매매 포지션 — 익절·손절·모멘텀 시그널 진단",
    auditView: "STOCK/GENERAL",
    auditAnalysis: "STOCK/GENERAL/AI-ANALYSIS",
    auditPortfolio: "STOCK/GENERAL/AI-PORTFOLIO",
    analysisNote: "단기 주식계좌입니다. 1종목당 200~300만원 소액으로 단기 스윙 매매를 하는 계좌입니다. 장기 보유 원칙 없이 모멘텀·뉴스 기반으로 익절·손절을 적극 활용합니다.",
  },
  irp: {
    label: "IRP 계좌",
    storageKey: "stock_portfolio_irp",
    apiPath: "/api/portfolio/irp/holdings",
    displayCurrencyKey: "stock_irp_displayCurrency",
    sortKey: "stock_irp_sortKey",
    sortDirKey: "stock_irp_sortDir",
    remote: true,
    allowCash: true,
    emptyTitle: "IRP 보유 종목이 없습니다",
    emptyDescription: "IRP 계좌에 담은 종목을 추가하면 은퇴 자산 관점의 비중과 리스크를 따로 볼 수 있습니다.",
    aiButtonLabel: "🛡️ IRP 포트폴리오 AI 진단",
    aiHint: "퇴직연금 IRP — 장기 안정성·위험자산 한도 진단",
    auditView: "STOCK/IRP",
    auditAnalysis: "STOCK/IRP/AI-ANALYSIS",
    auditPortfolio: "STOCK/IRP/AI-PORTFOLIO",
    analysisNote: "IRP 계좌입니다. 은퇴자산 장기 적립 계좌로 계속 모아가는 전략입니다. 위험자산 70% 한도와 안전자산 약 30% 기준은 리밸런싱 판단에 직접 필요할 때만 언급하세요.",
  },
};

function normalizeAccountType(value) {
  return Object.prototype.hasOwnProperty.call(ACCOUNT_CONFIGS, value) ? value : "stock";
}

function makeLocalHoldingId(accountType) {
  return `${accountType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isCashHolding(holding) {
  return holding?.assetType === "CASH";
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
    const prices = ref({});
    const priceLoading = ref(false);
    const initialLoading = ref(true);
    const portfolioView = ref("grid");
    const marketFilter = ref("all");
    const exchangeRate = ref(0);
    const exRateAt = ref("");
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

    const lastUpdatedAt = ref(null);
    const relativeUpdated = ref("");
    const sortKey = ref(localStorage.getItem(baseAccountConfig.sortKey) || "");
    const sortDir = ref(localStorage.getItem(baseAccountConfig.sortDirKey) || "asc");
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

    async function fetchPrices() {
      if (holdings.value.length === 0) return;
      priceLoading.value = true;
      const results = {};
      holdings.value.forEach((h) => {
        if (isCashHolding(h)) {
          results[h.symbol] = { price: 1, changePercent: null };
        }
      });
      const tasks = holdings.value.filter((h) => !isCashHolding(h)).map(async (h) => {
        try {
          const res = await axios.get("/api/stock/quote", {
            params: { symbol: h.symbol, market: h.market.toLowerCase() },
          });
          results[h.symbol] = res.data;
        } catch { /* noop */ }
      });
      const hasUs = holdings.value.some((h) => !isCashHolding(h) && h.market === "US");
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
        alert(describeApiError(err, "종목 추가에 실패했습니다."));
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
        alert(describeApiError(err, "코어 설정 변경에 실패했습니다."));
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
        alert(describeApiError(err, "종목 삭제에 실패했습니다."));
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
        alert(describeApiError(err, "종목 수정에 실패했습니다."));
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
      if (isCashHolding(h)) return "현금";
      const p = prices.value[h.symbol];
      return p ? fmtMoney(p.price, h.market) : "—";
    }
    function fmtHoldVal(h) {
      if (isCashHolding(h)) return fmtKRW(Number(h.quantity) || 0);
      const p = prices.value[h.symbol];
      return p ? fmtMoney(p.price * h.quantity, h.market) : "—";
    }
    function fmtHoldPnl(h) {
      if (isCashHolding(h)) return "—";
      const v = holdPnl(h);
      if (v === null) return "—";
      return (v >= 0 ? "+" : "") + fmtMoney(v, h.market);
    }
    function fmtHoldPnlPct(h) {
      if (isCashHolding(h)) return "—";
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
      localStorage.setItem(baseAccountConfig.sortKey, sortKey.value);
      localStorage.setItem(baseAccountConfig.sortDirKey, sortDir.value);
    }

    function fmtChangePct(h) {
      if (isCashHolding(h)) return null;
      return prices.value[h.symbol]?.changePercent ?? null;
    }
    function fmtChangePctDisplay(h) {
      const v = fmtChangePct(h);
      if (v === null) return "—";
      return (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
    }
    function changePctCls(h) {
      if (isCashHolding(h)) return "";
      return pnlCls(fmtChangePct(h));
    }

    const hoveredSegment = computed(() =>
      hoveredSegId.value ? chartSegments.value.find((s) => s.id === hoveredSegId.value) : null,
    );

    const portfolioAnalysisContext = computed(() => {
      const totalKRW = chartSegments.value.reduce((sum, seg) => sum + (seg.valKRW || 0), 0);
      const segmentById = new Map(chartSegments.value.map((seg) => [seg.id, seg]));
      const enrichedHoldings = filteredHoldings.value.map((h) => {
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
          assetType: h.assetType || "STOCK",
          market: h.market,
          name: h.name,
          symbol: h.symbol,
          core: !!h.core,
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
        accountType: normalizedAccountType,
        accountLabel: accountUi.value.label,
        accountNote: accountUi.value.analysisNote,
        asOf: lastUpdatedAt.value ? lastUpdatedAt.value.toISOString() : new Date().toISOString(),
        exchangeRate: exchangeRate.value || null,
        totalValueKRW: totalKRW || totalValKRW.value || null,
        holdings: enrichedHoldings,
        marketFilter: marketFilter.value !== 'all' ? marketFilter.value.toUpperCase() : null,
        instruction: `This is the user's ${accountUi.value.label} account. Use holdings[].weightPct as the current portfolio weight. If weightPct is present, do not ask the user for weights. ${accountUi.value.analysisNote}`,
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
