<template>
  <div class="history-container">
    <!--
      모바일 파일 업로드(파일 선택창) 복귀 시 대형 DOM(타임라인/필터/리스트)이 함께 리페인트되면
      모달 오버레이가 순간 흔들리며 "팝업↔메인"처럼 깜빡이는 체감이 생길 수 있음.
      모달이 떠있는 동안에는 배경 컨텐츠를 숨겨 페인트 자체를 줄여 안정화.
    -->
    <div v-show="!showEventModal" class="history-page-content">
      <div class="page-header">
        <h2>My History</h2>
        <button class="btn btn-primary" @click="openCreateModal">
          Add New Event
        </button>
      </div>

      <form class="search-bar" @submit.prevent="applySearch">
        <input
          v-model="searchInput"
          type="text"
          class="search-input"
          placeholder="제목, 설명, 장소 검색"
          aria-label="History search"
          autocomplete="off"
        />
        <button type="submit" class="search-submit" aria-label="검색 실행">
          <img
            src="@/assets/img/btn_search_01.png"
            alt="검색 아이콘"
            class="search-icon"
          />
        </button>
      </form>

      <TimelineFilter
        :categories="categories"
        :selected-category="selectedCategory"
        :media-filter-options="mediaFilterOptions"
        :media-filter="mediaFilter"
        @select-category="filterByCategory"
        @select-media="setMediaFilter"
      />

      <TimelineList
        :items="processedEvents"
        :date-formatter="formatEventDate"
        :category-icon-getter="getCategoryIcon"
        @select="openEventDetail"
        @delete="openDeleteModal"
        @image-error="handleImageError"
        @image-load="handleImageLoad"
        @media-click="handleMediaClick"
      />
    </div>

    <EventFormModal
      :show="showEventModal"
      :event="currentEvent"
      :is-editing="isEditing"
      :category-options="categoryOptions"
      @close="closeEventModal"
      @save="saveEvent"
      @request-delete="openDeleteModal"
    />

    <teleport to="#modal">
      <DeleteModal
        v-if="showDeleteModal"
        title="이벤트 삭제"
        message="이 이벤트를 정말 삭제하시겠습니까?"
        @close="closeDeleteModal"
        @delete="deleteEvent"
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
import axios from "@/axios";
import DeleteModal from "@/components/DeleteModal.vue";
import TimelineFilter from "@/components/TimelineFilter.vue";
import TimelineList from "@/components/TimelineList.vue";
import Lightbox from "@/components/Lightbox.vue";
import EventFormModal from "@/components/history/EventFormModal.vue";
import { useToast } from "@/composables/toast";
import { useMediaUtils } from "@/composables/useMediaUtils";

const CATEGORIES = [
  { id: "all", name: "전체", icon: "fas fa-list" },
  { id: "travel", name: "여행", icon: "fas fa-plane" },
  { id: "education", name: "교육", icon: "fas fa-graduation-cap" },
  { id: "move", name: "이사", icon: "fas fa-home" },
  { id: "work", name: "일", icon: "fas fa-briefcase" },
  { id: "record", name: "기록", icon: "fas fa-trophy" },
];

const MEDIA_FILTER_OPTIONS = [
  { id: "all", label: "전체" },
  { id: "image", label: "이미지" },
  { id: "video", label: "동영상" },
];

const parseImagesFromEvent = (event) => {
  if (event.images && typeof event.images === "string") {
    try { return JSON.parse(event.images); } catch { return event.image ? [event.image] : []; }
  }
  if (Array.isArray(event.images)) return event.images;
  return event.image ? [event.image] : [];
};

export default {
  name: "HistoryPage",
  components: { DeleteModal, TimelineFilter, TimelineList, Lightbox, EventFormModal },
  setup() {
    const { showToast } = useToast();
    const { isVideoMedia, getImageUrl: getMediaUrl } = useMediaUtils();

    const events = ref([]);
    const searchQuery = ref("");
    const searchInput = ref("");
    const selectedCategory = ref("all");
    const mediaFilter = ref("all");

    const showEventModal = ref(false);
    const isEditing = ref(false);
    const currentEvent = ref(null);

    const showDeleteModal = ref(false);
    const eventToDelete = ref(null);

    const lightboxOpen = ref(false);
    const lightboxItems = ref([]);
    const lightboxIndex = ref(0);

    const categories = CATEGORIES;
    const mediaFilterOptions = MEDIA_FILTER_OPTIONS;
    const categoryOptions = categories.filter((cat) => cat.id !== "all");

    const filteredEvents = computed(() => {
      if (selectedCategory.value === "all") return events.value;
      return events.value.filter((e) => e.category === selectedCategory.value);
    });

    const processedEvents = computed(() => {
      const query = searchQuery.value.trim().toLowerCase();
      let toProcess = filteredEvents.value;

      if (query) {
        toProcess = toProcess.filter((event) => {
          const target = [event.title, event.description, event.location]
            .filter(Boolean).join(" ").toLowerCase();
          return target.includes(query);
        });
      }

      const processed = toProcess.map((event) => {
        const mediaList = Array.isArray(event.images)
          ? event.images
          : event.image
          ? [event.image]
          : [];
        const processedMedia = mediaList
          .map((mediaItem, index) => {
            const url = getMediaUrl(mediaItem);
            if (!url) return null;
            return { url, isVideo: isVideoMedia(mediaItem), originalIndex: index };
          })
          .filter(Boolean);

        const videoCount = processedMedia.filter((m) => m.isVideo).length;
        const imageCount = processedMedia.length - videoCount;
        const firstVideo = processedMedia.find((m) => m.isVideo);

        return {
          ...event,
          processedMedia,
          imageCount,
          videoCount,
          totalMediaCount: processedMedia.length,
          firstVideoIndex: firstVideo ? firstVideo.originalIndex : -1,
        };
      });

      if (mediaFilter.value === "image") return processed.filter((e) => e.imageCount > 0);
      if (mediaFilter.value === "video") return processed.filter((e) => e.videoCount > 0);
      return processed;
    });

    const fetchEvents = async () => {
      try {
        const response = await axios.get("/histories");
        events.value = response.data.map((event) => ({
          ...event,
          images: parseImagesFromEvent(event),
        }));
      } catch {
        showToast("Failed to load events", "danger");
      }
    };

    const openCreateModal = () => {
      isEditing.value = false;
      currentEvent.value = null;
      showEventModal.value = true;
    };

    const openEventDetail = (event) => {
      isEditing.value = true;
      currentEvent.value = event;
      showEventModal.value = true;
    };

    const closeEventModal = () => {
      showEventModal.value = false;
      currentEvent.value = null;
    };

    const saveEvent = async (eventData) => {
      try {
        if (isEditing.value) {
          await axios.put(`/histories/${eventData.id}`, eventData);
          showToast("이벤트가 수정되었습니다.");
        } else {
          await axios.post("/histories", eventData);
          showToast("이벤트가 생성되었습니다.");
        }
        await fetchEvents();
        closeEventModal();
      } catch {
        showToast(
          isEditing.value ? "이벤트 수정에 실패했습니다." : "이벤트 생성에 실패했습니다.",
          "danger",
        );
      }
    };

    const openDeleteModal = (event) => {
      eventToDelete.value = event;
      showEventModal.value = false;
      showDeleteModal.value = true;
    };

    const closeDeleteModal = () => {
      showDeleteModal.value = false;
      eventToDelete.value = null;
    };

    const deleteEvent = async () => {
      try {
        await axios.delete(`/histories/${eventToDelete.value.id}`);
        closeDeleteModal();
        await fetchEvents();
        showToast("이벤트가 삭제되었습니다.");
      } catch {
        showToast("이벤트 삭제에 실패했습니다.", "danger");
      }
    };

    const filterByCategory = (categoryId) => {
      selectedCategory.value =
        selectedCategory.value === categoryId ? null : categoryId;
    };
    const setMediaFilter = (type) => { mediaFilter.value = type; };

    const formatDate = (date) => {
      return new Date(date).toLocaleDateString("ko-KR", {
        year: "numeric", month: "long", day: "numeric",
      });
    };

    const formatEventDate = (event) => {
      if (event.dateType === "range" && event.startDate && event.endDate) {
        return `${formatDate(event.startDate)} ~ ${formatDate(event.endDate)}`;
      }
      return formatDate(event.date);
    };

    const getCategoryIcon = (categoryId) => {
      const c = categories.find((cat) => cat.id === categoryId);
      return c ? c.icon : "fas fa-calendar";
    };

    const applySearch = () => { searchQuery.value = searchInput.value.trim(); };
    watch(searchInput, (val) => { searchQuery.value = val.trim(); });

    const handleImageError = (event) => { event.target.style.display = "none"; };
    const handleImageLoad = (event) => { event.target.style.display = "block"; };

    const handleMediaClick = ({ item, mediaIdx }) => {
      lightboxItems.value = item.processedMedia;
      lightboxIndex.value = mediaIdx;
      lightboxOpen.value = true;
    };

    fetchEvents();

    return {
      events,
      searchInput,
      categories, mediaFilterOptions, categoryOptions,
      selectedCategory, mediaFilter,
      processedEvents,
      showEventModal, isEditing, currentEvent,
      showDeleteModal,
      lightboxOpen, lightboxItems, lightboxIndex,
      openCreateModal, openEventDetail, closeEventModal, saveEvent,
      openDeleteModal, closeDeleteModal, deleteEvent,
      filterByCategory, setMediaFilter,
      formatEventDate, getCategoryIcon,
      applySearch,
      handleImageError, handleImageLoad,
      handleMediaClick,
    };
  },
};
</script>

<style src="@/assets/css/history.css" scoped></style>
