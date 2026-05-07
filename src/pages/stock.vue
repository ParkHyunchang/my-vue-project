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
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <div v-show="activeTab === 'balance'" class="tab-content">
      <PortfolioPanel
        :active="activeTab === 'balance'"
        @holdings-changed="onHoldingsChanged"
      />
    </div>

    <div v-show="activeTab === 'heatmap'" class="tab-content">
      <HeatmapPanel :active="activeTab === 'heatmap'" />
    </div>

    <div v-show="activeTab === 'top10'" class="tab-content">
      <Top10Panel :active="activeTab === 'top10'" />
    </div>

    <div v-show="activeTab === 'news'" class="tab-content">
      <NewsPanel :active="activeTab === 'news'" :holdings="holdings" />
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import axios from "@/axios";
import PortfolioPanel from "@/components/stock/PortfolioPanel.vue";
import HeatmapPanel from "@/components/stock/HeatmapPanel.vue";
import Top10Panel from "@/components/stock/Top10Panel.vue";
import NewsPanel from "@/components/stock/NewsPanel.vue";

export default {
  name: "StockPage",
  components: { PortfolioPanel, HeatmapPanel, Top10Panel, NewsPanel },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const VALID_TABS = ["balance", "heatmap", "top10", "news"];

    const activeTab = ref("balance");
    const holdings = ref([]);

    const tabs = [
      { id: "balance", icon: "💰", label: "내 잔고" },
      { id: "heatmap", icon: "🗺️", label: "히트맵" },
      { id: "top10", icon: "🏆", label: "시총 Top 10" },
      { id: "news", icon: "📰", label: "주식 뉴스" },
    ];

    function switchTab(id) {
      activeTab.value = id;
      router.replace({ query: { ...route.query, tab: id } });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function onHoldingsChanged(list) {
      holdings.value = list;
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
      const tabFromUrl = route.query.tab;
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
      holdings,
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

<style scoped>
.krx-api-section {
  margin-bottom: 12px;
}
.krx-api-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  font-size: 13px;
  color: var(--text-muted);
}
.krx-api-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.krx-api-name {
  font-weight: 600;
  color: var(--text-primary);
}
.krx-status-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}
.krx-status-badge.api-status-valid    { background: #d1fae5; color: #065f46; }
.krx-status-badge.api-status-warning  { background: #fef3c7; color: #92400e; }
.krx-status-badge.api-status-expired  { background: #fee2e2; color: #991b1b; }
.krx-api-middle {
  display: flex;
  align-items: center;
  gap: 6px;
}
.krx-api-sep {
  color: var(--text-muted);
  opacity: 0.4;
}
.krx-days {
  font-weight: 600;
}
.krx-days.api-status-valid   { color: #059669; }
.krx-days.api-status-warning { color: #d97706; }
.krx-days.api-status-expired { color: #dc2626; }
.krx-renew-link {
  font-size: 12px;
  color: var(--text-muted);
  text-decoration: none;
  opacity: 0.7;
  transition: opacity 0.15s;
  white-space: nowrap;
}
.krx-renew-link:hover {
  opacity: 1;
  color: var(--text-primary);
}

.krx-alert-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  flex-wrap: wrap;
}
.krx-alert-warning {
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid rgba(251, 191, 36, 0.4);
  color: #b45309;
}
.krx-alert-expired {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #b91c1c;
}
.krx-alert-icon { font-size: 16px; flex-shrink: 0; }
.krx-alert-msg  { flex: 1; line-height: 1.4; }
.krx-alert-link {
  font-size: 12px;
  font-weight: 600;
  color: inherit;
  text-decoration: underline;
  white-space: nowrap;
  opacity: 0.85;
}
.krx-alert-link:hover { opacity: 1; }
</style>

<style src="@/assets/css/stock.css" scoped></style>
