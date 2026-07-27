<template>
  <div class="sj-container">
    <div class="page-header">
      <h2>사주</h2>
      <p class="page-subtitle">
        생년월일시로 사주팔자를 계산하고 AI가 해석해드립니다
      </p>
    </div>

    <div class="sj-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['sj-tab-btn', { active: activeTab === tab.id }]"
        @click="switchTab(tab.id)"
      >
        <span class="sj-tab-icon">{{ tab.icon }}</span>
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <div
      v-show="activeTab === 'view'"
      class="sj-tab-content"
    >
      <SajuPanel @saved-profile="onSavedProfile" />
    </div>

    <div
      v-show="activeTab === 'saved'"
      class="sj-tab-content"
    >
      <SavedProfilesPanel
        :active="activeTab === 'saved'"
        ref="savedRef"
      />
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import SajuPanel from "@/components/saju/SajuPanel.vue";
import SavedProfilesPanel from "@/components/saju/SavedProfilesPanel.vue";

export default {
  name: "SajuPage",
  components: { SajuPanel, SavedProfilesPanel },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const VALID_TABS = ["view", "saved"];

    const activeTab = ref("view");
    const savedRef = ref(null);

    const tabs = [
      { id: "view", icon: "🔮", label: "사주 보기" },
      { id: "saved", icon: "📜", label: "저장된 사주" },
    ];

    function switchTab(id) {
      activeTab.value = id;
      router.replace({ query: { ...route.query, tab: id } });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // 사주 보기 탭에서 새로 저장하면, 저장된 사주 탭의 목록만 다음 방문 때 최신으로 보이도록 새로고침
    function onSavedProfile() {
      savedRef.value?.reload?.();
    }

    onMounted(() => {
      const tabFromUrl = route.query.tab;
      if (tabFromUrl && VALID_TABS.includes(tabFromUrl)) {
        activeTab.value = tabFromUrl;
      }
    });

    return { activeTab, tabs, switchTab, savedRef, onSavedProfile };
  },
};
</script>

<style src="@/assets/css/pages/saju.css" scoped></style>
