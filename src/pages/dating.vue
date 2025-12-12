<template>
  <div class="dating-container">
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
          <div class="dday-value">
            D+{{ firstMeetDays }}
          </div>
          <div class="dday-date">
            {{ formatDate(firstMeetDate) }}
          </div>
        </div>
        <div v-if="specialDate" class="dday-item">
          <div class="dday-label">
            <i class="fas fa-star"></i>
            사귄날
          </div>
          <div class="dday-value">
            D+{{ specialDays }}
          </div>
          <div class="dday-date">
            {{ formatDate(specialDate) }}
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

    <!-- 추억 생성/수정 모달 -->
    <teleport to="#modal">
      <Modal v-if="showMemoryModal" @close="closeMemoryModal">
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
                <div v-if="currentMemory.dateType === 'single'" class="single-date-input">
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
                <div v-if="currentMemory.dateType === 'range'" class="range-date-inputs">
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
                    <span class="range-duration">{{ dateRangeInfo.duration }}일</span>
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
                <div v-if="canUpdate" class="image-upload-area" @click="triggerFileInput">
                  <div class="upload-placeholder">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <p>이미지 또는 동영상을 업로드하세요</p>
                    <small>클릭하여 파일 선택 (여러 개 선택 가능)</small>
                  </div>
                </div>
                
                <!-- 업로드된 이미지들 -->
                <div v-if="currentMemory.images && currentMemory.images.length > 0" class="uploaded-images">
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
import { ref, computed, onBeforeUpdate } from "vue";
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
    const fileInput = ref(null);
    const showImageDeleteModal = ref(false);
    const imageToDelete = ref(null);
    const previewVideos = ref([]);

    onBeforeUpdate(() => {
      previewVideos.value = [];
    });

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
      const hasFirstMeet = memories.value.some(memory => memory.category === 'first_meet');
      return categories.filter((cat) => {
        if (cat.id === "all") return false;
        if (cat.id === "first_meet" && hasFirstMeet) return false;
        return true;
      });
    });
    
    // 권한 체크 computed 속성들
    const canCreate = computed(() => store.getters['auth/canCreate']('/dating'));
    const canRead = computed(() => store.getters['auth/canRead']('/dating'));
    const canUpdate = computed(() => store.getters['auth/canUpdate']('/dating'));
    const canDelete = computed(() => store.getters['auth/canDelete']('/dating'));

    const hasUploadPermission = computed(() =>
      isEditing.value ? canUpdate.value : canCreate.value
    );


    const fetchMemories = async () => {
      try {
        const response = await axios.get("/dating");
        // 백엔드에서 받은 데이터를 프론트엔드 형식으로 변환
        memories.value = response.data.map(memory => {
          let imagesArray = [];
          
          if (memory.images && typeof memory.images === 'string') {
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
            images: imagesArray
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
      if (memory.images && typeof memory.images === 'string') {
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
        images: imagesArray
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

    // 최대 날짜를 현재 날짜로 설정
    const maxDate = new Date().toISOString().split("T")[0];

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
      if (currentMemory.value.dateType !== "range" || 
          !currentMemory.value.startDate || 
          !currentMemory.value.endDate) {
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
        period: `${startFormatted} ~ ${endFormatted}`
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
        if (!currentMemory.value.startDate?.trim() || !currentMemory.value.endDate?.trim()) {
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
        if (!validateSingleDate({ target: { value: currentMemory.value.date } })) {
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
          images: currentMemory.value.images ? JSON.stringify(currentMemory.value.images) : null,
          // 기존 단일 이미지 필드도 유지 (호환성)
          image: currentMemory.value.images && currentMemory.value.images.length > 0 
            ? currentMemory.value.images[0] 
            : null
        };


        if (isEditing.value) {
          await axios.put(
            `/dating/${currentMemory.value.id}`,
            memoryData
          );
          showToast("추억이 수정되었습니다.");
        } else {
          await axios.post("/dating", memoryData);
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
      return new Date(date).toLocaleDateString("ko-KR", {
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
        await axios.delete(`/dating/${memoryToDelete.value.id}`);
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

      const playPromise = videoElement.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch((error) => {
          // eslint-disable-next-line no-console
          console.error("미리보기 동영상 자동재생 실패:", error);
        });
      }
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
      
      fileInput.value?.click();
    };

    const handleFileUpload = async (event) => {
      const files = Array.from(event.target.files);
      if (!files.length) return;
      
      // 수정 권한이 없는 경우 업로드를 막음
      if (!hasUploadPermission.value) {
        showToast("미디어 업로드 권한이 없습니다.", "danger");
        return;
      }

      // 파일 개수 제한 (최대 10개)
      if (files.length > 10) {
        showToast("최대 10개의 미디어만 업로드할 수 있습니다.", "danger");
        return;
      }

      // 기존 이미지와 합쳐서 총 개수 확인
      const totalImages = (currentMemory.value.images?.length || 0) + files.length;
      if (totalImages > 10) {
        showToast("총 미디어 개수는 10개를 초과할 수 없습니다.", "danger");
        return;
      }

      uploading.value = true;
      
      try {
        const uploadPromises = files.map(async (file) => {
          // 파일 크기 확인 (환경 설정 기반)
          const isImage = isImageFile(file);
          const isVideo = isVideoFile(file);

          if (!isImage && !isVideo) {
            throw new Error(`${file.name}: 이미지 또는 동영상 파일만 업로드 가능합니다.`);
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
          formData.append('file', file);

          const response = await axios.post('/dating/upload', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
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
      } catch (error) {
        // 권한 에러 처리
        if (error.response?.status === 403) {
          showToast("미디어 업로드 권한이 없습니다.", "danger");
        } else {
          showToast(`미디어 업로드에 실패했습니다: ${error.message}`, "danger");
        }
      } finally {
        uploading.value = false;
        // 파일 입력 초기화
        if (fileInput.value) {
          fileInput.value.value = '';
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
          await axios.delete('/dating/image', {
            params: { imagePath }
          });
          
          // 프론트엔드에서 이미지 배열에서 제거
          currentMemory.value.images.splice(imageToDelete.value, 1);
          showToast("미디어가 삭제되었습니다.");
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('미디어 삭제 실패:', error);
          
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
      if (!path || path.trim() === '') return '';
      // 이미 전체 URL인 경우 그대로 반환
      if (path.startsWith('http')) return path;
      // 상대 경로인 경우 현재 axios baseURL과 결합
      const baseURL = axios.defaults.baseURL;
      return `${baseURL}${path}`;
    };

    // 디데이 계산을 위한 computed 속성들
    const firstMeetDate = computed(() => {
      const firstMeet = memories.value.find(memory => memory.category === 'first_meet');
      return firstMeet ? firstMeet.date : null;
    });

    const specialDate = computed(() => {
      const special = memories.value.find(memory => memory.category === 'special');
      return special ? special.date : null;
    });

    const firstMeetDays = computed(() => {
      if (!firstMeetDate.value) return 0;
      const today = new Date();
      const firstMeet = new Date(firstMeetDate.value);
      const diffTime = today - firstMeet;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    });

    const specialDays = computed(() => {
      if (!specialDate.value) return 0;
      const today = new Date();
      const special = new Date(specialDate.value);
      const diffTime = today - special;
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
          const target = [
            memory.title,
            memory.description,
            memory.location,
          ]
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

        const videoCount = processedMedia.filter((media) => media.isVideo).length;
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
      event.target.style.display = 'none';
    };

    const handleImageLoad = (event) => {
      // 이미지 로드 성공 시 표시
      event.target.style.display = 'block';
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
      fileInput,
      triggerFileInput,
      handleFileUpload,
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
      specialDate,
      firstMeetDays,
      specialDays,
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

<style scoped>
.dating-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  --timeline-primary-color: #e91e63;
  --timeline-line-color: #ffc1cc;
  --timeline-filter-bg: #f0f0f0;
  --timeline-filter-color: #333333;
  --timeline-active-bg: #e91e63;
  --timeline-active-color: #ffffff;
  --timeline-date-bg: #fce4ec;
  --timeline-date-color: #e91e63;
  --timeline-date-shadow: 0 6px 12px rgba(233, 30, 99, 0.1);
  --timeline-card-bg: #ffffff;
  --timeline-card-border: 1px solid #fce4ec;
  --timeline-card-shadow: 0 4px 12px rgba(233, 30, 99, 0.1);
  --timeline-heading-color: #e91e63;
  --timeline-text-color: #666666;
  --timeline-more-media-bg: rgba(233, 30, 99, 0.8);
  --timeline-more-media-color: #ffffff;
  --timeline-media-image-bg: rgba(233, 30, 99, 0.1);
  --timeline-media-image-color: #c2185b;
  --timeline-media-video-bg: rgba(103, 58, 183, 0.12);
  --timeline-media-video-color: #5e35b1;
  --timeline-icon-shadow: 0 2px 8px rgba(233, 30, 99, 0.3);
  --timeline-icon-offset: 58px;
  --timeline-icon-offset-mobile: 26px;
  --timeline-icon-size: 42px;
  --timeline-icon-size-mobile: 20px;
  --timeline-icon-font-size: 1.05rem;
  --timeline-icon-font-size-mobile: 0.7rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 50px;
}

.page-header h2 {
  font-size: 2.5rem;
  color: #e91e63;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin: 0 auto 30px;
  max-width: 400px;
  background: #ffffff;
  border: 1px solid #f0c2d0;
  border-radius: 999px;
  box-shadow: 0 4px 10px rgba(233, 30, 99, 0.08);
}

.search-input {
  flex: 1;
  border: none;
  font-size: 1rem;
  color: #444;
  background: transparent;
  outline: none;
}

.search-input::placeholder {
  color: #b999ab;
}

.search-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.search-submit:hover,
.search-submit:focus {
  transform: scale(1.05);
}

.search-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* 디데이 섹션 스타일 */
.dday-section {
  margin-bottom: 40px;
  padding: 20px;
  background: linear-gradient(135deg, #fce4ec 0%, #f8bbd9 100%);
  border-radius: 15px;
  box-shadow: 0 4px 15px rgba(233, 30, 99, 0.1);
}

.dday-container {
  display: flex;
  gap: 30px;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

.dday-item {
  text-align: center;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(233, 30, 99, 0.15);
  min-width: 200px;
  transition: transform 0.3s ease;
}

.dday-item:hover {
  transform: translateY(-5px);
}

.dday-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  color: #e91e63;
  margin-bottom: 10px;
}

.dday-label i {
  font-size: 1.2rem;
}

.dday-value {
  font-size: 2.5rem;
  font-weight: bold;
  color: #e91e63;
  margin-bottom: 8px;
  text-shadow: 0 2px 4px rgba(233, 30, 99, 0.2);
}

.dday-date {
  font-size: 0.9rem;
  color: #666;
  font-weight: 500;
}

/* 타임라인에서도 설명 줄바꿈이 유지되도록 */
.dating-container :deep(.timeline-body p) {
  white-space: pre-line;
}

.dating-container :deep(.timeline-footer) {
  flex-wrap: wrap;
  gap: 10px;
}

.memory-tags {
  display: flex;
  gap: 10px;
}

.partner-tag {
  background: #fce4ec;
  color: #e91e63;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
}

.partner-tag i {
  margin-right: 5px;
}

.timeline-image {
  margin: 10px 0;
}

.memory-image {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

/* 모바일 스타일 */
@media (max-width: 768px) {
  .page-header h2 {
    font-size: 1.5rem;
  }

  .dday-section {
    margin-bottom: 25px;
    padding: 12px;
  }

  .dday-container {
    gap: 15px;
    flex-direction: row;
  }

  .dday-item {
    min-width: 120px;
    max-width: 140px;
    padding: 12px 8px;
    flex: 1;
  }

  .dday-value {
    font-size: 1.8rem;
    margin-bottom: 5px;
  }

  .dday-label {
    font-size: 0.9rem;
    margin-bottom: 8px;
  }

  .dday-label i {
    font-size: 1rem;
  }

  .dday-date {
    font-size: 0.75rem;
  }
  
  .dating-container :deep(.timeline-footer) {
    flex-direction: column;
    align-items: flex-start;
  }
}

.memory-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.delete-btn {
  margin-left: 10px;
  padding: 2px 8px;
  float: right;
}

.modal-footer-buttons {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.modal-footer-buttons > div:last-child {
  display: flex;
  gap: 8px;
}

/* 이미지 업로드 스타일 */
.image-upload-container {
  margin-top: 10px;
}

.image-upload-area {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #fafafa;
}

.image-upload-area:hover {
  border-color: #e91e63;
  background: #fef7f7;
}

.upload-placeholder {
  color: #666;
}

.upload-placeholder i {
  font-size: 2rem;
  color: #e91e63;
  margin-bottom: 10px;
  display: block;
}

.upload-placeholder p {
  margin: 10px 0 5px 0;
  font-weight: 500;
}

.upload-placeholder small {
  color: #999;
}

.image-preview {
  position: relative;
  display: inline-block;
}

.image-preview img {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.remove-image {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ff4444;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.3s ease;
}

.remove-image:hover {
  background: #cc0000;
  transform: scale(1.1);
}

.upload-progress {
  margin-top: 10px;
  text-align: center;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 5px;
}

.progress-fill {
  height: 100%;
  background: #e91e63;
  border-radius: 2px;
  animation: progress 2s ease-in-out infinite;
}

@keyframes progress {
  0% { width: 0%; }
  50% { width: 70%; }
  100% { width: 100%; }
}

.upload-progress p {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
}

/* 다중 이미지 업로드 스타일 */
.uploaded-images {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.image-preview-item {
  position: relative;
  display: inline-block;
}

.image-preview-item .media-preview {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: transform 0.3s ease;
}

.image-preview-item .media-preview:hover {
  transform: scale(1.05);
}

.image-preview-item .media-preview-video {
  background: #000;
}

.image-preview-item .remove-image {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ff4444;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.image-preview-item .remove-image:hover {
  background: #cc0000;
  transform: scale(1.1);
}

/* 타임라인 이미지 갤러리 스타일 */
.timeline-images {
  margin: 20px 0;
}

.image-gallery {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.image-gallery .memory-image {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: transform 0.3s ease;
}

.image-gallery .memory-image:hover {
  transform: scale(1.1);
}

.memory-video {
  background: #000;
  object-fit: cover;
}

.media-thumbnail {
  position: relative;
}

.video-overlay-indicator {
  position: absolute;
  bottom: 6px;
  right: 6px;
  background: rgba(233, 30, 99, 0.85);
  color: #fff;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.25);
}

.video-overlay-indicator i {
  margin-left: 2px;
}

.more-media {
  background: rgba(233, 30, 99, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
  min-width: 40px;
  text-align: center;
}

/* 날짜 선택 스타일 */
.date-type-selection {
  margin-top: 10px;
}

.date-type-options {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 500;
  color: #666;
  transition: color 0.3s ease;
}

.radio-option:hover {
  color: #e91e63;
}

.radio-option input[type="radio"] {
  margin: 0;
  accent-color: #e91e63;
}

.radio-option input[type="radio"]:checked + span {
  color: #e91e63;
  font-weight: 600;
}

.single-date-input {
  margin-top: 10px;
}

.range-date-inputs {
  margin-top: 10px;
}

.date-input-group {
  margin-bottom: 15px;
}

.date-input-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #666;
}

.date-range-info {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 12px;
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.range-duration {
  font-weight: 600;
  color: #e91e63;
  font-size: 1.1rem;
}

.range-period {
  color: #666;
  font-size: 0.9rem;
}

/* 모바일에서 날짜 선택 조정 */
@media (max-width: 768px) {
  .date-type-options {
    flex-direction: column;
    gap: 10px;
  }
  
  .date-range-info {
    flex-direction: column;
    gap: 8px;
    text-align: center;
  }
  
  .range-duration {
    font-size: 1rem;
  }
  
  .range-period {
    font-size: 0.8rem;
  }
}

/* 모바일에서 이미지 갤러리 조정 */
@media (max-width: 768px) {
  .uploaded-images {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 10px;
  }
  
  .image-preview-item .media-preview {
    height: 100px;
  }
  
  .image-gallery .memory-image {
    width: 60px;
    height: 60px;
  }
  
  .more-images {
    padding: 6px 10px;
    font-size: 0.8rem;
  }
}
</style>
