<template>
  <div class="re-container">
    <div class="page-header">
      <h2>부동산</h2>
      <p class="page-subtitle">아파트 실거래가 · 시세 · 뉴스 (국토교통부 공개데이터)</p>
    </div>

    <!-- API 미설정 안내 -->
    <div v-if="configured === false" class="re-config-alert">
      <span class="re-config-icon">⚠️</span>
      <span>
        부동산 실거래가 API 키가 설정되지 않았습니다.
        서버 환경변수 <code>REALESTATE_API_KEY</code> 를 설정하면 검색이 활성화됩니다.
      </span>
    </div>

    <!-- 탭 (1단계: 검색만. 보유 부동산/뉴스는 2단계 예정) -->
    <div class="re-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['re-tab-btn', { active: activeTab === tab.id }]"
        @click="switchTab(tab.id)"
      >
        <span class="re-tab-icon">{{ tab.icon }}</span>
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <div v-show="activeTab === 'search'" class="re-tab-content">
      <SearchPanel />
    </div>

    <div v-show="activeTab === 'holdings'" class="re-tab-content">
      <PropertyPanel :active="activeTab === 'holdings'" />
    </div>

    <div v-show="activeTab === 'news'" class="re-tab-content">
      <NewsPanel :active="activeTab === 'news'" />
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import axios from "@/axios";
import SearchPanel from "@/components/realestate/SearchPanel.vue";
import PropertyPanel from "@/components/realestate/PropertyPanel.vue";
import NewsPanel from "@/components/realestate/NewsPanel.vue";

export default {
  name: "RealEstatePage",
  components: { SearchPanel, PropertyPanel, NewsPanel },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const VALID_TABS = ["search", "holdings", "news"];

    const activeTab = ref("search");
    const configured = ref(null);

    const tabs = [
      { id: "search", icon: "🔍", label: "실거래가 검색" },
      { id: "holdings", icon: "🏠", label: "보유 부동산" },
      { id: "news", icon: "📰", label: "부동산 뉴스" },
    ];

    function switchTab(id) {
      activeTab.value = id;
      router.replace({ query: { ...route.query, tab: id } });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    onMounted(async () => {
      const tabFromUrl = route.query.tab;
      if (tabFromUrl && VALID_TABS.includes(tabFromUrl)) {
        activeTab.value = tabFromUrl;
      }
      try {
        const res = await axios.get("/api/realestate/config");
        configured.value = res.data?.configured ?? null;
      } catch {
        /* 무시 */
      }
    });

    return { activeTab, configured, tabs, switchTab };
  },
};
</script>

<style scoped>
.re-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
@media (max-width: 640px) {
  .re-container { padding: 16px; }
}
.page-header { margin-bottom: 16px; }
.page-header h2 { margin: 0 0 4px; font-size: 22px; color: var(--text-primary); }
.page-subtitle { margin: 0; font-size: 13px; color: var(--text-muted); }

.re-config-alert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 14px;
  font-size: 13px;
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid rgba(251, 191, 36, 0.4);
  color: #b45309;
}
.re-config-icon { font-size: 16px; }
.re-config-alert code {
  background: rgba(0, 0, 0, 0.06);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.re-tabs { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
.re-tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--text-muted);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.re-tab-btn.active {
  background: #6366f1;
  border-color: #6366f1;
  color: #fff;
}
.re-tab-icon { font-size: 15px; }
</style>
