<template>
  <teleport to="#modal">
    <Modal
      v-if="show"
      :close-on-backdrop="!modalLock"
      :close-on-esc="!modalLock"
      :close-disabled="modalLock"
      :busy="isMobileLike && (uploading || postUploadSettling)"
      busy-text="업로드 중..."
      @close="requestClose"
    >
      <template #header>
        <h3>{{ isViewMode ? localMemory.title : (isEditing ? "추억 수정" : "새 추억 추가") }}</h3>
      </template>
      <template #body>
        <!-- 조회 모드 -->
        <div v-if="isViewMode" class="memory-view">
          <div class="view-row">
            <span class="view-label">날짜</span>
            <span class="view-value">{{ formatMemoryDate(localMemory) }}</span>
          </div>
          <div class="view-row">
            <span class="view-label">카테고리</span>
            <span class="view-value">
              <i :class="getCategoryIcon(localMemory.category)"></i>
              {{ getCategoryName(localMemory.category) }}
            </span>
          </div>
          <div v-if="localMemory.description" class="view-row">
            <span class="view-label">설명</span>
            <span class="view-value view-description">{{ localMemory.description }}</span>
          </div>
          <div v-if="localMemory.location" class="view-row">
            <span class="view-label">장소</span>
            <span class="view-value">
              <i class="fas fa-map-marker-alt"></i>
              {{ localMemory.location }}
            </span>
          </div>
          <div v-if="localMemory.images && localMemory.images.length > 0" class="view-row view-media-row">
            <span class="view-label">미디어</span>
            <div class="view-media-grid">
              <div
                v-for="(image, index) in localMemory.images"
                :key="index"
                class="view-media-item"
                @click="$emit('open-lightbox', { items: lightboxItemsForView, index })"
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
        <form v-else class="memory-form" @submit.prevent="onSave">
          <div class="form-group">
            <label>제목</label>
            <input
              v-model="localMemory.title"
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
                    v-model="localMemory.dateType"
                    type="radio"
                    value="single"
                    @change="onDateTypeChange"
                  />
                  <span>하루</span>
                </label>
                <label class="radio-option">
                  <input
                    v-model="localMemory.dateType"
                    type="radio"
                    value="range"
                    @change="onDateTypeChange"
                  />
                  <span>기간</span>
                </label>
              </div>

              <div v-if="localMemory.dateType === 'single'" class="single-date-input">
                <input
                  v-model="localMemory.date"
                  type="date"
                  class="form-control"
                  required
                  :max="maxDate"
                  placeholder="날짜를 선택하세요"
                  @input="validateSingleDate"
                />
              </div>

              <div v-if="localMemory.dateType === 'range'" class="range-date-inputs">
                <div class="date-input-group">
                  <label>시작일</label>
                  <input
                    v-model="localMemory.startDate"
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
                    v-model="localMemory.endDate"
                    type="date"
                    class="form-control"
                    required
                    :max="maxDate"
                    :min="localMemory.startDate"
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
            <label>카테고리</label>
            <select v-model="localMemory.category" class="form-control" required>
              <option value="" disabled>카테고리를 선택하세요</option>
              <option v-for="cat in categoryOptions" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>설명</label>
            <textarea v-model="localMemory.description" class="form-control" rows="3"></textarea>
          </div>
          <div class="form-group">
            <label>장소</label>
            <input v-model="localMemory.location" type="text" class="form-control" />
          </div>
          <div class="form-group">
            <label>이미지 / 동영상</label>
            <div class="image-upload-container">
              <input
                ref="fileInput"
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.webp,.heic,.heif,.mp4,.mov,.mkv,.webm,.avi,.m4v,.3gp"
                multiple
                style="display: none"
                @change="handleFileUpload"
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

              <div
                v-if="localMemory.images && localMemory.images.length > 0"
                class="uploaded-images"
              >
                <div
                  v-for="(image, index) in localMemory.images"
                  :key="index"
                  class="image-preview-item"
                >
                  <video
                    v-if="isVideoMedia(image)"
                    ref="previewVideos"
                    :src="getImageUrl(image)"
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
                    @error="(e) => { e.target.style.display='none'; e.target.nextElementSibling.style.display='flex'; }"
                  />
                  <div class="media-error-placeholder" style="display:none">
                    <i class="fas fa-image"></i>
                    <span>미리보기 불가</span>
                  </div>
                  <button
                    v-if="canDelete"
                    type="button"
                    class="remove-image"
                    title="미디어 삭제"
                    @click.stop="confirmRemoveImage(index)"
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
              @click="$emit('request-delete', localMemory)"
            >
              삭제
            </button>
          </div>
          <div>
            <button type="button" class="btn btn-secondary" @click="$emit('close')">닫기</button>
            <button
              v-if="canUpdate"
              type="button"
              class="btn btn-primary"
              @click="$emit('enter-edit')"
            >
              수정
            </button>
          </div>
        </div>
        <!-- 편집/생성 모드 푸터 -->
        <div v-else class="modal-footer-buttons">
          <div>
            <button
              v-if="isEditing && canDelete"
              type="button"
              class="btn btn-danger"
              @click="$emit('request-delete', localMemory)"
            >
              삭제
            </button>
          </div>
          <div>
            <button type="button" class="btn btn-secondary" @click="$emit('close')">닫기</button>
            <button
              v-if="isEditing ? canUpdate : canCreate"
              type="button"
              class="btn btn-primary"
              @click="onSave"
            >
              {{ isEditing ? "수정" : "저장" }}
            </button>
          </div>
        </div>
      </template>
    </Modal>
  </teleport>

  <!-- 이미지 삭제 확인 모달 -->
  <teleport to="#modal">
    <DeleteModal
      v-if="showImageDeleteModal"
      title="미디어 삭제"
      message="이 미디어를 정말 삭제하시겠습니까?"
      @close="closeImageDeleteModal"
      @delete="removeImage"
    />
  </teleport>
</template>

<script>
import { ref, computed, watch, nextTick, onBeforeUpdate, onMounted, onUnmounted } from "vue";
import { useStore } from "vuex";
import axios from "@/axios";
import Modal from "@/components/Modal.vue";
import DeleteModal from "@/components/DeleteModal.vue";
import { useToast } from "@/composables/toast";
import { apiErrorMessage } from "@/utils/apiError";
import { useUploadLimits } from "@/composables/useUploadLimits";
import { useMediaUtils } from "@/composables/useMediaUtils";
import { useMidnightTicker } from "@/composables/useMidnightTicker";

const EMPTY_MEMORY = {
  title: "", date: "", dateType: "single",
  startDate: "", endDate: "", category: "",
  description: "", location: "", images: [],
};

export default {
  name: "MemoryFormModal",
  components: { Modal, DeleteModal },
  props: {
    show: { type: Boolean, default: false },
    memory: { type: Object, default: null },
    isEditing: { type: Boolean, default: false },
    isViewMode: { type: Boolean, default: false },
    categories: { type: Array, default: () => [] },
    categoryOptions: { type: Array, default: () => [] },
  },
  emits: ["close", "save", "request-delete", "enter-edit", "open-lightbox"],
  setup(props, { emit }) {
    const store = useStore();
    const { showToast } = useToast();
    const {
      maxImageSizeBytes, maxVideoSizeBytes,
      maxImageLimitLabel, maxVideoLimitLabel,
    } = useUploadLimits();
    const {
      isImageFile, isVideoFile, isVideoMedia,
      extractPath, getImageUrl, parseImagesArray,
    } = useMediaUtils();
    const { nowTick } = useMidnightTicker();

    const localMemory = ref({ ...EMPTY_MEMORY });
    const uploading = ref(false);
    const isSelectingFiles = ref(false);
    const postUploadSettling = ref(false);
    const isMobileLike = ref(false);
    const fileInput = ref(null);
    const previewVideos = ref([]);
    const showImageDeleteModal = ref(false);
    const imageToDelete = ref(null);

    onBeforeUpdate(() => { previewVideos.value = []; });

    const canCreate = computed(() => store.getters["auth/canCreate"]("/dating"));
    const canUpdate = computed(() => store.getters["auth/canUpdate"]("/dating"));
    const canDelete = computed(() => store.getters["auth/canDelete"]("/dating"));
    const hasUploadPermission = computed(() =>
      props.isEditing ? canUpdate.value : canCreate.value,
    );
    const modalLock = computed(() => uploading.value || isSelectingFiles.value);

    const updateIsMobileLike = () => {
      if (typeof window === "undefined" || !window.matchMedia) {
        isMobileLike.value = false;
        return;
      }
      const coarse = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
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

    const stopAllPreviewVideos = () => {
      previewVideos.value.forEach((v) => {
        if (!v) return;
        v.pause();
        v.currentTime = 0;
      });
    };

    watch(
      () => props.show,
      (show) => {
        if (show) {
          if (props.memory) {
            localMemory.value = {
              ...props.memory,
              dateType: props.memory.dateType || "single",
              startDate: props.memory.startDate || "",
              endDate: props.memory.endDate || "",
              images: parseImagesArray(props.memory),
            };
          } else {
            localMemory.value = { ...EMPTY_MEMORY, images: [] };
          }
        } else {
          stopAllPreviewVideos();
        }
      },
      { immediate: true },
    );

    const requestClose = () => {
      if (modalLock.value) return;
      emit("close");
    };

    const getCategoryName = (categoryId) => {
      const c = props.categories.find((cat) => cat.id === categoryId);
      return c ? c.name : categoryId;
    };
    const getCategoryIcon = (categoryId) => {
      const c = props.categories.find((cat) => cat.id === categoryId);
      return c ? c.icon : "fas fa-heart";
    };

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

    const maxDate = computed(() => {
      const d = new Date(nowTick.value);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    });

    const onDateTypeChange = () => {
      if (localMemory.value.dateType === "single") {
        localMemory.value.startDate = "";
        localMemory.value.endDate = "";
      } else {
        localMemory.value.date = "";
      }
    };

    const validateSingleDate = (event) => {
      const dateValue = event.target.value;
      if (!dateValue) { showToast("날짜를 입력해주세요.", "danger"); return false; }
      if (isNaN(new Date(dateValue).getTime())) {
        showToast("올바른 날짜를 입력해주세요.", "danger");
        localMemory.value.date = "";
        return false;
      }
      if (dateValue > maxDate.value) {
        showToast("미래의 날짜는 입력할 수 없습니다.", "danger");
        localMemory.value.date = "";
        return false;
      }
      return true;
    };

    const validateRangeDate = () => {
      const startDate = localMemory.value.startDate;
      const endDate = localMemory.value.endDate;
      if (!startDate || !endDate) return true;
      if (isNaN(new Date(startDate).getTime()) || isNaN(new Date(endDate).getTime())) {
        showToast("올바른 날짜를 입력해주세요.", "danger"); return false;
      }
      if (startDate > maxDate.value || endDate > maxDate.value) {
        showToast("미래의 날짜는 입력할 수 없습니다.", "danger"); return false;
      }
      if (startDate > endDate) {
        showToast("시작일은 종료일보다 이전이어야 합니다.", "danger");
        localMemory.value.endDate = "";
        return false;
      }
      return true;
    };

    const dateRangeInfo = computed(() => {
      if (
        localMemory.value.dateType !== "range" ||
        !localMemory.value.startDate ||
        !localMemory.value.endDate
      ) return null;
      const start = new Date(localMemory.value.startDate);
      const end = new Date(localMemory.value.endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return null;
      const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      return {
        duration,
        period: `${start.toLocaleDateString("ko-KR")} ~ ${end.toLocaleDateString("ko-KR")}`,
      };
    });

    const lightboxItemsForView = computed(() =>
      (localMemory.value.images || []).map((img) => ({
        url: getImageUrl(img),
        isVideo: isVideoMedia(img),
      })),
    );

    const onSave = () => {
      if (!localMemory.value.title?.trim()) {
        showToast("제목을 입력해주세요.", "danger"); return;
      }
      if (localMemory.value.dateType === "single") {
        if (!localMemory.value.date?.trim()) {
          showToast("날짜를 입력해주세요.", "danger"); return;
        }
      } else if (!localMemory.value.startDate?.trim() || !localMemory.value.endDate?.trim()) {
        showToast("시작일과 종료일을 모두 입력해주세요.", "danger"); return;
      }
      if (!localMemory.value.category?.trim()) {
        showToast("카테고리를 선택해주세요.", "danger"); return;
      }

      if (localMemory.value.dateType === "single") {
        if (!validateSingleDate({ target: { value: localMemory.value.date } })) return;
      } else if (!validateRangeDate()) return;

      emit("save", {
        ...localMemory.value,
        images: localMemory.value.images
          ? JSON.stringify(localMemory.value.images)
          : null,
        image:
          localMemory.value.images && localMemory.value.images.length > 0
            ? localMemory.value.images[0]
            : null,
      });
    };

    // ── 미디어 업로드 ────────────────────────────────────
    const triggerFileInput = () => {
      if (!hasUploadPermission.value) {
        showToast("미디어 업로드 권한이 없습니다.", "danger");
        return;
      }
      isSelectingFiles.value = true;
      fileInput.value?.click();
    };

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
        const finish = () => { if (!finished) { finished = true; resolve(); } };
        const timer = setTimeout(finish, timeoutMs);
        const onDone = () => {
          done += 1;
          if (done >= nodes.length) { clearTimeout(timer); finish(); }
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

    const handleFileUpload = async (event) => {
      isSelectingFiles.value = false;
      const files = Array.from(event.target.files);
      if (!files.length) return;

      if (!hasUploadPermission.value) {
        showToast("미디어 업로드 권한이 없습니다.", "danger"); return;
      }
      if (files.length > 20) {
        showToast("최대 20개의 미디어만 업로드할 수 있습니다.", "danger"); return;
      }
      const total = (localMemory.value.images?.length || 0) + files.length;
      if (total > 20) {
        showToast("총 미디어 개수는 20개를 초과할 수 없습니다.", "danger"); return;
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
          const response = await axios.post("/api/dating/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          return response.data;
        });

        const uploaded = await Promise.all(uploadPromises);
        if (!localMemory.value.images) localMemory.value.images = [];
        localMemory.value.images.push(...uploaded);

        showToast(`${uploaded.length}개의 미디어가 업로드되었습니다.`);
        postUploadSettling.value = true;
        await waitForModalMediaSettled(1500);
        await new Promise((r) => setTimeout(r, 300));
      } catch (error) {
        showToast(
          error?.response
            ? apiErrorMessage(error, "미디어 업로드에 실패했습니다.")
            : error.message || "미디어 업로드에 실패했습니다.",
          "danger",
        );
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
      if (imageToDelete.value !== null && localMemory.value.images) {
        const target = localMemory.value.images[imageToDelete.value];
        const imagePath = extractPath(target);
        if (!imagePath) {
          showToast("미디어 경로를 찾을 수 없습니다.", "danger");
          closeImageDeleteModal();
          return;
        }
        try {
          await axios.delete("/api/dating/image", { params: { imagePath } });
          localMemory.value.images.splice(imageToDelete.value, 1);
          showToast("미디어가 삭제되었습니다.");
          await waitForModalMediaSettled(800);
        } catch (error) {
          showToast(apiErrorMessage(error, "미디어 삭제에 실패했습니다."), "danger");
        }
      }
      closeImageDeleteModal();
    };

    const handlePreviewVideoLoaded = (event) => {
      const v = event?.target;
      if (!v) return;
      v.muted = true;
      v.currentTime = 0;
    };

    const handlePreviewVideoPlay = (event) => {
      const playing = event?.target;
      previewVideos.value.forEach((v) => {
        if (!v || v === playing) return;
        v.pause();
      });
    };

    return {
      localMemory,
      uploading, isSelectingFiles, postUploadSettling,
      isMobileLike, modalLock,
      fileInput, previewVideos,
      showImageDeleteModal,
      canCreate, canUpdate, canDelete, hasUploadPermission,
      maxDate, dateRangeInfo, lightboxItemsForView,
      requestClose,
      onSave,
      getCategoryName, getCategoryIcon,
      formatDate, formatMemoryDate,
      onDateTypeChange, validateSingleDate, validateRangeDate,
      triggerFileInput, handleFileUpload,
      confirmRemoveImage, closeImageDeleteModal, removeImage,
      handlePreviewVideoLoaded, handlePreviewVideoPlay,
      isVideoMedia, getImageUrl,
    };
  },
};
</script>

<style src="@/assets/css/dating.css" scoped></style>
