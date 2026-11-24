<template>
  <div class="dating-container">
    <!--
      모바일 파일 업로드(파일 선택창) 복귀 시 대형 DOM(타임라인/필터/리스트)이 함께 리페인트되면
      모달 오버레이가 순간 흔들리며 "팝업↔메인"처럼 깜빡이는 체감이 생길 수 있음.
      모달이 떠있는 동안에는 배경 컨텐츠를 숨겨 페인트 자체를 줄여 안정화.
    -->
    <div
      v-show="!showMemoryModal"
      class="dating-page-content"
    >
      <div class="page-header">
        <h2>데이팅 히스토리</h2>
        <button
          v-if="canCreate"
          class="btn btn-primary"
          @click="openCreateModal"
        >
          새 추억 추가
        </button>
      </div>

      <form
        class="search-bar"
        @submit.prevent="applySearch"
      >
        <input
          v-model="searchInput"
          type="text"
          class="search-input"
          placeholder="제목, 설명, 장소 검색"
          aria-label="추억 검색"
          autocomplete="off"
        >
        <button
          v-if="searchInput"
          type="button"
          class="search-clear"
          aria-label="검색어 지우기"
          @click="clearSearch"
        >
          <i class="fas fa-times" />
        </button>
        <button
          type="submit"
          class="search-submit"
          aria-label="검색 실행"
        >
          <img
            src="@/assets/img/btn_search_01.png"
            alt="검색 아이콘"
            class="search-icon"
          >
        </button>
      </form>

      <DdayDisplay
        :memories="memories"
        @select="openMemoryDetail"
      />

      <TimelineFilter
        :categories="categories"
        :selected-category="selectedCategory"
        :media-filter-options="mediaFilterOptions"
        :media-filter="mediaFilter"
        @select-category="filterByCategory"
        @select-media="setMediaFilter"
      />

      <div class="record-toolbar">
        <label>연도
          <select v-model="selectedYear"><option value="">전체 연도</option><option
            v-for="year in availableYears"
            :key="year"
            :value="year"
          >{{ year }}년</option></select>
        </label>
        <label>정렬
          <select v-model="sortOrder"><option value="newest">최신 기록부터</option><option value="oldest">오래된 기록부터</option></select>
        </label>
      </div>
      <div
        class="record-results"
        aria-live="polite"
      >
        <span>총 {{ memories.length }}개 중 {{ processedMemories.length }}개</span>
        <button
          v-if="hasFilters"
          type="button"
          class="btn btn-secondary"
          @click="resetFilters"
        >
          조건 초기화
        </button>
      </div>
      <div
        v-if="loading"
        class="record-state"
        role="status"
      >
        기록을 불러오는 중입니다.
      </div>
      <div
        v-else-if="loadError"
        class="record-state"
        role="alert"
      >
        <p>{{ loadError }}</p><button
          type="button"
          class="btn btn-secondary"
          @click="fetchMemories"
        >
          다시 불러오기
        </button>
      </div>
      <TimelineList
        v-else
        :empty-message="hasFilters ? '조건에 맞는 기록이 없습니다. 검색어나 연도를 바꿔보세요.' : '아직 기록이 없습니다. 첫 기록을 남겨보세요.'"
        :items="processedMemories"
        :date-formatter="formatMemoryDate"
        :category-icon-getter="getCategoryIcon"
        @select="openMemoryDetail"
        @image-error="handleImageError"
        @image-load="handleImageLoad"
        @media-click="handleMediaClick"
      />
    </div>

    <MemoryFormModal
      :show="showMemoryModal"
      :memory="currentMemory"
      :is-editing="isEditing"
      :saving="saving"
      :is-view-mode="isViewMode"
      :categories="categories"
      :category-options="categoryOptions"
      @close="closeMemoryModal"
      @save="saveMemory"
      @request-delete="openDeleteModal"
      @enter-edit="enterEditMode"
      @open-lightbox="onOpenLightbox"
    />

    <teleport to="#modal">
      <DeleteModal
        v-if="showDeleteModal"
        title="추억 삭제"
        :busy="deleting"
        message="이 추억을 정말 삭제하시겠습니까?"
        @close="closeDeleteModal"
        @delete="deleteMemory"
      />
    </teleport>

    <Lightbox
      v-model="lightboxOpen"
      :items="lightboxItems"
      :initial-index="lightboxIndex"
    />
  </div>
</template>

<script>
import { ref, computed, watch } from "vue";
import { useStore } from "vuex";
import axios from "@/axios";
import { useTimelineBrowse } from "@/composables/useTimelineBrowse";
import { useTimelineSave } from "@/composables/useTimelineSave";
import DeleteModal from "@/components/DeleteModal.vue";
import TimelineFilter from "@/components/TimelineFilter.vue";
import TimelineList from "@/components/TimelineList.vue";
import Lightbox from "@/components/Lightbox.vue";
import DdayDisplay from "@/components/dating/DdayDisplay.vue";
import MemoryFormModal from "@/components/dating/MemoryFormModal.vue";
import { useToast } from "@/composables/toast";
import { useMediaUtils } from "@/composables/useMediaUtils";
import { apiErrorMessage } from "@/utils/apiError";

const CATEGORIES = [
  { id: "all", name: "전체", icon: "fas fa-list" },
  { id: "first_meet", name: "첫만남", icon: "fas fa-heart" },
  { id: "date", name: "데이트", icon: "fas fa-wine-glass-alt" },
  { id: "travel", name: "여행", icon: "fas fa-plane" },
  { id: "anniversary", name: "기념일", icon: "fas fa-calendar-heart" },
  { id: "gift", name: "선물", icon: "fas fa-gift" },
  { id: "special", name: "사귀기로한날", icon: "fas fa-star" },
  { id: "memory", name: "추억", icon: "fas fa-camera" },
];

const MEDIA_FILTER_OPTIONS = [
  { id: "all", label: "전체" },
  { id: "image", label: "이미지" },
  { id: "video", label: "동영상" },
];

export default {
  name: "DatingPage",
  components: {
    DeleteModal, TimelineFilter, TimelineList,
    Lightbox, DdayDisplay, MemoryFormModal,
  },
  setup() {
    const { showToast } = useToast();
    const { saving, save: persistRecord } = useTimelineSave("dating");
    const store = useStore();
    const { isVideoMedia, getImageUrl, parseImagesArray } = useMediaUtils();

    const memories = ref([]);
    const searchQuery = ref("");
    const searchInput = ref("");
    const selectedCategory = ref("all");
    const mediaFilter = ref("all");
    const loading = ref(false);
    const loadError = ref("");
    const deleting = ref(false);
    const { selectedYear, sortOrder, availableYears, hasFilters, resetFilters, arrange } = useTimelineBrowse(memories, searchInput, selectedCategory, mediaFilter, CATEGORIES);

    const showMemoryModal = ref(false);
    const isEditing = ref(false);
    const isViewMode = ref(false);
    const currentMemory = ref(null);

    const showDeleteModal = ref(false);
    const memoryToDelete = ref(null);

    const lightboxOpen = ref(false);
    const lightboxItems = ref([]);
    const lightboxIndex = ref(0);

    const canCreate = computed(() => store.getters["auth/canCreate"]("/dating"));

    const categories = CATEGORIES;
    const mediaFilterOptions = MEDIA_FILTER_OPTIONS;

    const categoryOptions = computed(() => {
      const hasFirstMeet = memories.value.some((m) => m.category === "first_meet" && m.id !== currentMemory.value?.id);
      const hasSpecial = memories.value.some((m) => m.category === "special" && m.id !== currentMemory.value?.id);
      return categories.filter((cat) => {
        if (cat.id === "all") return false;
        if (cat.id === "first_meet" && hasFirstMeet) return false;
        if (cat.id === "special" && hasSpecial) return false;
        return true;
      });
    });

    const fetchMemories = async () => {
      loading.value = true;
      loadError.value = "";
      try {
        const response = await axios.get("/api/dating");
        memories.value = response.data.map((memory) => ({
          ...memory,
          images: parseImagesArray(memory),
        }));
      } catch (err) {
        loadError.value = apiErrorMessage(err, "기록을 불러오지 못했습니다.");
      } finally {
        loading.value = false;
      }
    };

    const openCreateModal = () => {
      isEditing.value = false;
      isViewMode.value = false;
      currentMemory.value = null;
      showMemoryModal.value = true;
    };

    const openMemoryDetail = (memory) => {
      isEditing.value = true;
      isViewMode.value = true;
      currentMemory.value = memory;
      showMemoryModal.value = true;
    };

    const closeMemoryModal = () => {
      showMemoryModal.value = false;
      isViewMode.value = false;
      currentMemory.value = null;
    };

    const enterEditMode = () => { isViewMode.value = false; };

    const saveMemory = async (memoryData, removedMedia = []) => {
      try {
        const result = await persistRecord(memoryData, isEditing.value, removedMedia);
        if (!result) return;
        showToast(isEditing.value ? "추억이 수정되었습니다." : "추억이 생성되었습니다.");
        if (result.cleanupFailed) {
          showToast("기록은 저장됐지만 일부 미디어 파일 정리에 실패했습니다.", "warning");
        }
        closeMemoryModal();
        await fetchMemories();
      } catch (err) {
        showToast(
          apiErrorMessage(
            err,
            isEditing.value ? "추억 수정에 실패했습니다." : "추억 생성에 실패했습니다.",
          ),
          "danger",
        );
      }
    };

    const openDeleteModal = (memory) => {
      memoryToDelete.value = memory;
      showMemoryModal.value = false;
      showDeleteModal.value = true;
    };

    const closeDeleteModal = () => {
      showDeleteModal.value = false;
      memoryToDelete.value = null;
    };

    const deleteMemory = async () => {
      if (deleting.value) return;
      deleting.value = true;
      try {
        await axios.delete(`/api/dating/${memoryToDelete.value.id}`);
        closeDeleteModal();
        await fetchMemories();
        showToast("추억이 삭제되었습니다.");
      } catch (err) {
        showToast(apiErrorMessage(err, "추억 삭제에 실패했습니다."), "danger");
      } finally {
        deleting.value = false;
      }
    };

    const filterByCategory = (categoryId) => { selectedCategory.value = categoryId; };
    const setMediaFilter = (type) => { mediaFilter.value = type; };

    const formatDate = (date) => {
      if (!date) return "";
      const s = String(date);
      const d = s.length === 10 ? new Date(`${s}T00:00:00`) : new Date(s);
      d.setHours(0, 0, 0, 0);
      return d.toLocaleDateString("ko-KR", {
        year: "numeric", month: "long", day: "numeric",
      });
    };

    const formatMemoryDate = (memory) => {
      if (memory.dateType === "range" && memory.startDate && memory.endDate) {
        return `${formatDate(memory.startDate)} ~ ${formatDate(memory.endDate)}`;
      }
      return formatDate(memory.date);
    };

    const getCategoryIcon = (categoryId) => {
      const c = categories.find((cat) => cat.id === categoryId);
      return c ? c.icon : "fas fa-heart";
    };

    const processedMemories = computed(() => {
      const query = searchQuery.value.trim().toLowerCase();
      let filtered = memories.value;
      if (selectedCategory.value !== "all") {
        filtered = filtered.filter((m) => m.category === selectedCategory.value);
      }
      if (query) {
        filtered = filtered.filter((m) => {
          const target = [m.title, m.description, m.location]
            .filter(Boolean).join(" ").toLowerCase();
          return target.includes(query);
        });
      }

      const processed = filtered.map((memory) => {
        const mediaList = parseImagesArray(memory);
        const processedMedia = mediaList
          .map((mediaItem, index) => {
            const url = getImageUrl(mediaItem);
            if (!url) return null;
            return { url, isVideo: isVideoMedia(mediaItem), originalIndex: index };
          })
          .filter(Boolean);

        const videoCount = processedMedia.filter((m) => m.isVideo).length;
        const imageCount = processedMedia.length - videoCount;
        const firstVideo = processedMedia.find((m) => m.isVideo);

        return {
          ...memory,
          processedMedia,
          imageCount,
          videoCount,
          totalMediaCount: processedMedia.length,
          firstVideoIndex: firstVideo ? firstVideo.originalIndex : -1,
        };
      });

      if (mediaFilter.value === "image") return arrange(processed.filter((m) => m.imageCount > 0));
      if (mediaFilter.value === "video") return arrange(processed.filter((m) => m.videoCount > 0));
      return arrange(processed);
    });

    const applySearch = () => { searchQuery.value = searchInput.value.trim(); };
    const clearSearch = () => { searchInput.value = ""; searchQuery.value = ""; };
    watch(searchInput, (val) => { searchQuery.value = val.trim(); }, { immediate: true });

    const handleImageError = (event) => { event.target.style.display = "none"; };
    const handleImageLoad = (event) => { event.target.style.display = "block"; };

    const onOpenLightbox = ({ items, index }) => {
      lightboxItems.value = items;
      lightboxIndex.value = index;
      lightboxOpen.value = true;
    };

    const handleMediaClick = ({ item, mediaIdx }) => {
      lightboxItems.value = item.processedMedia;
      lightboxIndex.value = mediaIdx;
      lightboxOpen.value = true;
    };

    fetchMemories();

    return {
      saving, loading, loadError, deleting, fetchMemories,
      selectedYear, sortOrder, availableYears, hasFilters, resetFilters,
      memories,
      searchInput,
      categories, mediaFilterOptions,
      selectedCategory, mediaFilter,
      processedMemories, categoryOptions,
      showMemoryModal, isEditing, isViewMode, currentMemory,
      showDeleteModal,
      lightboxOpen, lightboxItems, lightboxIndex,
      canCreate,
      openCreateModal, openMemoryDetail, closeMemoryModal, enterEditMode,
      saveMemory, openDeleteModal, closeDeleteModal, deleteMemory,
      filterByCategory, setMediaFilter,
      formatMemoryDate, getCategoryIcon,
      applySearch, clearSearch,
      handleImageError, handleImageLoad,
      onOpenLightbox, handleMediaClick,
    };
  },
};
</script>

<style src="@/assets/css/dating.css" scoped></style>
