<template>
  <div class="history-container">
    <!--
      모바일 파일 업로드(파일 선택창) 복귀 시 대형 DOM(타임라인/필터/리스트)이 함께 리페인트되면
      모달 오버레이가 순간 흔들리며 "팝업↔메인"처럼 깜빡이는 체감이 생길 수 있음.
      모달이 떠있는 동안에는 배경 컨텐츠를 숨겨 페인트 자체를 줄여 안정화.
    -->
    <div class="history-page-content" v-show="!showEventModal">
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
        :items="processedEvents"
        :date-formatter="formatEventDate"
        :category-icon-getter="getCategoryIcon"
        @select="openEventDetail"
        @delete="openDeleteModal"
        @image-error="handleImageError"
        @image-load="handleImageLoad"
      />
    </div>

    <!-- 이벤트 생성/수정 모달 -->
    <teleport to="#modal">
      <Modal
        v-if="showEventModal"
        :close-on-backdrop="!modalLock"
        :close-on-esc="!modalLock"
        :close-disabled="modalLock"
        :busy="isMobileLike && (uploading || postUploadSettling)"
        :busy-text="'업로드 중...'"
        @close="requestCloseEventModal"
      >
        <template #header>
          <h3>{{ isEditing ? "이벤트 수정" : "새 이벤트 추가" }}</h3>
        </template>
        <template #body>
          <form @submit.prevent="saveEvent" class="event-form">
            <div class="form-group">
              <label>Title</label>
              <input
                v-model="currentEvent.title"
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
                      v-model="currentEvent.dateType"
                      value="single"
                      @change="onDateTypeChange"
                    />
                    <span>하루</span>
                  </label>
                  <label class="radio-option">
                    <input
                      type="radio"
                      v-model="currentEvent.dateType"
                      value="range"
                      @change="onDateTypeChange"
                    />
                    <span>기간</span>
                  </label>
                </div>

                <!-- 하루 선택 -->
                <div
                  v-if="currentEvent.dateType === 'single'"
                  class="single-date-input"
                >
                  <input
                    v-model="currentEvent.date"
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
                  v-if="currentEvent.dateType === 'range'"
                  class="range-date-inputs"
                >
                  <div class="date-input-group">
                    <label>시작일</label>
                    <input
                      v-model="currentEvent.startDate"
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
                      v-model="currentEvent.endDate"
                      type="date"
                      class="form-control"
                      required
                      :max="maxDate"
                      :min="currentEvent.startDate"
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
              <label>Category</label>
              <select
                v-model="currentEvent.category"
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
              <label>Description</label>
              <textarea
                v-model="currentEvent.description"
                class="form-control"
                rows="3"
              ></textarea>
            </div>
            <div class="form-group">
              <label>Location</label>
              <input
                v-model="currentEvent.location"
                type="text"
                class="form-control"
              />
            </div>
            <div class="form-group">
              <label>Images / Videos</label>
              <div class="image-upload-container">
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  @change="handleFileUpload"
                  style="display: none"
                />
                <div class="image-upload-area" @click="triggerFileInput">
                  <div class="upload-placeholder">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <p>이미지 또는 동영상을 업로드하세요</p>
                    <small>클릭하여 파일 선택 (여러 개 선택 가능)</small>
                  </div>
                </div>

                <!-- 업로드된 이미지들 -->
                <div
                  v-if="currentEvent.images && currentEvent.images.length > 0"
                  class="uploaded-images"
                >
                  <div
                    v-for="(image, index) in currentEvent.images"
                    :key="index"
                    class="image-preview-item"
                  >
                    <video
                      v-if="isVideoMedia(image)"
                      :src="getMediaUrl(image)"
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
                      :src="getMediaUrl(image)"
                      :alt="`Media ${index + 1}`"
                      class="media-preview"
                      @error="handleImageError"
                      @load="handleImageLoad"
                    />
                    <button
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
          <div class="modal-footer-buttons">
            <div>
              <button
                type="button"
                class="btn btn-danger"
                @click="openDeleteModal(currentEvent)"
                v-if="isEditing"
              >
                삭제
              </button>
            </div>
            <div>
              <button
                type="button"
                class="btn btn-secondary"
                @click="closeEventModal"
              >
                취소
              </button>
              <button type="button" class="btn btn-primary" @click="saveEvent">
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
        :title="'이벤트 삭제'"
        :message="'이 이벤트를 정말 삭제하시겠습니까?'"
        @close="closeDeleteModal"
        @delete="deleteEvent"
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
  </div>
</template>

<script>
import {
  ref,
  computed,
  onBeforeUpdate,
  nextTick,
  onMounted,
  onUnmounted,
} from "vue";
import Modal from "@/components/Modal.vue";
import DeleteModal from "@/components/DeleteModal.vue";
import TimelineFilter from "@/components/TimelineFilter.vue";
import TimelineList from "@/components/TimelineList.vue";
import { useToast } from "@/composables/toast";
import axios from "@/axios";
import { useUploadLimits } from "@/composables/useUploadLimits";

export default {
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
    const events = ref([]);
    const searchQuery = ref("");
    const searchInput = ref("");
    const showEventModal = ref(false);
    const isEditing = ref(false);
    const selectedCategory = ref("all");
    const mediaFilter = ref("all");
    const showDeleteModal = ref(false);
    const eventToDelete = ref(null);
    const uploading = ref(false);
    const isSelectingFiles = ref(false);
    const postUploadSettling = ref(false);
    const isMobileLike = ref(false);
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
    });

    onUnmounted(() => {
      window.removeEventListener?.("resize", updateIsMobileLike);
    });
    // 업로드/파일선택 중에는 모달 닫힘을 막아(모바일 ghost click 등) 깜빡임을 최소화
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
            if (el.complete) {
              onDone();
              return;
            }
            el.addEventListener("load", onDone, { once: true });
            el.addEventListener("error", onDone, { once: true });
            return;
          }

          if (el.readyState >= 2) {
            onDone();
            return;
          }
          el.addEventListener("loadeddata", onDone, { once: true });
          el.addEventListener("error", onDone, { once: true });
        });
      });
    };
    const fileInput = ref(null);
    const showImageDeleteModal = ref(false);
    const imageToDelete = ref(null);
    const previewVideos = ref([]);

    onBeforeUpdate(() => {
      previewVideos.value = [];
    });

    const currentEvent = ref({
      title: "",
      date: "",
      dateType: "single", // "single" 또는 "range"
      startDate: "",
      endDate: "",
      category: "",
      description: "",
      location: "",
      image: "",
      images: [], // 다중 이미지 지원
    });

    const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp"];
    const VIDEO_EXTENSIONS = ["mp4", "mov", "mkv", "webm", "avi", "m4v", "3gp"];

    const categories = [
      { id: "all", name: "전체", icon: "fas fa-list" },
      { id: "travel", name: "여행", icon: "fas fa-plane" },
      { id: "education", name: "교육", icon: "fas fa-graduation-cap" },
      { id: "move", name: "이사", icon: "fas fa-home" },
      { id: "work", name: "일", icon: "fas fa-briefcase" },
      { id: "record", name: "기록", icon: "fas fa-trophy" },
    ];

    const mediaFilterOptions = [
      { id: "all", label: "전체" },
      { id: "image", label: "이미지" },
      { id: "video", label: "동영상" },
    ];

    // 실제 카테고리만 포함하는 배열 (전체 제외)
    const categoryOptions = categories.filter((cat) => cat.id !== "all");

    const filteredEvents = computed(() => {
      if (selectedCategory.value === "all") return events.value;
      return events.value.filter(
        (event) => event.category === selectedCategory.value
      );
    });

    // 이미지 URL을 미리 계산하고 카테고리 필터링을 적용하는 computed 함수
    const processedEvents = computed(() => {
      const query = searchQuery.value.trim().toLowerCase();

      let eventsToProcess = filteredEvents.value;

      if (query) {
        eventsToProcess = eventsToProcess.filter((event) => {
          const target = [event.title, event.description, event.location]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return target.includes(query);
        });
      }

      const processed = eventsToProcess.map((event) => {
        const mediaList = Array.isArray(event.images)
          ? event.images
          : event.image
          ? [event.image]
          : [];

        const processedMedia = mediaList
          .map((mediaItem, index) => {
            const url = getMediaUrl(mediaItem);
            if (!url) return null;
            const isVideo = isVideoMedia(mediaItem);
            return {
              url,
              isVideo,
              originalIndex: index,
            };
          })
          .filter(Boolean);

        const videoCount = processedMedia.filter(
          (media) => media.isVideo
        ).length;
        const imageCount = processedMedia.length - videoCount;
        const firstVideo = processedMedia.find((media) => media.isVideo);

        return {
          ...event,
          processedMedia,
          imageCount,
          videoCount,
          totalMediaCount: processedMedia.length,
          firstVideoIndex: firstVideo ? firstVideo.originalIndex : -1,
        };
      });

      if (mediaFilter.value === "image") {
        return processed.filter((event) => event.imageCount > 0);
      }

      if (mediaFilter.value === "video") {
        return processed.filter((event) => event.videoCount > 0);
      }

      return processed;
    });

    const fetchEvents = async () => {
      try {
        const response = await axios.get("/histories");
        // 백엔드에서 받은 데이터를 프론트엔드 형식으로 변환
        events.value = response.data.map((event) => {
          let imagesArray = [];

          if (event.images && typeof event.images === "string") {
            try {
              imagesArray = JSON.parse(event.images);
            } catch (e) {
              imagesArray = event.image ? [event.image] : [];
            }
          } else if (Array.isArray(event.images)) {
            imagesArray = event.images;
          } else if (event.image) {
            imagesArray = [event.image];
          }

          return {
            ...event,
            images: imagesArray,
          };
        });
      } catch (error) {
        showToast("Failed to load events", "danger");
      }
    };

    const applySearch = () => {
      searchQuery.value = searchInput.value.trim();
    };

    const setMediaFilter = (type) => {
      mediaFilter.value = type;
    };

    const openCreateModal = () => {
      isEditing.value = false;
      currentEvent.value = {
        title: "",
        date: "",
        dateType: "single",
        startDate: "",
        endDate: "",
        category: "",
        description: "",
        location: "",
        image: "",
        images: [],
      };
      showEventModal.value = true;
    };

    const openEventDetail = (event) => {
      isEditing.value = true;

      // images 필드 처리 (JSON 문자열을 배열로 변환)
      let imagesArray = [];
      if (event.images && typeof event.images === "string") {
        try {
          imagesArray = JSON.parse(event.images);
        } catch (e) {
          imagesArray = [];
        }
      } else if (Array.isArray(event.images)) {
        imagesArray = event.images;
      } else if (event.image) {
        // 기존 단일 이미지가 있다면 배열로 변환
        imagesArray = [event.image];
      }

      currentEvent.value = {
        ...event,
        dateType: event.dateType || "single", // 기존 데이터 호환성
        startDate: event.startDate || "",
        endDate: event.endDate || "",
        images: imagesArray,
      };

      showEventModal.value = true;
    };

    const closeEventModal = () => {
      stopAllPreviewVideos();
      showEventModal.value = false;
      currentEvent.value = {
        title: "",
        date: "",
        dateType: "single",
        startDate: "",
        endDate: "",
        category: "",
        description: "",
        location: "",
        image: "",
        images: [],
      };
    };

    const requestCloseEventModal = () => {
      if (modalLock.value) return;
      closeEventModal();
    };

    // 최대 날짜를 현재 날짜로 설정 (로컬 시간 기준)
    const maxDate = (() => {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    })();

    // 날짜 타입 변경 핸들러
    const onDateTypeChange = () => {
      // 날짜 타입이 변경되면 기존 날짜 값들 초기화
      if (currentEvent.value.dateType === "single") {
        currentEvent.value.startDate = "";
        currentEvent.value.endDate = "";
      } else {
        currentEvent.value.date = "";
      }
    };

    // 단일 날짜 검증
    const validateSingleDate = (event) => {
      const dateValue = event.target.value;
      if (!dateValue) {
        showToast("날짜를 입력해주세요.", "danger");
        return false;
      }

      if (isNaN(new Date(dateValue).getTime())) {
        showToast("올바른 날짜를 입력해주세요.", "danger");
        currentEvent.value.date = "";
        return false;
      }

      if (dateValue > maxDate) {
        showToast("미래의 날짜는 입력할 수 없습니다.", "danger");
        currentEvent.value.date = "";
        return false;
      }

      return true;
    };

    // 기간 날짜 검증
    const validateRangeDate = () => {
      const startDate = currentEvent.value.startDate;
      const endDate = currentEvent.value.endDate;

      if (!startDate || !endDate) {
        return true; // 아직 입력이 완료되지 않았으면 검증하지 않음
      }

      if (isNaN(new Date(startDate).getTime()) || isNaN(new Date(endDate).getTime())) {
        showToast("올바른 날짜를 입력해주세요.", "danger");
        return false;
      }

      if (startDate > maxDate || endDate > maxDate) {
        showToast("미래의 날짜는 입력할 수 없습니다.", "danger");
        return false;
      }

      if (startDate > endDate) {
        showToast("시작일은 종료일보다 이전이어야 합니다.", "danger");
        currentEvent.value.endDate = "";
        return false;
      }

      return true;
    };

    // 기간 정보 계산 (computed)
    const dateRangeInfo = computed(() => {
      if (
        currentEvent.value.dateType !== "range" ||
        !currentEvent.value.startDate ||
        !currentEvent.value.endDate
      ) {
        return null;
      }

      const start = new Date(currentEvent.value.startDate);
      const end = new Date(currentEvent.value.endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        return null;
      }

      const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      const startFormatted = start.toLocaleDateString("ko-KR");
      const endFormatted = end.toLocaleDateString("ko-KR");

      return {
        duration,
        period: `${startFormatted} ~ ${endFormatted}`,
      };
    });

    // 기존 validateDate 함수 (호환성 유지)
    const validateDate = (event) => {
      if (currentEvent.value.dateType === "single") {
        return validateSingleDate(event);
      } else {
        return validateRangeDate();
      }
    };

    const saveEvent = async () => {
      // 필수 입력값 검사
      if (!currentEvent.value.title?.trim()) {
        showToast("제목을 입력해주세요.", "danger");
        return;
      }
      // 날짜 검증 (타입에 따라)
      if (currentEvent.value.dateType === "single") {
        if (!currentEvent.value.date?.trim()) {
          showToast("날짜를 입력해주세요.", "danger");
          return;
        }
      } else {
        if (
          !currentEvent.value.startDate?.trim() ||
          !currentEvent.value.endDate?.trim()
        ) {
          showToast("시작일과 종료일을 모두 입력해주세요.", "danger");
          return;
        }
      }
      if (!currentEvent.value.category?.trim()) {
        showToast("카테고리를 선택해주세요.", "danger");
        return;
      }

      // 날짜 유효성 검사
      if (currentEvent.value.dateType === "single") {
        if (
          !validateSingleDate({ target: { value: currentEvent.value.date } })
        ) {
          return;
        }
      } else {
        if (!validateRangeDate()) {
          return;
        }
      }

      try {
        // 백엔드로 전송할 데이터 준비
        const eventData = {
          ...currentEvent.value,
          // 이미지 배열을 JSON 문자열로 변환
          images: currentEvent.value.images
            ? JSON.stringify(currentEvent.value.images)
            : null,
          // 기존 단일 이미지 필드도 유지 (호환성)
          image:
            currentEvent.value.images && currentEvent.value.images.length > 0
              ? currentEvent.value.images[0]
              : null,
        };

        if (isEditing.value) {
          await axios.put(`/histories/${currentEvent.value.id}`, eventData);
          showToast("이벤트가 수정되었습니다.");
        } else {
          await axios.post("/histories", eventData);
          showToast("이벤트가 생성되었습니다.");
        }
        await fetchEvents();
        closeEventModal();
      } catch (error) {
        showToast(
          isEditing.value
            ? "이벤트 수정에 실패했습니다."
            : "이벤트 생성에 실패했습니다.",
          "danger"
        );
      }
    };

    const filterByCategory = (categoryId) => {
      selectedCategory.value =
        selectedCategory.value === categoryId ? null : categoryId;
    };

    const formatDate = (date) => {
      return new Date(date).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    // 이벤트 날짜 포맷팅 (단일/기간 구분)
    const formatEventDate = (event) => {
      if (event.dateType === "range" && event.startDate && event.endDate) {
        const startFormatted = formatDate(event.startDate);
        const endFormatted = formatDate(event.endDate);
        return `${startFormatted} ~ ${endFormatted}`;
      } else {
        return formatDate(event.date);
      }
    };

    const getCategoryIcon = (categoryId) => {
      const category = categories.find((c) => c.id === categoryId);
      return category ? category.icon : "fas fa-calendar";
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
      } catch (error) {
        showToast("이벤트 삭제에 실패했습니다.", "danger");
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
      const ext = getExtensionFromName(path);
      return VIDEO_EXTENSIONS.includes(ext);
    };

    const getMediaUrl = (mediaPath) => {
      const path = extractPath(mediaPath);
      if (!path || (typeof path === "string" && path.trim() === "")) return "";
      if (path.startsWith("http")) return path;
      const baseURL = axios.defaults.baseURL;
      return `${baseURL}${path}`;
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

    const handleImageError = (event) => {
      // 이미지 로드 실패 시 숨기기
      event.target.style.display = "none";
    };

    const handleImageLoad = (event) => {
      // 이미지 로드 성공 시 표시
      event.target.style.display = "block";
    };

    // 파일 업로드 관련 함수들
    const triggerFileInput = () => {
      isSelectingFiles.value = true;
      fileInput.value?.click();
    };

    const handleFileUpload = async (event) => {
      isSelectingFiles.value = false;
      const files = Array.from(event.target.files);
      if (!files.length) {
        return;
      }

      // 파일 개수 제한 (최대 20개)
      if (files.length > 20) {
        showToast("최대 20개의 미디어만 업로드할 수 있습니다.", "danger");
        return;
      }

      // 기존 이미지와 합쳐서 총 개수 확인
      const totalMedia =
        (currentEvent.value.images?.length || 0) + files.length;
      if (totalMedia > 20) {
        showToast("총 미디어 개수는 20개를 초과할 수 없습니다.", "danger");
        return;
      }

      uploading.value = true;

      try {
        const uploadPromises = files.map(async (file) => {
          const isImage = isImageFile(file);
          const isVideo = isVideoFile(file);

          if (!isImage && !isVideo) {
            throw new Error(
              `${file.name}: 이미지 또는 동영상 파일만 업로드 가능합니다.`
            );
          }

          if (isImage && file.size > maxImageSizeBytes) {
            throw new Error(
              `${file.name}: 이미지 파일 크기는 ${maxImageLimitLabel} 이하여야 합니다.`
            );
          }

          if (isVideo && file.size > maxVideoSizeBytes) {
            throw new Error(
              `${file.name}: 동영상 파일 크기는 ${maxVideoLimitLabel} 이하여야 합니다.`
            );
          }

          const formData = new FormData();
          formData.append("file", file);

          const response = await axios.post("/histories/upload", formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });

          return response.data;
        });

        const uploadedMedia = await Promise.all(uploadPromises);

        // 기존 이미지 배열에 새 이미지들 추가
        if (!currentEvent.value.images) {
          currentEvent.value.images = [];
        }
        currentEvent.value.images.push(...uploadedMedia);

        showToast(`${uploadedMedia.length}개의 미디어가 업로드되었습니다.`);
        postUploadSettling.value = true;
        await waitForModalMediaSettled(1500);
        await new Promise((r) => setTimeout(r, 300));
      } catch (error) {
        showToast(`미디어 업로드에 실패했습니다: ${error.message}`, "danger");
      } finally {
        uploading.value = false;
        postUploadSettling.value = false;
        // 파일 입력 초기화
        if (fileInput.value) {
          fileInput.value.value = "";
        }
      }
    };

    const confirmRemoveImage = (index) => {
      imageToDelete.value = index;
      showImageDeleteModal.value = true;
    };

    const closeImageDeleteModal = () => {
      showImageDeleteModal.value = false;
      imageToDelete.value = null;
    };

    const removeImage = async () => {
      if (imageToDelete.value !== null && currentEvent.value.images) {
        const imageToRemove = currentEvent.value.images[imageToDelete.value];

        try {
          // 서버에서 미디어 파일 삭제
          await axios.delete("/histories/media", {
            params: { mediaPath: imageToRemove },
          });

          // 프론트엔드에서 이미지 배열에서 제거
          currentEvent.value.images.splice(imageToDelete.value, 1);
          showToast("미디어가 삭제되었습니다.");
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("미디어 삭제 실패:", error);
          showToast("미디어 삭제에 실패했습니다.", "danger");
        }
      }
      closeImageDeleteModal();
    };

    // 초기 데이터 로드
    fetchEvents();

    return {
      events,
      searchQuery,
      searchInput,
      showEventModal,
      currentEvent,
      categories,
      categoryOptions,
      selectedCategory,
      mediaFilter,
      mediaFilterOptions,
      filteredEvents,
      processedEvents,
      isEditing,
      openCreateModal,
      openEventDetail,
      closeEventModal,
      saveEvent,
      filterByCategory,
      setMediaFilter,
      formatDate,
      formatEventDate,
      getCategoryIcon,
      showDeleteModal,
      openDeleteModal,
      closeDeleteModal,
      deleteEvent,
      maxDate,
      validateDate,
      previewVideos,
      getMediaUrl,
      isVideoMedia,
      handleImageError,
      handleImageLoad,
      handlePreviewVideoLoaded,
      handlePreviewVideoPlay,
      // 파일 업로드 관련
      uploading,
      isSelectingFiles,
      postUploadSettling,
      isMobileLike,
      modalLock,
      fileInput,
      triggerFileInput,
      handleFileUpload,
      requestCloseEventModal,
      confirmRemoveImage,
      removeImage,
      // 이미지 삭제 모달 관련
      showImageDeleteModal,
      closeImageDeleteModal,
      // 새로운 날짜 관련
      onDateTypeChange,
      validateSingleDate,
      validateRangeDate,
      dateRangeInfo,
      applySearch,
    };
  },
};
</script>

<style src="@/assets/css/history.css" scoped></style>
