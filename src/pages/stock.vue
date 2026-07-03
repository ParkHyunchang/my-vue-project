<template>
  <div class="stock-container">
    <div class="page-header">
      <h2>주식 대시보드</h2>
      <p class="page-subtitle">실시간 시장 데이터 · 포트폴리오 현황</p>
    </div>

    <!-- KRX 만료 임박/만료 알림 배너 -->
    <div v-if="krxApiStatus !== 'valid'" :class="['krx-alert-banner', 'krx-alert-' + krxApiStatus]">
      <span class="krx-alert-icon">{{ krxApiStatus === 'expired' ? '🚨' : '⚠️' }}</span>
      <span class="krx-alert-msg">
        <template v-if="krxApiStatus === 'expired'">KRX Open API 인증키가 <strong>만료</strong>되었습니다. 국내 주식 데이터가 정상적으로 표시되지 않을 수 있습니다.</template>
        <template v-else>KRX Open API 인증키가 <strong>D-{{ krxDaysRemaining }}</strong> 후 만료됩니다. 미리 갱신하세요.</template>
      </span>
      <a href="https://openapi.krx.co.kr/contents/OPP/MYPG/mypage/OPPMYPG002.cmd" target="_blank" rel="noopener" class="krx-alert-link">인증키 갱신 →</a>
    </div>

    <!-- KRX Open API 현황 -->
    <div class="krx-api-section">
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
    </div>

    <!-- 탭 네비게이션 -->
    <div class="stock-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab-btn', { active: activeTab === tab.id }]"
        @click="switchTab(tab.id)"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <div v-show="activeTab === 'all'" class="tab-content">
      <AllAccountsPanel
        :active="activeTab === 'all'"
        :holdings-by-account="holdingsByAccount"
      />
    </div>

    <div v-show="activeTab === 'stock'" class="tab-content">
      <PortfolioPanel
        account-type="stock"
        :active="activeTab === 'stock'"
        @holdings-changed="onHoldingsChanged('stock', $event)"
      />
    </div>

    <div v-show="activeTab === 'isa'" class="tab-content">
      <PortfolioPanel
        account-type="isa"
        :active="activeTab === 'isa'"
        @holdings-changed="onHoldingsChanged('isa', $event)"
      />
    </div>

    <div v-show="activeTab === 'general'" class="tab-content">
      <PortfolioPanel
        account-type="general"
        :active="activeTab === 'general'"
        @holdings-changed="onHoldingsChanged('general', $event)"
      />
    </div>

    <div v-show="activeTab === 'irp'" class="tab-content">
      <PortfolioPanel
        account-type="irp"
        :active="activeTab === 'irp'"
        @holdings-changed="onHoldingsChanged('irp', $event)"
      />
    </div>

    <div v-show="activeTab === 'heatmap'" class="tab-content">
      <HeatmapPanel :active="activeTab === 'heatmap'" />
    </div>

    <div v-show="activeTab === 'top10'" class="tab-content">
      <Top10Panel :active="activeTab === 'top10'" />
    </div>

    <div v-show="activeTab === 'news'" class="tab-content">
      <NewsPanel :active="activeTab === 'news'" :holdings="allHoldings" />
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import axios from "@/axios";
import PortfolioPanel from "@/components/stock/PortfolioPanel.vue";
import AllAccountsPanel from "@/components/stock/AllAccountsPanel.vue";
import HeatmapPanel from "@/components/stock/HeatmapPanel.vue";
import Top10Panel from "@/components/stock/Top10Panel.vue";
import NewsPanel from "@/components/stock/NewsPanel.vue";
import { ACCOUNT_CONFIGS, ACCOUNT_TAB_ORDER } from "@/config/stockAccounts";

export default {
  name: "StockPage",
  components: { PortfolioPanel, AllAccountsPanel, HeatmapPanel, Top10Panel, NewsPanel },
  setup() {
    const route = useRoute();
    const router = useRouter();

    const activeTab = ref("all");
    const holdingsByAccount = ref({
      general: [],
      isa: [],
      irp: [],
      stock: [],
    });

    const accountTabs = ACCOUNT_TAB_ORDER.map((accountType) => ({
      id: accountType,
      icon: ACCOUNT_CONFIGS[accountType].tabIcon,
      label: ACCOUNT_CONFIGS[accountType].tabLabel,
    }));
    const tabs = [
      { id: "all", icon: "🧮", label: "종합" },
      ...accountTabs,
      { id: "heatmap", icon: "🗺️", label: "히트맵" },
      { id: "top10", icon: "🏆", label: "시총 top10" },
      { id: "news", icon: "📰", label: "뉴스" },
    ];
    const VALID_TABS = tabs.map((tab) => tab.id);

    const allHoldings = computed(() =>
      Object.values(holdingsByAccount.value).flat(),
    );

    function normalizeTab(id) {
      return id === "balance" ? "stock" : id;
    }

    function switchTab(id) {
      const nextTab = normalizeTab(id);
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
      if (tabFromUrl && VALID_TABS.includes(tabFromUrl)) {
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
      activeTab,
      allHoldings,
      holdingsByAccount,
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
