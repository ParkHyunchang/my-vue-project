<template>
  <div class="tv-container">
    <div class="page-header">
      <h2>여행</h2>
      <p class="page-subtitle">AI 여행 플래너 · 예정 일정 · 다녀온 곳 · 버킷리스트</p>
    </div>

    <div class="tv-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tv-tab-btn', { active: activeTab === tab.id }]"
        @click="switchTab(tab.id)"
      >
        <span class="tv-tab-icon">{{ tab.icon }}</span>
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <div v-show="activeTab === 'planner'" class="tv-tab-content">
      <PlannerPanel @add-to-wishlist="onAddedToWishlist" @saved-itinerary="onSavedItinerary" />
    </div>

    <div v-show="activeTab === 'itinerary'" class="tv-tab-content">
      <ItineraryPanel :active="activeTab === 'itinerary'" ref="itineraryRef" />
    </div>

    <div v-show="activeTab === 'visited'" class="tv-tab-content">
      <VisitedPanel :active="activeTab === 'visited'" />
    </div>

    <div v-show="activeTab === 'wishlist'" class="tv-tab-content">
      <WishlistPanel :active="activeTab === 'wishlist'" ref="wishlistRef" />
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import PlannerPanel from "@/components/travel/PlannerPanel.vue";
import ItineraryPanel from "@/components/travel/ItineraryPanel.vue";
import VisitedPanel from "@/components/travel/VisitedPanel.vue";
import WishlistPanel from "@/components/travel/WishlistPanel.vue";

export default {
  name: "TravelPage",
  components: { PlannerPanel, ItineraryPanel, VisitedPanel, WishlistPanel },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const VALID_TABS = ["planner", "itinerary", "visited", "wishlist"];

    const activeTab = ref("planner");
    const wishlistRef = ref(null);
    const itineraryRef = ref(null);

    const tabs = [
      { id: "planner", icon: "🤖", label: "AI 플래너" },
      { id: "itinerary", icon: "📅", label: "예정 일정" },
      { id: "visited", icon: "🗺️", label: "다녀온 곳" },
      { id: "wishlist", icon: "⭐", label: "버킷리스트" },
    ];

    function switchTab(id) {
      activeTab.value = id;
      router.replace({ query: { ...route.query, tab: id } });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // AI 플래너에서 버킷리스트로 담으면, 위시리스트 탭으로 이동시켜 결과를 보여준다.
    function onAddedToWishlist() {
      switchTab("wishlist");
      wishlistRef.value?.reload?.();
    }

    // AI 플래너 결과를 예정 일정으로 저장하면, 예정 일정 탭으로 이동시켜 편집을 유도한다.
    function onSavedItinerary() {
      switchTab("itinerary");
      itineraryRef.value?.reload?.();
    }

    onMounted(() => {
      const tabFromUrl = route.query.tab;
      if (tabFromUrl && VALID_TABS.includes(tabFromUrl)) {
        activeTab.value = tabFromUrl;
      }
    });

    return { activeTab, tabs, switchTab, wishlistRef, itineraryRef, onAddedToWishlist, onSavedItinerary };
  },
};
</script>

<style scoped>
.tv-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
@media (max-width: 640px) {
  .tv-container { padding: 16px; }
}
.page-header { margin-bottom: 16px; }
.page-header h2 { margin: 0 0 4px; font-size: 22px; color: var(--text-primary); }
.page-subtitle { margin: 0; font-size: 13px; color: var(--text-muted); }

.tv-tabs { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
.tv-tab-btn {
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
.tv-tab-btn.active {
  background: #6366f1;
  border-color: #6366f1;
  color: #fff;
}
.tv-tab-icon { font-size: 15px; }
</style>
