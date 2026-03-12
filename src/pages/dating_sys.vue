<template>
  <div class="dating-container">
    <!--
      모바일 파일 업로드(파일 선택창) 복귀 시 대형 DOM(타임라인/필터/리스트)이 함께 리페인트되면
      모달 오버레이가 순간 흔들리며 "팝업↔메인"처럼 깜빡이는 체감이 생길 수 있음.
      모달이 떠있는 동안에는 배경 컨텐츠를 숨겨 페인트 자체를 줄여 안정화.
    -->
    <div class="dating-page-content" v-show="!showMemoryModal">
      <div class="page-header">
        <h2>My Dating History</h2>
        <button
          v-if="canCreate"
          class="btn btn-primary"
          @click="openCreateModal"
        >
          Add New Memory
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
        :allow-delete="canDelete"
        @select="openMemoryDetail"
        @delete="openDeleteModal"
        @image-error="handleImageError"
        @image-load="handleImageLoad"
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
          <h3>{{ isEditing ? "추억 수정" : "새 추억 추가" }}</h3>
        </template>
        <template #body>
          <form @submit.prevent="saveMemory" class="memory-form">
            <div class="form-group">
              <label>Title</label>
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
              <label>Category</label>
              <select
                v-model="currentMemory.category"
                class="form-control"
                required
                @change="onCategoryChange"
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
                v-model="currentMemory.description"
                class="form-control"
                rows="3"
              ></textarea>
            </div>
            <div class="form-group">
              <label>Location</label>
              <input
                v-model="currentMemory.location"
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
                <div
                  v-if="canUpdate"
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
                    ></video>
                    <img
                      v-else
                      :src="getImageUrl(image)"
                      :alt="`Media ${index + 1}`"
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
          <div class="modal-footer-buttons">
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
  </div>
</template>

<script>
import {
  ref,
  computed,
  onBeforeUpdate,
  onMounted,
  onUnmounted,
  nextTick,
} from "vue";

const DDAY_END_DATE = "2026-02-21";
import { useStore } from "vuex";
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

    onBeforeUpdate(() => {
      previewVideos.value = [];
    });

    const updateIsMobileLike = () => {
      if (typeof window === "undefined" || !window.matchMedia) {
        isMobileLike.value = false;
        return;
      }
      // 실제 모바일(터치/coarse pointer) 우선, fallback으로 폭 기준
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

    const toLocalMidnight = (d) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x;
    };

    // "YYYY-MM-DD" 문자열을 로컬 자정으로 파싱(UTC 해석으로 인한 날짜 밀림 방지)
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
      dateType: "single", // "single" 또는 "range"
      startDate: "",
      endDate: "",
      category: "",
      description: "",
      location: "",
      images: [], // 단일 이미지에서 다중 이미지로 변경
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

    // 실제 카테고리만 포함하는 배열 (전체 제외)
    // 첫만남이 이미 있으면 첫만남 카테고리 제외
    const categoryOptions = computed(() => {
      const hasFirstMeet = memories.value.some(
        (memory) => memory.category === "first_meet"
      );
      return categories.filter((cat) => {
        if (cat.id === "all") return false;
        if (cat.id === "first_meet" && hasFirstMeet) return false;
        return true;
      });
    });

    // 권한 체크 computed 속성들
    const canCreate = computed(() =>
      store.getters["auth/canCreate"]("/dating_sys")
    );
    const canRead = computed(() => store.getters["auth/canRead"]("/dating_sys"));
    const canUpdate = computed(() =>
      store.getters["auth/canUpdate"]("/dating_sys")
    );
    const canDelete = computed(() =>
      store.getters["auth/canDelete"]("/dating_sys")
    );

    const hasUploadPermission = computed(() =>
      isEditing.value ? canUpdate.value : canCreate.value
    );

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

          // VIDEO
          if (el.readyState >= 2) {
            onDone();
            return;
          }
          el.addEventListener("loadeddata", onDone, { once: true });
          el.addEventListener("error", onDone, { once: true });
        });
      });
    };

    const fetchMemories = async () => {
      try {
        const response = await axios.get("/dating_sys");
        // 백엔드에서 받은 데이터를 프론트엔드 형식으로 변환
        memories.value = response.data.map((memory) => {
          let imagesArray = [];

          if (memory.images && typeof memory.images === "string") {
            try {
              imagesArray = JSON.parse(memory.images);
            } catch (e) {
              imagesArray = memory.image ? [memory.image] : [];
            }
          } else if (Array.isArray(memory.images)) {
            imagesArray = memory.images;
          } else if (memory.image) {
            imagesArray = [memory.image];
          }

          return {
            ...memory,
            images: imagesArray,
          };
        });
      } catch (error) {
        showToast("Failed to load memories", "danger");
      }
    };

    const openCreateModal = () => {
      isEditing.value = false;
      currentMemory.value = {
        title: "",
        date: "",
        dateType: "single",
        startDate: "",
        endDate: "",
        category: "",
        description: "",
        location: "",
        images: [],
      };
      showMemoryModal.value = true;
    };

    const openMemoryDetail = (memory) => {
      isEditing.value = true;

      // images 필드 처리 (JSON 문자열을 배열로 변환)
      let imagesArray = [];
      if (memory.images && typeof memory.images === "string") {
        try {
          imagesArray = JSON.parse(memory.images);
        } catch (e) {
          imagesArray = [];
        }
      } else if (Array.isArray(memory.images)) {
        imagesArray = memory.images;
      } else if (memory.image) {
        // 기존 단일 이미지가 있다면 배열로 변환
        imagesArray = [memory.image];
      }

      currentMemory.value = {
        ...memory,
        dateType: memory.dateType || "single", // 기존 데이터 호환성
        startDate: memory.startDate || "",
        endDate: memory.endDate || "",
        images: imagesArray,
      };

      showMemoryModal.value = true;
    };

    const closeMemoryModal = () => {
      stopAllPreviewVideos();
      showMemoryModal.value = false;
      currentMemory.value = {
        title: "",
        date: "",
        dateType: "single",
        startDate: "",
        endDate: "",
        category: "",
        description: "",
        location: "",
        images: [],
      };
    };

    const requestCloseMemoryModal = () => {
      if (modalLock.value) return;
      closeMemoryModal();
    };

    // 최대 날짜를 현재 날짜로 설정
    const maxDate = new Date().toISOString().split("T")[0];

    // 카테고리 변경 핸들러
    const onCategoryChange = () => {
      // 첫만남 또는 사귄날 카테고리 선택 시 자동으로 "기간" 모드로 전환
      if (
        currentMemory.value.category === "first_meet" ||
        currentMemory.value.category === "special"
      ) {
        // 기간 모드로 전환
        if (currentMemory.value.dateType === "single") {
          currentMemory.value.dateType = "range";
          // 기존 단일 날짜가 있으면 시작일로 이동
          if (currentMemory.value.date) {
            currentMemory.value.startDate = currentMemory.value.date;
            currentMemory.value.date = "";
          }
        }
      }
    };

    // 날짜 타입 변경 핸들러
    const onDateTypeChange = () => {
      // 날짜 타입이 변경되면 기존 날짜 값들 초기화
      if (currentMemory.value.dateType === "single") {
        currentMemory.value.startDate = "";
        currentMemory.value.endDate = "";
      } else {
        currentMemory.value.date = "";
      }
    };

    // 단일 날짜 검증
    const validateSingleDate = (event) => {
      const dateValue = event.target.value;
      if (!dateValue) {
        showToast("날짜를 입력해주세요.", "danger");
        return false;
      }

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

    // 기간 날짜 검증
    const validateRangeDate = () => {
      const startDate = currentMemory.value.startDate;
      const endDate = currentMemory.value.endDate;

      if (!startDate || !endDate) {
        return true; // 아직 입력이 완료되지 않았으면 검증하지 않음
      }

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

    // 기간 정보 계산 (computed)
    const dateRangeInfo = computed(() => {
      if (
        currentMemory.value.dateType !== "range" ||
        !currentMemory.value.startDate ||
        !currentMemory.value.endDate
      ) {
        return null;
      }

      const start = new Date(currentMemory.value.startDate);
      const end = new Date(currentMemory.value.endDate);

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
      if (currentMemory.value.dateType === "single") {
        return validateSingleDate(event);
      } else {
        return validateRangeDate();
      }
    };

    const saveMemory = async () => {
      // 필수 입력값 검사
      if (!currentMemory.value.title?.trim()) {
        showToast("제목을 입력해주세요.", "danger");
        return;
      }
      // 날짜 검증 (타입에 따라)
      if (currentMemory.value.dateType === "single") {
        if (!currentMemory.value.date?.trim()) {
          showToast("날짜를 입력해주세요.", "danger");
          return;
        }
      } else {
        if (
          !currentMemory.value.startDate?.trim() ||
          !currentMemory.value.endDate?.trim()
        ) {
          showToast("시작일과 종료일을 모두 입력해주세요.", "danger");
          return;
        }
      }
      if (!currentMemory.value.category?.trim()) {
        showToast("카테고리를 선택해주세요.", "danger");
        return;
      }

      // 날짜 유효성 검사
      if (currentMemory.value.dateType === "single") {
        if (
          !validateSingleDate({ target: { value: currentMemory.value.date } })
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
        const memoryData = {
          ...currentMemory.value,
          // 이미지 배열을 JSON 문자열로 변환
          images: currentMemory.value.images
            ? JSON.stringify(currentMemory.value.images)
            : null,
          // 기존 단일 이미지 필드도 유지 (호환성)
          image:
            currentMemory.value.images && currentMemory.value.images.length > 0
              ? currentMemory.value.images[0]
              : null,
        };

        if (isEditing.value) {
          await axios.put(`/dating_sys/${currentMemory.value.id}`, memoryData);
          showToast("추억이 수정되었습니다.");
        } else {
          await axios.post("/dating_sys", memoryData);
          showToast("추억이 생성되었습니다.");
        }
        await fetchMemories();
        closeMemoryModal();
      } catch (error) {
        showToast(
          isEditing.value
            ? "추억 수정에 실패했습니다."
            : "추억 생성에 실패했습니다.",
          "danger"
        );
      }
    };

    const filterByCategory = (categoryId) => {
      selectedCategory.value = categoryId;
    };

    const formatDate = (date) => {
      const d = parseYmdLocalMidnight(date);
      return d.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    // 메모리 날짜 포맷팅 (단일/기간 구분)
    const formatMemoryDate = (memory) => {
      if (memory.dateType === "range" && memory.startDate && memory.endDate) {
        const startFormatted = formatDate(memory.startDate);
        const endFormatted = formatDate(memory.endDate);
        return `${startFormatted} ~ ${endFormatted}`;
      } else {
        return formatDate(memory.date);
      }
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
        await axios.delete(`/dating_sys/${memoryToDelete.value.id}`);
        closeDeleteModal();
        await fetchMemories();
        showToast("추억이 삭제되었습니다.");
      } catch (error) {
        showToast("추억 삭제에 실패했습니다.", "danger");
      }
    };

    // 파일 업로드 관련 함수들
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

    const triggerFileInput = () => {
      // 수정 권한이 없는 경우 파일 선택을 막음
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
      if (!files.length) {
        return;
      }

      // 수정 권한이 없는 경우 업로드를 막음
      if (!hasUploadPermission.value) {
        showToast("미디어 업로드 권한이 없습니다.", "danger");
        return;
      }

      // 파일 개수 제한 (최대 20개)
      if (files.length > 20) {
        showToast("최대 20개의 미디어만 업로드할 수 있습니다.", "danger");
        return;
      }

      // 기존 이미지와 합쳐서 총 개수 확인
      const totalImages =
        (currentMemory.value.images?.length || 0) + files.length;
      if (totalImages > 20) {
        showToast("총 미디어 개수는 20개를 초과할 수 없습니다.", "danger");
        return;
      }

      uploading.value = true;

      try {
        const uploadPromises = files.map(async (file) => {
          // 파일 크기 확인 (환경 설정 기반)
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

          const response = await axios.post("/dating_sys/upload", formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });

          return response.data;
        });

        const uploadedImages = await Promise.all(uploadPromises);

        // 기존 이미지 배열에 새 이미지들 추가
        if (!currentMemory.value.images) {
          currentMemory.value.images = [];
        }
        currentMemory.value.images.push(...uploadedImages);

        showToast(`${uploadedImages.length}개의 미디어가 업로드되었습니다.`);
        // 업로드 완료 직후(오버레이가 내려가는 순간) 미디어 로드/디코딩으로 한 프레임 튀는 현상이 있어
        // 완료 후에도 잠깐 busy 오버레이를 유지하여 체감 깜빡임을 최소화
        postUploadSettling.value = true;
        await waitForModalMediaSettled(1500);
        await new Promise((r) => setTimeout(r, 300));
      } catch (error) {
        // 권한 에러 처리
        if (error.response?.status === 403) {
          showToast("미디어 업로드 권한이 없습니다.", "danger");
        } else {
          showToast(`미디어 업로드에 실패했습니다: ${error.message}`, "danger");
        }
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
      // 삭제 권한이 없는 경우 모달을 표시하지 않음
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
          // 서버에서 이미지 파일 삭제
          await axios.delete("/dating_sys/image", {
            params: { imagePath },
          });

          // 프론트엔드에서 이미지 배열에서 제거
          currentMemory.value.images.splice(imageToDelete.value, 1);
          showToast("미디어가 삭제되었습니다.");
          await waitForModalMediaSettled(800);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("미디어 삭제 실패:", error);

          // 권한 에러 처리
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
      // 이미 전체 URL인 경우 그대로 반환
      if (path.startsWith("http")) return path;
      // 상대 경로인 경우 현재 axios baseURL과 결합
      const baseURL = axios.defaults.baseURL;
      return `${baseURL}${path}`;
    };

    // 디데이 계산을 위한 computed 속성들
    const firstMeetDate = computed(() => {
      const firstMeet = memories.value.find(
        (memory) => memory.category === "first_meet"
      );
      if (!firstMeet) return null;
      // dateType이 range이고 startDate가 있으면 startDate 사용, 아니면 date 사용
      return firstMeet.dateType === "range" && firstMeet.startDate
        ? firstMeet.startDate
        : firstMeet.date;
    });

    const firstMeetEndDate = computed(() => {
      const firstMeet = memories.value.find(
        (memory) => memory.category === "first_meet"
      );
      // dateType이 range이고 endDate가 있으면 endDate 반환
      return firstMeet && firstMeet.dateType === "range" && firstMeet.endDate
        ? firstMeet.endDate
        : null;
    });

    const specialDate = computed(() => {
      const special = memories.value.find(
        (memory) => memory.category === "special"
      );
      if (!special) return null;
      // dateType이 range이고 startDate가 있으면 startDate 사용, 아니면 date 사용
      return special.dateType === "range" && special.startDate
        ? special.startDate
        : special.date;
    });

    const specialEndDate = computed(() => {
      const special = memories.value.find(
        (memory) => memory.category === "special"
      );
      // dateType이 range이고 endDate가 있으면 endDate 반환
      return special && special.dateType === "range" && special.endDate
        ? special.endDate
        : null;
    });

    const ddayBaseDate = parseYmdLocalMidnight(DDAY_END_DATE);

    const firstMeetDays = computed(() => {
      if (!firstMeetDate.value) return 0;
      const firstMeet = parseYmdLocalMidnight(firstMeetDate.value);
      const diffTime = ddayBaseDate - firstMeet;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    });

    const specialDays = computed(() => {
      if (!specialDate.value) return 0;
      const special = parseYmdLocalMidnight(specialDate.value);
      const diffTime = ddayBaseDate - special;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    });

    // 이미지 URL을 미리 계산하고 카테고리 필터링을 적용하는 computed 함수
    const processedMemories = computed(() => {
      const query = searchQuery.value.trim().toLowerCase();

      // 먼저 카테고리 필터링 적용
      let filteredMemories = memories.value;
      if (selectedCategory.value !== "all") {
        filteredMemories = filteredMemories.filter(
          (memory) => memory.category === selectedCategory.value
        );
      }
      if (query) {
        filteredMemories = filteredMemories.filter((memory) => {
          const target = [memory.title, memory.description, memory.location]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return target.includes(query);
        });
      }

      // 그 다음 이미지 URL 처리
      const processed = filteredMemories.map((memory) => {
        const mediaList = Array.isArray(memory.images)
          ? memory.images
          : memory.image
          ? [memory.image]
          : [];
        const processedMedia = mediaList
          .map((mediaItem, index) => {
            const url = getImageUrl(mediaItem);
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
          ...memory,
          processedMedia,
          imageCount,
          videoCount,
          totalMediaCount: processedMedia.length,
          firstVideoIndex: firstVideo ? firstVideo.originalIndex : -1,
        };
      });

      if (mediaFilter.value === "image") {
        return processed.filter((memory) => memory.imageCount > 0);
      }

      if (mediaFilter.value === "video") {
        return processed.filter((memory) => memory.videoCount > 0);
      }

      return processed;
    });

    const applySearch = () => {
      searchQuery.value = searchInput.value.trim();
    };

    const setMediaFilter = (type) => {
      mediaFilter.value = type;
    };

    const handleImageError = (event) => {
      // 이미지 로드 실패 시 숨기기
      event.target.style.display = "none";
    };

    const handleImageLoad = (event) => {
      // 이미지 로드 성공 시 표시
      event.target.style.display = "block";
    };

    // 초기 데이터 로드
    fetchMemories();

    return {
      memories,
      searchQuery,
      searchInput,
      showMemoryModal,
      currentMemory,
      categories,
      categoryOptions,
      selectedCategory,
      mediaFilter,
      mediaFilterOptions,
      processedMemories,
      isEditing,
      openCreateModal,
      openMemoryDetail,
      closeMemoryModal,
      saveMemory,
      filterByCategory,
      formatDate,
      formatMemoryDate,
      getCategoryIcon,
      showDeleteModal,
      openDeleteModal,
      closeDeleteModal,
      deleteMemory,
      maxDate,
      validateDate,
      // 파일 업로드 관련
      uploading,
      isSelectingFiles,
      postUploadSettling,
      isMobileLike,
      modalLock,
      fileInput,
      triggerFileInput,
      handleFileUpload,
      requestCloseMemoryModal,
      confirmRemoveImage,
      removeImage,
      previewVideos,
      handlePreviewVideoLoaded,
      getImageUrl,
      isVideoMedia,
      handleImageError,
      handleImageLoad,
      setMediaFilter,
      // 이미지 삭제 모달 관련
      showImageDeleteModal,
      closeImageDeleteModal,
      // 권한 체크
      canCreate,
      canRead,
      canUpdate,
      canDelete,
      hasUploadPermission,
      // 디데이 관련
      firstMeetDate,
      firstMeetEndDate,
      specialDate,
      specialEndDate,
      firstMeetDays,
      specialDays,
      // 새로운 날짜 관련
      onCategoryChange,
      onDateTypeChange,
      validateSingleDate,
      validateRangeDate,
      dateRangeInfo,
      applySearch,
    };
  },
};
</script>

<style src="@/assets/css/dating.css" scoped></style>
