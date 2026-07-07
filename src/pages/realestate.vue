<template>
  <div class="re-container">
    <div class="page-header">
      <h2>부동산</h2>
      <p class="page-subtitle">
        아파트·토지 실거래가 · 시세 · 뉴스 (국토교통부 공개데이터)
      </p>
    </div>

    <!-- API 미설정 안내 -->
    <div
      v-if="configured === false"
      class="re-config-alert"
    >
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

    <div
      v-show="activeTab === 'search'"
      class="re-tab-content"
    >
      <SearchPanel />
    </div>

    <div
      v-show="activeTab === 'holdings'"
      class="re-tab-content"
    >
      <PropertyPanel :active="activeTab === 'holdings'" />
    </div>

    <div
      v-show="activeTab === 'news'"
      class="re-tab-content"
    >
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

<style src="@/assets/css/pages/realestate.css" scoped></style>
