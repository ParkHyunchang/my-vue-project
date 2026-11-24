<template>
  <div class="stock-container">
    <div class="page-header">
      <h2>주식 대시보드</h2>
      <p class="page-subtitle">
        보유 자산부터 시장 정보, 연결 계좌와 자동매매까지
      </p>
    </div>

    <!-- KRX 만료 임박/만료 알림 배너 -->
    <div
      v-if="krxApiStatus !== 'valid'"
      :class="['krx-alert-banner', 'krx-alert-' + krxApiStatus]"
    >
      <span class="krx-alert-icon">{{ krxApiStatus === 'expired' ? '🚨' : '⚠️' }}</span>
      <span class="krx-alert-msg">
        <template v-if="krxApiStatus === 'expired'">KRX Open API 인증키가 <strong>만료</strong>되었습니다. 국내 주식 데이터가 정상적으로 표시되지 않을 수 있습니다.</template>
        <template v-else-if="krxApiStatus === 'unknown'">KRX 연결 정보를 확인하지 못했습니다. 아래 연결 정보를 다시 확인해 주세요.</template>
        <template v-else>KRX Open API 인증키가 <strong>{{ krxDaysRemaining === null ? '미확인' : 'D-' + krxDaysRemaining }}</strong> 후 만료됩니다. 미리 갱신하세요.</template>
      </span>
      <a
        href="https://openapi.krx.co.kr/contents/OPP/MYPG/mypage/OPPMYPG002.cmd"
        target="_blank"
        rel="noopener"
        class="krx-alert-link"
      >인증키 갱신 →</a>
    </div>

    <!-- KRX Open API 현황 -->
    <details class="krx-api-section">
      <summary>시장 데이터 연결 정보 · KRX {{ krxApiStatusText }}</summary>
      <div :class="['krx-api-card', 'api-status-' + krxApiStatus]">
        <div class="krx-api-left">
          <span class="krx-api-name">KRX Open API</span>
          <span :class="['krx-status-badge', 'api-status-' + krxApiStatus]">{{ krxApiStatusText }}</span>
        </div>
        <div class="krx-api-middle">
          유효기간: <strong>{{ krxPeriodText }}</strong>
          <span class="krx-api-sep">·</span>
          <span :class="['krx-days', 'api-status-' + krxApiStatus]">{{ krxDaysRemaining === null ? '미확인' : 'D-' + krxDaysRemaining }}</span>
        </div>
        <div class="krx-api-right">
          <a
            href="https://openapi.krx.co.kr/contents/OPP/MYPG/mypage/OPPMYPG002.cmd"
            target="_blank"
            rel="noopener"
            class="krx-renew-link"
          >인증키 갱신 →</a>
        </div>
      </div>
    </details>

    <nav
      class="stock-navigation"
      aria-label="주식 화면 선택"
    >
      <div class="stock-groups">
        <button
          v-for="group in groups"
          :key="group.id"
          :class="{ active: activeGroup.id === group.id }"
          :aria-pressed="activeGroup.id === group.id"
          @click="switchTab(group.tabs[0])"
        >
          {{ group.label }}
        </button>
      </div>
      <div
        ref="tabStrip"
        class="stock-tabs"
        aria-label="세부 화면"
      >
        <button
          v-for="tab in visibleTabs"
          :key="tab.id"
          :data-tab="tab.id"
          :class="['tab-btn', { active: activeTab === tab.id }]"
          :aria-current="activeTab === tab.id ? 'page' : undefined"
          @click="switchTab(tab.id)"
          @keydown="moveTabFocus($event, tab.id)"
        >
          <span
            class="tab-icon"
            aria-hidden="true"
          >{{ tab.icon }}</span><span>{{ tab.label }}</span>
        </button>
      </div>
      <p class="stock-context">
        {{ activeGroup.description }}
      </p>
      <p
        v-if="activeGroup.id === 'portfolio' && accountsLoading"
        class="stock-loading"
        role="status"
      >
        수기 포트폴리오의 보유 목록을 불러오고 있습니다.
      </p>
    </nav>
    <section
      v-if="activeGroup.id === 'portfolio'"
      class="manual-account-tools"
    >
      <button
        type="button"
        @click="showAccountManager = true"
        :disabled="catalogLoading || !!catalogError"
      >
        수기 계좌 관리
      </button>
      <p
        v-if="catalogLoading"
        role="status"
      >
        수기 계좌 목록을 확인하고 있습니다.
      </p>
      <p
        v-if="catalogError"
        role="alert"
      >
        {{ catalogError }} <button @click="loadAccounts">
          다시 확인
        </button>
      </p>
    </section>
    <PortfolioAccountManager
      :show="showAccountManager"
      :accounts="manualAccounts"
      @close="showAccountManager = false"
      @saved="loadAccounts"
    />
    <BrokerAccountsPanel v-if="isAdmin && activeTab === 'broker-accounts'" />

    <div
      v-show="activeTab === 'all'"
      class="tab-content"
    >
      <AllAccountsPanel
        :active="activeTab === 'all'"
        :holdings-by-account="holdingsByAccount"
        :loading="accountsLoading"
        :account-states="accountStates"
        :account-descriptors="accountDescriptors"
        :catalog-ready="!catalogLoading && !catalogError"
        @retry-account="retryAccount"
      />
    </div>

    <div
      v-for="account in accountDescriptors"
      :key="account.id"
      v-show="activeTab === account.id"
      class="tab-content"
    >
      <PortfolioPanel
        :key="account.id + account.label + account.purpose"
        :account-type="account.legacyType || 'stock'"
        :account-config="account.config"
        :reload-version="reloadVersions[account.id] || 0"
        :active="activeTab === account.id"
        @load-state="onAccountState(account.id, $event)"
        @holdings-changed="onHoldingsChanged(account.id, $event)"
      />
    </div>

    <div
      v-show="activeTab === 'heatmap'"
      class="tab-content"
    >
      <HeatmapPanel :active="activeTab === 'heatmap'" />
    </div>

    <div
      v-show="activeTab === 'top10'"
      class="tab-content"
    >
      <Top10Panel :active="activeTab === 'top10'" />
    </div>

    <div
      v-show="activeTab === 'news'"
      class="tab-content"
    >
      <NewsPanel
        :active="activeTab === 'news'"
        :holdings="allHoldings"
      />
    </div>

    <div
      v-if="isAdmin && paperTradingEnabled && activeTab === 'paper-trade'"
      class="tab-content"
    >
      <UsPaperTradingPanel />
    </div>

    <div
      v-if="isAdmin && activeTab === 'auto-trade'"
      class="tab-content"
    >
      <div
        class="auto-market-tabs"
        role="group"
        aria-label="자동매매 국가 선택"
      >
        <button
          :class="{ active: autoTradeMarket === 'KR' }"
          :aria-pressed="autoTradeMarket === 'KR'"
          @click="autoTradeMarket = 'KR'"
        >
          🇰🇷 한국
        </button>
        <button
          :class="{ active: autoTradeMarket === 'US' }"
          :aria-pressed="autoTradeMarket === 'US'"
          @click="autoTradeMarket = 'US'"
        >
          🇺🇸 미국
        </button>
      </div>
      <KiwoomAutoTrade v-if="autoTradeMarket === 'KR'" />
      <KiwoomUsAutoTrade v-else />
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, nextTick, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import axios from "@/axios";
import BrokerAccountsPanel from "@/components/stock/BrokerAccountsPanel.vue";
import { fetchPortfolioAccounts } from "@/api/portfolioAccountsApi";
import PortfolioAccountManager from "@/components/stock/PortfolioAccountManager.vue";
import PortfolioPanel from "@/components/stock/PortfolioPanel.vue";
import AllAccountsPanel from "@/components/stock/AllAccountsPanel.vue";
import HeatmapPanel from "@/components/stock/HeatmapPanel.vue";
import Top10Panel from "@/components/stock/Top10Panel.vue";
import NewsPanel from "@/components/stock/NewsPanel.vue";
import KiwoomAutoTrade from "@/components/stock/KiwoomAutoTrade.vue";
import KiwoomUsAutoTrade from "@/components/stock/KiwoomUsAutoTrade.vue";
import UsPaperTradingPanel from "@/components/stock/UsPaperTradingPanel.vue";
import { ACCOUNT_CONFIGS, ACCOUNT_TAB_ORDER } from "@/config/stockAccounts";

export default {
  name: "StockPage",
  components: { PortfolioAccountManager, BrokerAccountsPanel, PortfolioPanel, AllAccountsPanel, HeatmapPanel, Top10Panel, NewsPanel, KiwoomAutoTrade, KiwoomUsAutoTrade, UsPaperTradingPanel },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const store = useStore();
    const isAdmin = computed(() => store.getters["auth/isAdmin"]);
    // Enable only for a deployment with the dedicated paper API configured.
    const paperTradingEnabled = process.env.VUE_APP_US_PAPER_ENABLED === "true";

    const activeTab = ref("all");
    const autoTradeMarket = ref("KR");
    const holdingsByAccount = ref({
      general: [],
      isa: [],
      irp: [],
      stock: [],
    });
    // 각 계좌 패널의 최초 로드(holdings-changed) 완료 여부 — 종합 탭이
    // 로딩 중을 "보유 없음"으로 잘못 표시하지 않도록 AllAccountsPanel에 전달
    const accountStates = ref(Object.fromEntries(ACCOUNT_TAB_ORDER.map(id => [id, { status: 'loading' }])));
    const reloadVersions = ref(Object.fromEntries(ACCOUNT_TAB_ORDER.map(id => [id, 0])));
    const accountsLoading = computed(() => Object.values(accountStates.value).some(state => state.status === 'loading'));
    function onAccountState(id, state) { accountStates.value = { ...accountStates.value, [id]: state }; }
    function retryAccount(id) { reloadVersions.value[id] = (reloadVersions.value[id] || 0) + 1; }

    const manualAccounts = ref([]);
    const catalogLoading = ref(true), catalogError = ref(''), showAccountManager = ref(false);
    const brokerNames = { UNASSIGNED: '미지정', SAMSUNG: '삼성', SHINHAN: '신한', KIWOOM: '키움 수기', OTHER: '기타' };
    const accountDescriptors = computed(() => [...manualAccounts.value].sort((a, b) => {
      const rank = account => account.legacyType ? ACCOUNT_TAB_ORDER.indexOf(account.legacyType) : 99;
      return rank(a) - rank(b);
    }).map(account => {
      const id = account.legacyType || account.id;
      const base = ACCOUNT_CONFIGS[account.legacyType] || ACCOUNT_CONFIGS.stock;
      const label = `${brokerNames[account.broker] || '미지정'} · ${account.name}`;
      return { id, label, legacyType: account.legacyType, purpose: account.purpose, config: { ...base, label, tabLabel: label,
        apiPath: account.holdingsPath, storageKey: account.legacyType ? base.storageKey : null,
        displayCurrencyKey: `manual-account-${account.id}-currency`, sortKey: `manual-account-${account.id}-sort`, sortDirKey: `manual-account-${account.id}-direction`,
        allowCash: account.legacyType ? base.allowCash : true, isCustomAccount: !account.legacyType,
        emptyTitle: `${label} 보유 종목이 없습니다`, emptyDescription: '이 계좌에 보유한 종목과 수량을 직접 등록하세요.' } };
    }));
    const accountTabs = computed(() => accountDescriptors.value.map(account => ({ id: account.id, icon: '▤', label: account.label })));
    async function loadAccounts() {
      if (catalogLoading.value && manualAccounts.value.length) return;
      catalogLoading.value = true; catalogError.value = '';
      try {
        const { data } = await fetchPortfolioAccounts();
        if (!Array.isArray(data) || data.length === 0) throw new Error('Invalid manual account list');
        manualAccounts.value = data;
        const ids = new Set(accountDescriptors.value.map(account => account.id));
        accountStates.value = Object.fromEntries([...ids].map(id => [id, accountStates.value[id] || { status: 'loading' }]));
        holdingsByAccount.value = Object.fromEntries([...ids].map(id => [id, holdingsByAccount.value[id] || []]));
        const requested = normalizeTab(route.query.tab);
        if (VALID_TABS.value.includes(requested)) activeTab.value = requested;
      } catch { catalogError.value = '수기 계좌 목록을 확인하지 못했습니다. 전체 합계는 확인 후 표시합니다.'; }
      finally { catalogLoading.value = false; }
    }
    const tabs = computed(() => [
      { id: "all", icon: "🧮", label: "수기 합계" },
      ...accountTabs.value,
      { id: "heatmap", icon: "🗺️", label: "히트맵" },
      { id: "top10", icon: "🏆", label: "시총 top10" },
      { id: "news", icon: "📰", label: "뉴스" },
      // 자동매매(키움 실계좌)는 백엔드에서도 ADMIN 전용이라 탭 자체를 숨김
      ...(isAdmin.value ? [
        { id: "broker-accounts", icon: "🏦", label: "연결 계좌 현황" },
        ...(paperTradingEnabled ? [{ id: "paper-trade", icon: "🧪", label: "미국 모의매매" }] : []),
        { id: "auto-trade", icon: "🤖", label: "자동매매" },
      ] : []),
    ]);
    const VALID_TABS = computed(() => tabs.value.map((tab) => tab.id));
    const tabStrip = ref(null);
    const groups = computed(() => [
      { id: 'portfolio', label: '내 포트폴리오', tabs: ['all', ...accountDescriptors.value.map(account => account.id)], description: '증권사·계좌별로 직접 등록한 보유 기록입니다. 연결 계좌 잔고는 이 합계에 포함하지 않습니다.' },
      { id: 'market', label: '시장 정보', tabs: ['heatmap', 'top10', 'news'], description: '시장 흐름과 보유 종목 관련 뉴스를 확인하세요.' },
      ...(isAdmin.value ? [
        { id: 'accounts', label: '계좌 조회', tabs: ['broker-accounts'], description: '증권사별 조회 상태와 조회된 보유 내역을 확인합니다. 수기 기록과 별도로 표시합니다.' },
        { id: 'automation', label: '자동매매', tabs: ['auto-trade', ...(paperTradingEnabled ? ['paper-trade'] : [])], description: '키움 계좌의 운영 상태와 기존 주문 제어를 확인합니다. 국내와 미국의 시작·중지 범위는 각 버튼 안내를 확인하세요.' },
      ] : []),
    ]);
    const activeGroup = computed(() => groups.value.find(group => group.tabs.includes(activeTab.value)) || groups.value[0]);
    const visibleTabs = computed(() => tabs.value.filter(tab => activeGroup.value.tabs.includes(tab.id)));
    function revealActiveTab() {
      nextTick(() => tabStrip.value?.querySelector(`[data-tab="${activeTab.value}"]`)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }));
    }
    function moveTabFocus(event, id) {
      const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      const list = visibleTabs.value;
      const index = list.findIndex(tab => tab.id === id);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? list.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length;
      tabStrip.value?.querySelector(`[data-tab="${list[next].id}"]`)?.focus();
    }
    watch(() => route.query.tab, id => {
      const next = normalizeTab(id);
      if (VALID_TABS.value.includes(next)) activeTab.value = next;
      else activeTab.value = 'all';
    });
    watch(activeTab, revealActiveTab);


    const allHoldings = computed(() =>
      Object.values(holdingsByAccount.value).flat(),
    );

    function normalizeTab(id) {
      return id === "balance" ? "stock" : id;
    }

    function switchTab(id) {
      const nextTab = normalizeTab(id);
      if (!VALID_TABS.value.includes(nextTab)) return;
      activeTab.value = nextTab;
      router.replace({ query: { ...route.query, tab: nextTab } });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function onHoldingsChanged(accountType, list) {
      holdingsByAccount.value = {
        ...holdingsByAccount.value,
        [accountType]: list,
      };

    }

    // ── KRX Open API 상태 ─────────────────────────────────────
    const krxExpiryDate = ref(null);

    const krxDaysRemaining = computed(() => {
      if (!krxExpiryDate.value) return null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return Math.ceil((krxExpiryDate.value - today) / (1000 * 60 * 60 * 24));
    });
    const krxApiStatus = computed(() => {
      const d = krxDaysRemaining.value;
      if (d === null) return "unknown";
      if (d < 0) return "expired";
      if (d <= 30) return "warning";
      return "valid";
    });
    const krxApiStatusText = computed(() => {
      const d = krxDaysRemaining.value;
      if (d === null) return "확인 필요";
      if (d < 0) return "만료됨";
      if (d <= 30) return "만료 임박";
      return "정상";
    });
    const krxPeriodText = computed(() => {
      if (!krxExpiryDate.value) return "확인되지 않음";
      const fmt = (d) => `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
      const end = new Date(krxExpiryDate.value);
      const start = new Date(end);
      start.setFullYear(start.getFullYear() - 1);
      start.setDate(start.getDate() + 1);
      return `${fmt(start)} ~ ${fmt(end)}`;
    });

    onMounted(async () => {
      loadAccounts();
      const tabFromUrl = normalizeTab(route.query.tab);
      if (tabFromUrl && VALID_TABS.value.includes(tabFromUrl)) {
        activeTab.value = tabFromUrl;
      }
      try {
        const res = await axios.get("/api/stock/krx-config");
        if (res.data?.expiryDate) {
          const parsed = new Date(res.data.expiryDate + "T23:59:59");
          krxExpiryDate.value = Number.isNaN(parsed.getTime()) ? null : parsed;
        }
      } catch { /* 기본값 사용 */ }
    });

    return {
      manualAccounts, accountDescriptors, catalogLoading, catalogError, showAccountManager, loadAccounts,
      activeTab, groups, activeGroup, visibleTabs, tabStrip, moveTabFocus,
      autoTradeMarket,
      allHoldings,
      holdingsByAccount,
      accountsLoading, accountStates, reloadVersions, onAccountState, retryAccount,
      isAdmin,
      paperTradingEnabled,
      tabs,
      switchTab,
      onHoldingsChanged,
      krxDaysRemaining,
      krxApiStatus,
      krxApiStatusText,
      krxPeriodText,
    };
  },
};
</script>

<style src="@/assets/css/pages/stock.css" scoped></style>

<style src="@/assets/css/stock.css" scoped></style>

<style scoped>
.auto-market-tabs{display:flex;gap:8px;margin:0 0 14px;padding:5px;width:max-content;border:1px solid var(--card-border);border-radius:12px;background:var(--card-bg)}
.auto-market-tabs button{min-height:var(--control-height);padding:8px 18px;border:0;border-radius:8px;background:transparent;color:var(--text-muted);font-weight:700;cursor:pointer}
.auto-market-tabs button.active{background:var(--accent);color:var(--text-on-accent)}
</style>

<style scoped>
.manual-account-tools { margin: 12px 0 20px; }
.manual-account-tools button { min-height: 44px; padding: 10px 16px; border-radius: var(--radius-control); background: var(--card-bg); color: var(--accent); border: 1px solid var(--card-border); }
.manual-account-tools p { font-size: 13px; line-height: 1.7; color: var(--text-secondary); }
</style>
