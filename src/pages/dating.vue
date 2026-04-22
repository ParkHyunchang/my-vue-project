<template>
  <div class="dating-container">
    <!--
      모바일 파일 업로드(파일 선택창) 복귀 시 대형 DOM(타임라인/필터/리스트)이 함께 리페인트되면
      모달 오버레이가 순간 흔들리며 "팝업↔메인"처럼 깜빡이는 체감이 생길 수 있음.
      모달이 떠있는 동안에는 배경 컨텐츠를 숨겨 페인트 자체를 줄여 안정화.
    -->
    <div class="dating-page-content" v-show="!showMemoryModal">
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

      <form class="search-bar" @submit.prevent="applySearch">
        <input
          v-model="searchInput"
          type="text"
          class="search-input"
          placeholder="제목, 설명, 장소 검색"
          aria-label="Dating search"
          autocomplete="off"
        />
        <button
          v-if="searchInput"
          type="button"
          class="search-clear"
          @click="clearSearch"
          aria-label="검색어 지우기"
        >
          <i class="fas fa-times"></i>
        </button>
        <button type="submit" class="search-submit" aria-label="검색 실행">
          <img
            src="@/assets/img/btn_search_01.png"
            alt="검색 아이콘"
            class="search-icon"
          />
        </button>
      </form>

      <!-- 디데이 표시 섹션 -->
      <div class="dday-section" v-if="firstMeetDate || specialDate">
        <div class="dday-container">
          <div v-if="firstMeetDate" class="dday-item">
            <div class="dday-label">
              <i class="fas fa-heart"></i>
              첫만남
            </div>
            <div class="dday-value">D+{{ firstMeetDays }}</div>
            <div class="dday-date">
              <template v-if="firstMeetEndDate">
                <span>{{ formatDate(firstMeetDate) }}</span>
                <span>~ {{ formatDate(firstMeetEndDate) }}</span>
              </template>
              <span v-else>{{ formatDate(firstMeetDate) }}</span>
            </div>
          </div>
          <div v-if="specialDate" class="dday-item">
            <div class="dday-label">
              <i class="fas fa-star"></i>
              사귄날
            </div>
            <div class="dday-value">D+{{ specialDays }}</div>
            <div class="dday-date">
              <template v-if="specialEndDate">
                <span>{{ formatDate(specialDate) }}</span>
                <span>~ {{ formatDate(specialEndDate) }}</span>
              </template>
              <span v-else>{{ formatDate(specialDate) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 타임라인 필터 -->
      <TimelineFilter
        :categories="categories"
        :selected-category="selectedCategory"
        :media-filter-options="mediaFilterOptions"
        :media-filter="mediaFilter"
        @select-category="filterByCategory"
        @select-media="setMediaFilter"
      />

      <!-- 타임라인 -->
      <TimelineList
        :items="processedMemories"
        :date-formatter="formatMemoryDate"
        :category-icon-getter="getCategoryIcon"
        @select="openMemoryDetail"
        @image-error="handleImageError"
        @image-load="handleImageLoad"
        @media-click="handleMediaClick"
      />
    </div>

    <!-- 추억 생성/수정 모달 -->
    <teleport to="#modal">
      <Modal
        v-if="showMemoryModal"
        :close-on-backdrop="!modalLock"
        :close-on-esc="!modalLock"
        :close-disabled="modalLock"
        :busy="isMobileLike && (uploading || postUploadSettling)"
        :busy-text="'업로드 중...'"
        @close="requestCloseMemoryModal"
      >
        <template #header>
          <h3>{{ isViewMode ? currentMemory.title : (isEditing ? "추억 수정" : "새 추억 추가") }}</h3>
        </template>
        <template #body>
          <!-- 조회 모드 -->
          <div v-if="isViewMode" class="memory-view">
            <div class="view-row">
              <span class="view-label">날짜</span>
              <span class="view-value">{{ formatMemoryDate(currentMemory) }}</span>
            </div>
            <div class="view-row">
              <span class="view-label">카테고리</span>
              <span class="view-value">
                <i :class="getCategoryIcon(currentMemory.category)"></i>
                {{ getCategoryName(currentMemory.category) }}
              </span>
            </div>
            <div v-if="currentMemory.description" class="view-row">
              <span class="view-label">설명</span>
              <span class="view-value view-description">{{ currentMemory.description }}</span>
            </div>
            <div v-if="currentMemory.location" class="view-row">
              <span class="view-label">장소</span>
              <span class="view-value">
                <i class="fas fa-map-marker-alt"></i>
                {{ currentMemory.location }}
              </span>
            </div>
            <div v-if="currentMemory.images && currentMemory.images.length > 0" class="view-row view-media-row">
              <span class="view-label">미디어</span>
              <div class="view-media-grid">
                <div
                  v-for="(image, index) in currentMemory.images"
                  :key="index"
                  class="view-media-item"
                  @click="openLightboxFromModal(index)"
                >
                  <video
                    v-if="isVideoMedia(image)"
                    :src="getImageUrl(image)"
                    class="view-media-thumb"
                    muted
                    playsinline
                    preload="metadata"
                  ></video>
                  <img
                    v-else
                    :src="getImageUrl(image)"
                    :alt="`미디어 ${index + 1}`"
                    class="view-media-thumb"
                  />
                  <div v-if="isVideoMedia(image)" class="video-type-badge">
                    <i class="fas fa-video"></i>
                  </div>
                  <div class="view-media-expand">
                    <i class="fas fa-expand-alt"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <!-- 편집/생성 모드 -->
          <form v-else @submit.prevent="saveMemory" class="memory-form">
            <div class="form-group">
              <label>제목</label>
              <input
                v-model="currentMemory.title"
                type="text"
                class="form-control"
                required
              />
            </div>
            <div class="form-group">
              <label>날짜 선택</label>
              <div class="date-type-selection">
                <div class="date-type-options">
                  <label class="radio-option">
                    <input
                      type="radio"
                      v-model="currentMemory.dateType"
                      value="single"
                      @change="onDateTypeChange"
                    />
                    <span>하루</span>
                  </label>
                  <label class="radio-option">
                    <input
                      type="radio"
                      v-model="currentMemory.dateType"
                      value="range"
                      @change="onDateTypeChange"
                    />
                    <span>기간</span>
                  </label>
                </div>

                <!-- 하루 선택 -->
                <div
                  v-if="currentMemory.dateType === 'single'"
                  class="single-date-input"
                >
                  <input
                    v-model="currentMemory.date"
                    type="date"
                    class="form-control"
                    required
                    :max="maxDate"
                    @input="validateSingleDate"
                    placeholder="날짜를 선택하세요"
                  />
                </div>

                <!-- 기간 선택 -->
                <div
                  v-if="currentMemory.dateType === 'range'"
                  class="range-date-inputs"
                >
                  <div class="date-input-group">
                    <label>시작일</label>
                    <input
                      v-model="currentMemory.startDate"
                      type="date"
                      class="form-control"
                      required
                      :max="maxDate"
                      @input="validateRangeDate"
                    />
                  </div>
                  <div class="date-input-group">
                    <label>종료일</label>
                    <input
                      v-model="currentMemory.endDate"
                      type="date"
                      class="form-control"
                      required
                      :max="maxDate"
                      :min="currentMemory.startDate"
                      @input="validateRangeDate"
                    />
                  </div>
                  <div v-if="dateRangeInfo" class="date-range-info">
                    <span class="range-duration"
                      >{{ dateRangeInfo.duration }}일</span
                    >
                    <span class="range-period">{{ dateRangeInfo.period }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="form-group">
              <label>카테고리</label>
              <select
                v-model="currentMemory.category"
                class="form-control"
                required
              >
                <option value="" disabled selected>
                  카테고리를 선택하세요
                </option>
                <option
                  v-for="cat in categoryOptions"
                  :key="cat.id"
                  :value="cat.id"
                >
                  {{ cat.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>설명</label>
              <textarea
                v-model="currentMemory.description"
                class="form-control"
                rows="3"
              ></textarea>
            </div>
            <div class="form-group">
              <label>장소</label>
              <input
                v-model="currentMemory.location"
                type="text"
                class="form-control"
              />
            </div>
            <div class="form-group">
              <label>이미지 / 동영상</label>
              <div class="image-upload-container">
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  @change="handleFileUpload"
                  style="display: none"
                />
                <div
                  v-if="hasUploadPermission"
                  class="image-upload-area"
                  @click="triggerFileInput"
                >
                  <div class="upload-placeholder">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <p>이미지 또는 동영상을 업로드하세요</p>
                    <small>클릭하여 파일 선택 (여러 개 선택 가능)</small>
                  </div>
                </div>

                <!-- 업로드된 이미지들 -->
                <div
                  v-if="currentMemory.images && currentMemory.images.length > 0"
                  class="uploaded-images"
                >
                  <div
                    v-for="(image, index) in currentMemory.images"
                    :key="index"
                    class="image-preview-item"
                  >
                    <video
                      v-if="isVideoMedia(image)"
                      :src="getImageUrl(image)"
                      ref="previewVideos"
                      class="media-preview media-preview-video"
                      controls
                      playsinline
                      muted
                      @loadeddata="handlePreviewVideoLoaded"
                      @play="handlePreviewVideoPlay"
                    ></video>
                    <div v-if="isVideoMedia(image)" class="video-type-badge">
                      <i class="fas fa-video"></i>
                    </div>
                    <img
                      v-else
                      :src="getImageUrl(image)"
                      :alt="`미디어 ${index + 1}`"
                      class="media-preview"
                    />
                    <button
                      v-if="canDelete"
                      type="button"
                      class="remove-image"
                      @click.stop="confirmRemoveImage(index)"
                      title="미디어 삭제"
                    >
                      <i class="fas fa-times"></i>
                    </button>
                  </div>
                </div>

                <div v-if="uploading" class="upload-progress">
                  <div class="progress-bar">
                    <div class="progress-fill"></div>
                  </div>
                  <p>업로드 중...</p>
                </div>
              </div>
            </div>
          </form>
        </template>
        <template #footer>
          <!-- 조회 모드 푸터 -->
          <div v-if="isViewMode" class="modal-footer-buttons">
            <div>
              <button
                v-if="canDelete"
                type="button"
                class="btn btn-danger"
                @click="openDeleteModal(currentMemory)"
              >
                삭제
              </button>
            </div>
            <div>
              <button type="button" class="btn btn-secondary" @click="closeMemoryModal">닫기</button>
              <button v-if="canUpdate" type="button" class="btn btn-primary" @click="enterEditMode">수정</button>
            </div>
          </div>
          <!-- 편집/생성 모드 푸터 -->
          <div v-else class="modal-footer-buttons">
            <div>
              <button
                v-if="isEditing && canDelete"
                type="button"
                class="btn btn-danger"
                @click="openDeleteModal(currentMemory)"
              >
                삭제
              </button>
            </div>
            <div>
              <button
                type="button"
                class="btn btn-secondary"
                @click="closeMemoryModal"
              >
                닫기
              </button>
              <button
                v-if="isEditing ? canUpdate : canCreate"
                type="button"
                class="btn btn-primary"
                @click="saveMemory"
              >
                {{ isEditing ? "수정" : "저장" }}
              </button>
            </div>
          </div>
        </template>
      </Modal>
    </teleport>

    <!-- 삭제 확인 모달 -->
    <teleport to="#modal">
      <DeleteModal
        v-if="showDeleteModal"
        :title="'추억 삭제'"
        :message="'이 추억을 정말 삭제하시겠습니까?'"
        @close="closeDeleteModal"
        @delete="deleteMemory"
      />
    </teleport>

    <!-- 이미지 삭제 확인 모달 -->
    <teleport to="#modal">
      <DeleteModal
        v-if="showImageDeleteModal"
        :title="'미디어 삭제'"
        :message="'이 미디어를 정말 삭제하시겠습니까?'"
        @close="closeImageDeleteModal"
        @delete="removeImage"
      />
    </teleport>

    <!-- 라이트박스 -->
    <teleport to="body">
      <div v-if="lightboxOpen" class="lightbox-overlay" @click.self="closeLightbox" @touchstart.passive="onLightboxTouchStart" @touchend.passive="onLightboxTouchEnd">
        <button class="lightbox-close" @click="closeLightbox" aria-label="닫기">
          <i class="fas fa-times"></i>
        </button>
        <button
          v-if="lightboxItems.length > 1"
          class="lightbox-nav lightbox-prev"
          @click="lightboxPrev"
          aria-label="이전"
        >
          <i class="fas fa-chevron-left"></i>
        </button>
        <button
          v-if="lightboxItems.length > 1"
          class="lightbox-nav lightbox-next"
          @click="lightboxNext"
          aria-label="다음"
        >
          <i class="fas fa-chevron-right"></i>
        </button>
        <div class="lightbox-content" @click.stop>
          <video
            v-if="lightboxItems[lightboxIndex]?.isVideo"
            :src="lightboxItems[lightboxIndex]?.url"
            :key="'v-' + lightboxIndex"
            class="lightbox-media"
            controls
            playsinline
          ></video>
          <img
            v-else
            :src="lightboxItems[lightboxIndex]?.url"
            :key="'i-' + lightboxIndex"
            class="lightbox-media"
          />
        </div>
        <div v-if="lightboxItems.length > 1" class="lightbox-counter">
          {{ lightboxIndex + 1 }} / {{ lightboxItems.length }}
        </div>
      </div>
    </teleport>
  </div>
</template>

<script>
import {
  ref,
  computed,
  watch,
  onBeforeUpdate,
  onMounted,
  onUnmounted,
  nextTick,
} from "vue";
import { useStore } from "vuex";
import Modal from "@/components/Modal.vue";
import DeleteModal from "@/components/DeleteModal.vue";
import TimelineFilter from "@/components/TimelineFilter.vue";
import TimelineList from "@/components/TimelineList.vue";
import { useToast } from "@/composables/toast";
import axios from "@/axios";
import { useUploadLimits } from "@/composables/useUploadLimits";

export default {
  name: "DatingPage",
  components: {
    Modal,
    DeleteModal,
    TimelineFilter,
    TimelineList,
  },
  setup() {
    const { showToast } = useToast();
    const {
      maxImageSizeBytes,
      maxVideoSizeBytes,
      maxImageLimitLabel,
      maxVideoLimitLabel,
    } = useUploadLimits();
    const store = useStore();
    const memories = ref([]);
    const searchQuery = ref("");
    const searchInput = ref("");
    const showMemoryModal = ref(false);
    const isEditing = ref(false);
    const selectedCategory = ref("all");
    const mediaFilter = ref("all");
    const showDeleteModal = ref(false);
    const memoryToDelete = ref(null);
    const uploading = ref(false);
    const isSelectingFiles = ref(false);
    const postUploadSettling = ref(false);
    const isMobileLike = ref(false);
    const fileInput = ref(null);
    const showImageDeleteModal = ref(false);
    const imageToDelete = ref(null);
    const previewVideos = ref([]);
    const isViewMode = ref(false);

    onBeforeUpdate(() => {
      previewVideos.value = [];
    });

    // D-day 표시를 자정 경계에서 자동 갱신
    const nowTick = ref(Date.now());
    let nowTimer = null;
    let handleVisibilityChange = null;
    let lastDayKey = "";

    const getDayKey = (ms) => {
      const d = new Date(ms);
      return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    };

    const scheduleNextMidnightTick = () => {
      const now = new Date();
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0, 0, 0, 0
      );
      const msUntilNextMidnight = Math.max(0, nextMidnight.getTime() - now.getTime());

      nowTimer = setTimeout(() => {
        nowTick.value = Date.now();
        lastDayKey = getDayKey(nowTick.value);
        scheduleNextMidnightTick();
      }, msUntilNextMidnight);
    };

    const updateIsMobileLike = () => {
      if (typeof window === "undefined" || !window.matchMedia) {
        isMobileLike.value = false;
        return;
      }
      const coarse = window.matchMedia(
        "(hover: none) and (pointer: coarse)"
      ).matches;
      const small = window.matchMedia("(max-width: 768px)").matches;
      isMobileLike.value = coarse || small;
    };

    onMounted(() => {
      updateIsMobileLike();
      window.addEventListener?.("resize", updateIsMobileLike);

      lastDayKey = getDayKey(nowTick.value);
      scheduleNextMidnightTick();
      handleVisibilityChange = () => {
        if (document.hidden) return;
        const nowMs = Date.now();
        const dayKey = getDayKey(nowMs);
        if (dayKey !== lastDayKey) {
          lastDayKey = dayKey;
          nowTick.value = nowMs;
        }
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);
    });

    onUnmounted(() => {
      window.removeEventListener?.("resize", updateIsMobileLike);
      if (nowTimer) clearTimeout(nowTimer);
      if (handleVisibilityChange) {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        handleVisibilityChange = null;
      }
      document.removeEventListener("keydown", handleLightboxKey);
    });

    const toLocalMidnight = (d) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x;
    };

    const parseYmdLocalMidnight = (v) => {
      if (!v) return null;
      const s = String(v);
      const d = s.length === 10 ? new Date(`${s}T00:00:00`) : new Date(s);
      return toLocalMidnight(d);
    };

    const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp"];
    const VIDEO_EXTENSIONS = ["mp4", "mov", "mkv", "webm", "avi", "m4v", "3gp"];

    const currentMemory = ref({
      title: "",
      date: "",
      dateType: "single",
      startDate: "",
      endDate: "",
      category: "",
      description: "",
      location: "",
      images: [],
    });

    const categories = [
      { id: "all", name: "전체", icon: "fas fa-list" },
      { id: "first_meet", name: "첫만남", icon: "fas fa-heart" },
      { id: "date", name: "데이트", icon: "fas fa-wine-glass-alt" },
      { id: "travel", name: "여행", icon: "fas fa-plane" },
      { id: "anniversary", name: "기념일", icon: "fas fa-calendar-heart" },
      { id: "gift", name: "선물", icon: "fas fa-gift" },
      { id: "special", name: "사귀기로한날", icon: "fas fa-star" },
      { id: "memory", name: "추억", icon: "fas fa-camera" },
    ];

    const mediaFilterOptions = [
      { id: "all", label: "전체" },
      { id: "image", label: "이미지" },
      { id: "video", label: "동영상" },
    ];

    const categoryOptions = computed(() => {
      const hasFirstMeet = memories.value.some((m) => m.category === "first_meet");
      const hasSpecial = memories.value.some((m) => m.category === "special");
      return categories.filter((cat) => {
        if (cat.id === "all") return false;
        if (cat.id === "first_meet" && hasFirstMeet) return false;
        if (cat.id === "special" && hasSpecial) return false;
        return true;
      });
    });

    // 권한 체크 - /dating 기준
    const canCreate = computed(() =>
      store.getters["auth/canCreate"]("/dating")
    );
    const canUpdate = computed(() =>
      store.getters["auth/canUpdate"]("/dating")
    );
    const canDelete = computed(() =>
      store.getters["auth/canDelete"]("/dating")
    );

    const hasUploadPermission = computed(() =>
      isEditing.value ? canUpdate.value : canCreate.value
    );

    const modalLock = computed(() => uploading.value || isSelectingFiles.value);

    const waitForModalMediaSettled = async (timeoutMs = 800) => {
      if (typeof document === "undefined") return;
      await nextTick();

      const root = document.querySelector("#modal");
      if (!root) return;

      const nodes = Array.from(root.querySelectorAll("img, video"));
      if (!nodes.length) return;

      await new Promise((resolve) => {
        let done = 0;
        let finished = false;

        const finish = () => {
          if (finished) return;
          finished = true;
          resolve();
        };

        const timer = setTimeout(finish, timeoutMs);

        const onDone = () => {
          done += 1;
          if (done >= nodes.length) {
            clearTimeout(timer);
            finish();
          }
        };

        nodes.forEach((el) => {
          if (el.tagName === "IMG") {
            if (el.complete) { onDone(); return; }
            el.addEventListener("load", onDone, { once: true });
            el.addEventListener("error", onDone, { once: true });
            return;
          }
          if (el.readyState >= 2) { onDone(); return; }
          el.addEventListener("loadeddata", onDone, { once: true });
          el.addEventListener("error", onDone, { once: true });
        });
      });
    };

    const parseImagesArray = (memory) => {
      if (memory.images && typeof memory.images === "string") {
        try { return JSON.parse(memory.images); } catch (e) { return memory.image ? [memory.image] : []; }
      }
      if (Array.isArray(memory.images)) return memory.images;
      return memory.image ? [memory.image] : [];
    };

    const fetchMemories = async () => {
      try {
        const response = await axios.get("/dating");
        memories.value = response.data.map((memory) => ({
          ...memory,
          images: parseImagesArray(memory),
        }));
      } catch (error) {
        showToast("추억을 불러오지 못했습니다.", "danger");
      }
    };

    const openCreateModal = () => {
      isEditing.value = false;
      isViewMode.value = false;
      currentMemory.value = {
        title: "", date: "", dateType: "single",
        startDate: "", endDate: "", category: "",
        description: "", location: "", images: [],
      };
      showMemoryModal.value = true;
    };

    const openMemoryDetail = (memory) => {
      isEditing.value = true;
      isViewMode.value = true;

      currentMemory.value = {
        ...memory,
        dateType: memory.dateType || "single",
        startDate: memory.startDate || "",
        endDate: memory.endDate || "",
        images: parseImagesArray(memory),
      };

      showMemoryModal.value = true;
    };

    const closeMemoryModal = () => {
      stopAllPreviewVideos();
      showMemoryModal.value = false;
      isViewMode.value = false;
      currentMemory.value = {
        title: "", date: "", dateType: "single",
        startDate: "", endDate: "", category: "",
        description: "", location: "", images: [],
      };
    };

    const requestCloseMemoryModal = () => {
      if (modalLock.value) return;
      closeMemoryModal();
    };

    const enterEditMode = () => { isViewMode.value = false; };

    const getCategoryName = (categoryId) => {
      const category = categories.find((c) => c.id === categoryId);
      return category ? category.name : categoryId;
    };

    // 라이트박스
    const lightboxOpen = ref(false);
    const lightboxItems = ref([]);
    const lightboxIndex = ref(0);

    const openLightbox = (items, index) => {
      lightboxItems.value = items;
      lightboxIndex.value = index;
      lightboxOpen.value = true;
    };

    const closeLightbox = () => { lightboxOpen.value = false; };

    const lightboxPrev = () => {
      lightboxIndex.value = (lightboxIndex.value - 1 + lightboxItems.value.length) % lightboxItems.value.length;
    };

    const lightboxNext = () => {
      lightboxIndex.value = (lightboxIndex.value + 1) % lightboxItems.value.length;
    };

    const openLightboxFromModal = (index) => {
      const items = (currentMemory.value.images || []).map((img) => ({
        url: getImageUrl(img),
        isVideo: isVideoMedia(img),
      }));
      openLightbox(items, index);
    };

    const handleMediaClick = ({ item, mediaIdx }) => {
      openLightbox(item.processedMedia, mediaIdx);
    };

    const handleLightboxKey = (e) => {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") lightboxPrev();
      else if (e.key === "ArrowRight") lightboxNext();
    };

    const lightboxTouchStartX = ref(0);
    const onLightboxTouchStart = (e) => {
      lightboxTouchStartX.value = e.touches[0].clientX;
    };
    const onLightboxTouchEnd = (e) => {
      const delta = e.changedTouches[0].clientX - lightboxTouchStartX.value;
      if (Math.abs(delta) < 50) return;
      if (delta < 0) lightboxNext();
      else lightboxPrev();
    };

    watch(lightboxOpen, (open) => {
      if (open) document.addEventListener("keydown", handleLightboxKey);
      else document.removeEventListener("keydown", handleLightboxKey);
    });

    const maxDate = computed(() => {
      const d = new Date(nowTick.value);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    });

    const onDateTypeChange = () => {
      if (currentMemory.value.dateType === "single") {
        currentMemory.value.startDate = "";
        currentMemory.value.endDate = "";
      } else {
        currentMemory.value.date = "";
      }
    };

    const validateSingleDate = (event) => {
      const dateValue = event.target.value;
      if (!dateValue) { showToast("날짜를 입력해주세요.", "danger"); return false; }

      const selectedDate = new Date(dateValue);
      const today = new Date();

      if (isNaN(selectedDate.getTime())) {
        showToast("올바른 날짜를 입력해주세요.", "danger");
        currentMemory.value.date = "";
        return false;
      }
      if (selectedDate > today) {
        showToast("미래의 날짜는 입력할 수 없습니다.", "danger");
        currentMemory.value.date = "";
        return false;
      }
      return true;
    };

    const validateRangeDate = () => {
      const startDate = currentMemory.value.startDate;
      const endDate = currentMemory.value.endDate;
      if (!startDate || !endDate) return true;

      const start = new Date(startDate);
      const end = new Date(endDate);
      const today = new Date();

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        showToast("올바른 날짜를 입력해주세요.", "danger");
        return false;
      }
      if (start > today || end > today) {
        showToast("미래의 날짜는 입력할 수 없습니다.", "danger");
        return false;
      }
      if (start > end) {
        showToast("시작일은 종료일보다 이전이어야 합니다.", "danger");
        currentMemory.value.endDate = "";
        return false;
      }
      return true;
    };

    const dateRangeInfo = computed(() => {
      if (
        currentMemory.value.dateType !== "range" ||
        !currentMemory.value.startDate ||
        !currentMemory.value.endDate
      ) return null;

      const start = new Date(currentMemory.value.startDate);
      const end = new Date(currentMemory.value.endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return null;

      const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      return {
        duration,
        period: `${start.toLocaleDateString("ko-KR")} ~ ${end.toLocaleDateString("ko-KR")}`,
      };
    });


    const saveMemory = async () => {
      if (!currentMemory.value.title?.trim()) {
        showToast("제목을 입력해주세요.", "danger"); return;
      }
      if (currentMemory.value.dateType === "single") {
        if (!currentMemory.value.date?.trim()) {
          showToast("날짜를 입력해주세요.", "danger"); return;
        }
      } else {
        if (!currentMemory.value.startDate?.trim() || !currentMemory.value.endDate?.trim()) {
          showToast("시작일과 종료일을 모두 입력해주세요.", "danger"); return;
        }
      }
      if (!currentMemory.value.category?.trim()) {
        showToast("카테고리를 선택해주세요.", "danger"); return;
      }

      if (currentMemory.value.dateType === "single") {
        if (!validateSingleDate({ target: { value: currentMemory.value.date } })) return;
      } else {
        if (!validateRangeDate()) return;
      }

      try {
        const memoryData = {
          ...currentMemory.value,
          images: currentMemory.value.images
            ? JSON.stringify(currentMemory.value.images)
            : null,
          image:
            currentMemory.value.images && currentMemory.value.images.length > 0
              ? currentMemory.value.images[0]
              : null,
        };

        if (isEditing.value) {
          await axios.put(`/dating/${currentMemory.value.id}`, memoryData);
          showToast("추억이 수정되었습니다.");
        } else {
          await axios.post("/dating", memoryData);
          showToast("추억이 생성되었습니다.");
        }
        await fetchMemories();
        closeMemoryModal();
      } catch (error) {
        showToast(
          isEditing.value ? "추억 수정에 실패했습니다." : "추억 생성에 실패했습니다.",
          "danger"
        );
      }
    };

    const filterByCategory = (categoryId) => { selectedCategory.value = categoryId; };

    const formatDate = (date) => {
      const d = parseYmdLocalMidnight(date);
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
      const category = categories.find((c) => c.id === categoryId);
      return category ? category.icon : "fas fa-heart";
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
      try {
        await axios.delete(`/dating/${memoryToDelete.value.id}`);
        closeDeleteModal();
        await fetchMemories();
        showToast("추억이 삭제되었습니다.");
      } catch (error) {
        showToast("추억 삭제에 실패했습니다.", "danger");
      }
    };

    const getExtensionFromName = (name = "") => {
      if (!name) return "";
      const sanitized = name.split("?")[0];
      const segments = sanitized.split(".");
      if (segments.length < 2) return "";
      return segments.pop().toLowerCase();
    };

    const isImageFile = (file) => {
      if (!file) return false;
      if (file.type && file.type.startsWith("image/")) return true;
      return IMAGE_EXTENSIONS.includes(getExtensionFromName(file.name));
    };

    const isVideoFile = (file) => {
      if (!file) return false;
      if (file.type && file.type.startsWith("video/")) return true;
      return VIDEO_EXTENSIONS.includes(getExtensionFromName(file.name));
    };

    const extractPath = (value) => {
      if (!value) return "";
      if (typeof value === "string") return value;
      if (typeof value === "object") {
        if (value.path) return value.path;
        if (value.url) return value.url;
      }
      return "";
    };

    const isVideoMedia = (value) => {
      const path = extractPath(value);
      if (!path) return false;
      return VIDEO_EXTENSIONS.includes(getExtensionFromName(path));
    };

    const handlePreviewVideoLoaded = (event) => {
      const videoElement = event?.target;
      if (!videoElement) return;
      videoElement.muted = true;
      videoElement.currentTime = 0;
    };

    const stopAllPreviewVideos = () => {
      previewVideos.value.forEach((videoElement) => {
        if (!videoElement) return;
        videoElement.pause();
        videoElement.currentTime = 0;
      });
    };

    const handlePreviewVideoPlay = (event) => {
      const playingVideo = event?.target;
      previewVideos.value.forEach((videoElement) => {
        if (!videoElement || videoElement === playingVideo) return;
        videoElement.pause();
      });
    };

    const triggerFileInput = () => {
      if (!hasUploadPermission.value) {
        showToast("미디어 업로드 권한이 없습니다.", "danger");
        return;
      }
      isSelectingFiles.value = true;
      fileInput.value?.click();
    };

    const handleFileUpload = async (event) => {
      isSelectingFiles.value = false;
      const files = Array.from(event.target.files);
      if (!files.length) return;

      if (!hasUploadPermission.value) {
        showToast("미디어 업로드 권한이 없습니다.", "danger");
        return;
      }
      if (files.length > 20) {
        showToast("최대 20개의 미디어만 업로드할 수 있습니다.", "danger");
        return;
      }
      const totalImages = (currentMemory.value.images?.length || 0) + files.length;
      if (totalImages > 20) {
        showToast("총 미디어 개수는 20개를 초과할 수 없습니다.", "danger");
        return;
      }

      uploading.value = true;

      try {
        const uploadPromises = files.map(async (file) => {
          const isImage = isImageFile(file);
          const isVideo = isVideoFile(file);

          if (!isImage && !isVideo) {
            throw new Error(`${file.name}: 이미지 또는 동영상 파일만 업로드 가능합니다.`);
          }
          if (isImage && file.size > maxImageSizeBytes) {
            throw new Error(`${file.name}: 이미지 파일 크기는 ${maxImageLimitLabel} 이하여야 합니다.`);
          }
          if (isVideo && file.size > maxVideoSizeBytes) {
            throw new Error(`${file.name}: 동영상 파일 크기는 ${maxVideoLimitLabel} 이하여야 합니다.`);
          }

          const formData = new FormData();
          formData.append("file", file);

          const response = await axios.post("/dating/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          return response.data;
        });

        const uploadedImages = await Promise.all(uploadPromises);

        if (!currentMemory.value.images) currentMemory.value.images = [];
        currentMemory.value.images.push(...uploadedImages);

        showToast(`${uploadedImages.length}개의 미디어가 업로드되었습니다.`);
        postUploadSettling.value = true;
        await waitForModalMediaSettled(1500);
        await new Promise((r) => setTimeout(r, 300));
      } catch (error) {
        if (error.response?.status === 403) {
          showToast("미디어 업로드 권한이 없습니다.", "danger");
        } else {
          showToast(`미디어 업로드에 실패했습니다: ${error.message}`, "danger");
        }
      } finally {
        uploading.value = false;
        postUploadSettling.value = false;
        if (fileInput.value) fileInput.value.value = "";
      }
    };

    const confirmRemoveImage = (index) => {
      if (!canDelete.value) {
        showToast("미디어 삭제 권한이 없습니다.", "danger");
        return;
      }
      imageToDelete.value = index;
      showImageDeleteModal.value = true;
    };

    const closeImageDeleteModal = () => {
      showImageDeleteModal.value = false;
      imageToDelete.value = null;
    };

    const removeImage = async () => {
      if (imageToDelete.value !== null && currentMemory.value.images) {
        const imageToRemove = currentMemory.value.images[imageToDelete.value];
        const imagePath = extractPath(imageToRemove);

        if (!imagePath) {
          showToast("미디어 경로를 찾을 수 없습니다.", "danger");
          closeImageDeleteModal();
          return;
        }

        try {
          await axios.delete("/dating/image", { params: { imagePath } });
          currentMemory.value.images.splice(imageToDelete.value, 1);
          showToast("미디어가 삭제되었습니다.");
          await waitForModalMediaSettled(800);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("미디어 삭제 실패:", error);
          if (error.response?.status === 403) {
            showToast("미디어 삭제 권한이 없습니다.", "danger");
          } else {
            showToast("미디어 삭제에 실패했습니다.", "danger");
          }
        }
      }
      closeImageDeleteModal();
    };

    const getImageUrl = (imagePath) => {
      const path = extractPath(imagePath);
      if (!path || path.trim() === "") return "";
      if (path.startsWith("http")) return path;
      const baseURL = axios.defaults.baseURL;
      return `${baseURL}${path}`;
    };

    // D-day: 오늘 날짜 기준 실시간 계산
    const firstMeetDate = computed(() => {
      const firstMeet = memories.value.find((m) => m.category === "first_meet");
      if (!firstMeet) return null;
      return firstMeet.dateType === "range" && firstMeet.startDate
        ? firstMeet.startDate
        : firstMeet.date;
    });

    const firstMeetEndDate = computed(() => {
      const firstMeet = memories.value.find((m) => m.category === "first_meet");
      return firstMeet && firstMeet.dateType === "range" && firstMeet.endDate
        ? firstMeet.endDate
        : null;
    });

    const specialDate = computed(() => {
      const special = memories.value.find((m) => m.category === "special");
      if (!special) return null;
      return special.dateType === "range" && special.startDate
        ? special.startDate
        : special.date;
    });

    const specialEndDate = computed(() => {
      const special = memories.value.find((m) => m.category === "special");
      return special && special.dateType === "range" && special.endDate
        ? special.endDate
        : null;
    });

    const firstMeetDays = computed(() => {
      if (!firstMeetDate.value) return 0;
      const today = toLocalMidnight(new Date(nowTick.value));
      const firstMeet = parseYmdLocalMidnight(firstMeetDate.value);
      return Math.floor((today - firstMeet) / (1000 * 60 * 60 * 24));
    });

    const specialDays = computed(() => {
      if (!specialDate.value) return 0;
      const today = toLocalMidnight(new Date(nowTick.value));
      const special = parseYmdLocalMidnight(specialDate.value);
      return Math.floor((today - special) / (1000 * 60 * 60 * 24));
    });

    const processedMemories = computed(() => {
      const query = searchQuery.value.trim().toLowerCase();

      let filteredMemories = memories.value;
      if (selectedCategory.value !== "all") {
        filteredMemories = filteredMemories.filter(
          (memory) => memory.category === selectedCategory.value
        );
      }
      if (query) {
        filteredMemories = filteredMemories.filter((memory) => {
          const target = [memory.title, memory.description, memory.location]
            .filter(Boolean).join(" ").toLowerCase();
          return target.includes(query);
        });
      }

      const processed = filteredMemories.map((memory) => {
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

      if (mediaFilter.value === "image") return processed.filter((m) => m.imageCount > 0);
      if (mediaFilter.value === "video") return processed.filter((m) => m.videoCount > 0);
      return processed;
    });

    const applySearch = () => { searchQuery.value = searchInput.value.trim(); };
    const clearSearch = () => { searchInput.value = ""; searchQuery.value = ""; };
    const setMediaFilter = (type) => { mediaFilter.value = type; };

    watch(searchInput, (val) => { searchQuery.value = val.trim(); });

    const handleImageError = (event) => { event.target.style.display = "none"; };
    const handleImageLoad = (event) => { event.target.style.display = "block"; };

    fetchMemories();

    return {
      searchInput, showMemoryModal, currentMemory,
      categories, categoryOptions, selectedCategory, mediaFilter, mediaFilterOptions,
      processedMemories, isEditing, openCreateModal, openMemoryDetail, closeMemoryModal,
      saveMemory, filterByCategory, formatDate, formatMemoryDate, getCategoryIcon,
      showDeleteModal, openDeleteModal, closeDeleteModal, deleteMemory,
      maxDate, uploading, isSelectingFiles, postUploadSettling,
      isMobileLike, modalLock, fileInput, triggerFileInput, handleFileUpload,
      requestCloseMemoryModal, confirmRemoveImage, removeImage,
      previewVideos, handlePreviewVideoLoaded, handlePreviewVideoPlay, getImageUrl, isVideoMedia,
      handleImageError, handleImageLoad, setMediaFilter, clearSearch,
      showImageDeleteModal, closeImageDeleteModal,
      canCreate, canUpdate, canDelete, hasUploadPermission,
      firstMeetDate, firstMeetEndDate, specialDate, specialEndDate, firstMeetDays, specialDays,
      onDateTypeChange, validateSingleDate, validateRangeDate, dateRangeInfo, applySearch,
      isViewMode, enterEditMode, getCategoryName,
      lightboxOpen, lightboxItems, lightboxIndex,
      openLightboxFromModal, closeLightbox, lightboxPrev, lightboxNext,
      onLightboxTouchStart, onLightboxTouchEnd,
      handleMediaClick,
    };
  },
};
</script>

<style src="@/assets/css/dating.css" scoped></style>
