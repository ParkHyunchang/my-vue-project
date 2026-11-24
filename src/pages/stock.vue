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
        <template v-else>KRX Open API 인증키가 <strong>D-{{ krxDaysRemaining }}</strong> 후 만료됩니다. 미리 갱신하세요.</template>
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
          <span :class="['krx-days', 'api-status-' + krxApiStatus]">D-{{ krxDaysRemaining }}</span>
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
    <BrokerAccountsPanel v-if="isAdmin && activeTab === 'broker-accounts'" />

    <div
      v-show="activeTab === 'all'"
      class="tab-content"
    >
      <AllAccountsPanel
        :active="activeTab === 'all'"
        :holdings-by-account="holdingsByAccount"
        :loading="accountsLoading"
      />
    </div>

    <div
      v-show="activeTab === 'stock'"
      class="tab-content"
    >
      <PortfolioPanel
        account-type="stock"
        :active="activeTab === 'stock'"
        @holdings-changed="onHoldingsChanged('stock', $event)"
      />
    </div>

    <div
      v-show="activeTab === 'isa'"
      class="tab-content"
    >
      <PortfolioPanel
        account-type="isa"
        :active="activeTab === 'isa'"
        @holdings-changed="onHoldingsChanged('isa', $event)"
      />
    </div>

    <div
      v-show="activeTab === 'general'"
      class="tab-content"
    >
      <PortfolioPanel
        account-type="general"
        :active="activeTab === 'general'"
        @holdings-changed="onHoldingsChanged('general', $event)"
      />
    </div>

    <div
      v-show="activeTab === 'irp'"
      class="tab-content"
    >
      <PortfolioPanel
        account-type="irp"
        :active="activeTab === 'irp'"
        @holdings-changed="onHoldingsChanged('irp', $event)"
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
  components: { BrokerAccountsPanel, PortfolioPanel, AllAccountsPanel, HeatmapPanel, Top10Panel, NewsPanel, KiwoomAutoTrade, KiwoomUsAutoTrade, UsPaperTradingPanel },
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
    const accountsLoaded = ref({
      general: false,
      isa: false,
      irp: false,
      stock: false,
    });
    const accountsLoading = computed(() =>
      Object.values(accountsLoaded.value).some((loaded) => !loaded),
    );

    const accountTabs = ACCOUNT_TAB_ORDER.map((accountType) => ({
      id: accountType,
      icon: ACCOUNT_CONFIGS[accountType].tabIcon,
      label: ACCOUNT_CONFIGS[accountType].tabLabel,
    }));
    const tabs = computed(() => [
      { id: "all", icon: "🧮", label: "수기 합계" },
      ...accountTabs,
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
      { id: 'portfolio', label: '내 포트폴리오', tabs: ['all', ...ACCOUNT_TAB_ORDER], description: '직접 등록한 장기·단기·ISA·IRP 보유 기록입니다. 연결 계좌 잔고는 이 합계에 포함하지 않습니다.' },
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
      accountsLoaded.value = {
        ...accountsLoaded.value,
        [accountType]: true,
      };
    }

    // ── KRX Open API 상태 ─────────────────────────────────────
    const krxExpiryDate = ref(new Date("2027-04-21T23:59:59"));

    const krxDaysRemaining = computed(() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return Math.ceil((krxExpiryDate.value - today) / (1000 * 60 * 60 * 24));
    });
    const krxApiStatus = computed(() => {
      const d = krxDaysRemaining.value;
      if (d < 0) return "expired";
      if (d <= 30) return "warning";
      return "valid";
    });
    const krxApiStatusText = computed(() => {
      const d = krxDaysRemaining.value;
      if (d < 0) return "만료됨";
      if (d <= 30) return "만료 임박";
      return "정상";
    });
    const krxPeriodText = computed(() => {
      const fmt = (d) => `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
      const end = new Date(krxExpiryDate.value);
      const start = new Date(end);
      start.setFullYear(start.getFullYear() - 1);
      start.setDate(start.getDate() + 1);
      return `${fmt(start)} ~ ${fmt(end)}`;
    });

    onMounted(async () => {
      const tabFromUrl = normalizeTab(route.query.tab);
      if (tabFromUrl && VALID_TABS.value.includes(tabFromUrl)) {
        activeTab.value = tabFromUrl;
      }
      try {
        const res = await axios.get("/api/stock/krx-config");
        if (res.data?.expiryDate) {
          krxExpiryDate.value = new Date(res.data.expiryDate + "T23:59:59");
        }
      } catch { /* 기본값 사용 */ }
    });

    return {
      activeTab, groups, activeGroup, visibleTabs, tabStrip, moveTabFocus,
      autoTradeMarket,
      allHoldings,
      holdingsByAccount,
      accountsLoading,
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
