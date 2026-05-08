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
        <h3>{{ isEditing ? "이벤트 수정" : "새 이벤트 추가" }}</h3>
      </template>
      <template #body>
        <form class="event-form" @submit.prevent="onSave">
          <div class="form-group">
            <label>Title</label>
            <input
              v-model="localEvent.title"
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
                    v-model="localEvent.dateType"
                    type="radio"
                    value="single"
                    @change="onDateTypeChange"
                  />
                  <span>하루</span>
                </label>
                <label class="radio-option">
                  <input
                    v-model="localEvent.dateType"
                    type="radio"
                    value="range"
                    @change="onDateTypeChange"
                  />
                  <span>기간</span>
                </label>
              </div>

              <div v-if="localEvent.dateType === 'single'" class="single-date-input">
                <input
                  v-model="localEvent.date"
                  type="date"
                  class="form-control"
                  required
                  :max="maxDate"
                  placeholder="날짜를 선택하세요"
                  @input="validateSingleDate"
                />
              </div>

              <div v-if="localEvent.dateType === 'range'" class="range-date-inputs">
                <div class="date-input-group">
                  <label>시작일</label>
                  <input
                    v-model="localEvent.startDate"
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
                    v-model="localEvent.endDate"
                    type="date"
                    class="form-control"
                    required
                    :max="maxDate"
                    :min="localEvent.startDate"
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
            <select v-model="localEvent.category" class="form-control" required>
              <option value="" disabled>카테고리를 선택하세요</option>
              <option v-for="cat in categoryOptions" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea v-model="localEvent.description" class="form-control" rows="3"></textarea>
          </div>
          <div class="form-group">
            <label>Location</label>
            <input v-model="localEvent.location" type="text" class="form-control" />
          </div>
          <div class="form-group">
            <label>Images / Videos</label>
            <div class="image-upload-container">
              <input
                ref="fileInput"
                type="file"
                accept="image/*,video/*"
                multiple
                style="display: none"
                @change="handleFileUpload"
              />
              <div class="image-upload-area" @click="triggerFileInput">
                <div class="upload-placeholder">
                  <i class="fas fa-cloud-upload-alt"></i>
                  <p>이미지 또는 동영상을 업로드하세요</p>
                  <small>클릭하여 파일 선택 (여러 개 선택 가능)</small>
                </div>
              </div>

              <div
                v-if="localEvent.images && localEvent.images.length > 0"
                class="uploaded-images"
              >
                <div
                  v-for="(image, index) in localEvent.images"
                  :key="index"
                  class="image-preview-item"
                >
                  <video
                    v-if="isVideoMedia(image)"
                    ref="previewVideos"
                    :src="getMediaUrl(image)"
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
                    @error="onImageError"
                    @load="onImageLoad"
                  />
                  <button
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
        <div class="modal-footer-buttons">
          <div>
            <button
              v-if="isEditing"
              type="button"
              class="btn btn-danger"
              @click="$emit('request-delete', localEvent)"
            >
              삭제
            </button>
          </div>
          <div>
            <button type="button" class="btn btn-secondary" @click="$emit('close')">
              취소
            </button>
            <button type="button" class="btn btn-primary" @click="onSave">
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
import axios from "@/axios";
import Modal from "@/components/Modal.vue";
import DeleteModal from "@/components/DeleteModal.vue";
import { useToast } from "@/composables/toast";
import { useUploadLimits } from "@/composables/useUploadLimits";
import { useMediaUtils } from "@/composables/useMediaUtils";

const EMPTY_EVENT = {
  title: "", date: "", dateType: "single",
  startDate: "", endDate: "", category: "",
  description: "", location: "", image: "", images: [],
};

export default {
  name: "EventFormModal",
  components: { Modal, DeleteModal },
  props: {
    show: { type: Boolean, default: false },
    event: { type: Object, default: null },
    isEditing: { type: Boolean, default: false },
    categoryOptions: { type: Array, default: () => [] },
  },
  emits: ["close", "save", "request-delete"],
  setup(props, { emit }) {
    const { showToast } = useToast();
    const {
      maxImageSizeBytes, maxVideoSizeBytes,
      maxImageLimitLabel, maxVideoLimitLabel,
    } = useUploadLimits();
    const { isImageFile, isVideoFile, isVideoMedia, getImageUrl: getMediaUrl } = useMediaUtils();

    const localEvent = ref({ ...EMPTY_EVENT, images: [] });
    const uploading = ref(false);
    const isSelectingFiles = ref(false);
    const postUploadSettling = ref(false);
    const isMobileLike = ref(false);
    const fileInput = ref(null);
    const previewVideos = ref([]);
    const showImageDeleteModal = ref(false);
    const imageToDelete = ref(null);

    onBeforeUpdate(() => { previewVideos.value = []; });

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

    const parseImagesFromEvent = (e) => {
      if (!e) return [];
      if (Array.isArray(e.images)) return e.images;
      if (e.images && typeof e.images === "string") {
        try { return JSON.parse(e.images); } catch { return e.image ? [e.image] : []; }
      }
      return e.image ? [e.image] : [];
    };

    watch(
      () => props.show,
      (show) => {
        if (show) {
          if (props.event) {
            localEvent.value = {
              ...props.event,
              dateType: props.event.dateType || "single",
              startDate: props.event.startDate || "",
              endDate: props.event.endDate || "",
              images: parseImagesFromEvent(props.event),
            };
          } else {
            localEvent.value = { ...EMPTY_EVENT, images: [] };
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

    // ── 날짜 ────────────────────────────────────────────
    const maxDate = (() => {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    })();

    const onDateTypeChange = () => {
      if (localEvent.value.dateType === "single") {
        localEvent.value.startDate = "";
        localEvent.value.endDate = "";
      } else {
        localEvent.value.date = "";
      }
    };

    const validateSingleDate = (event) => {
      const dateValue = event.target.value;
      if (!dateValue) {
        showToast("날짜를 입력해주세요.", "danger"); return false;
      }
      if (isNaN(new Date(dateValue).getTime())) {
        showToast("올바른 날짜를 입력해주세요.", "danger");
        localEvent.value.date = "";
        return false;
      }
      if (dateValue > maxDate) {
        showToast("미래의 날짜는 입력할 수 없습니다.", "danger");
        localEvent.value.date = "";
        return false;
      }
      return true;
    };

    const validateRangeDate = () => {
      const startDate = localEvent.value.startDate;
      const endDate = localEvent.value.endDate;
      if (!startDate || !endDate) return true;
      if (isNaN(new Date(startDate).getTime()) || isNaN(new Date(endDate).getTime())) {
        showToast("올바른 날짜를 입력해주세요.", "danger"); return false;
      }
      if (startDate > maxDate || endDate > maxDate) {
        showToast("미래의 날짜는 입력할 수 없습니다.", "danger"); return false;
      }
      if (startDate > endDate) {
        showToast("시작일은 종료일보다 이전이어야 합니다.", "danger");
        localEvent.value.endDate = "";
        return false;
      }
      return true;
    };

    const dateRangeInfo = computed(() => {
      if (
        localEvent.value.dateType !== "range" ||
        !localEvent.value.startDate ||
        !localEvent.value.endDate
      ) return null;
      const start = new Date(localEvent.value.startDate);
      const end = new Date(localEvent.value.endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return null;
      const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      return {
        duration,
        period: `${start.toLocaleDateString("ko-KR")} ~ ${end.toLocaleDateString("ko-KR")}`,
      };
    });

    // ── 저장 ────────────────────────────────────────────
    const onSave = () => {
      if (!localEvent.value.title?.trim()) {
        showToast("제목을 입력해주세요.", "danger"); return;
      }
      if (localEvent.value.dateType === "single") {
        if (!localEvent.value.date?.trim()) {
          showToast("날짜를 입력해주세요.", "danger"); return;
        }
      } else if (!localEvent.value.startDate?.trim() || !localEvent.value.endDate?.trim()) {
        showToast("시작일과 종료일을 모두 입력해주세요.", "danger"); return;
      }
      if (!localEvent.value.category?.trim()) {
        showToast("카테고리를 선택해주세요.", "danger"); return;
      }

      if (localEvent.value.dateType === "single") {
        if (!validateSingleDate({ target: { value: localEvent.value.date } })) return;
      } else if (!validateRangeDate()) return;

      emit("save", {
        ...localEvent.value,
        images: localEvent.value.images
          ? JSON.stringify(localEvent.value.images)
          : null,
        image:
          localEvent.value.images && localEvent.value.images.length > 0
            ? localEvent.value.images[0]
            : null,
      });
    };

    // ── 미디어 업로드 ───────────────────────────────────
    const triggerFileInput = () => {
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

      if (files.length > 20) {
        showToast("최대 20개의 미디어만 업로드할 수 있습니다.", "danger"); return;
      }
      const total = (localEvent.value.images?.length || 0) + files.length;
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
          const response = await axios.post("/api/histories/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          return response.data;
        });

        const uploaded = await Promise.all(uploadPromises);
        if (!localEvent.value.images) localEvent.value.images = [];
        localEvent.value.images.push(...uploaded);

        showToast(`${uploaded.length}개의 미디어가 업로드되었습니다.`);
        postUploadSettling.value = true;
        await waitForModalMediaSettled(1500);
        await new Promise((r) => setTimeout(r, 300));
      } catch (error) {
        showToast(`미디어 업로드에 실패했습니다: ${error.message}`, "danger");
      } finally {
        uploading.value = false;
        postUploadSettling.value = false;
        if (fileInput.value) fileInput.value.value = "";
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
      if (imageToDelete.value !== null && localEvent.value.images) {
        const target = localEvent.value.images[imageToDelete.value];
        try {
          await axios.delete("/api/histories/media", {
            params: { mediaPath: target },
          });
          localEvent.value.images.splice(imageToDelete.value, 1);
          showToast("미디어가 삭제되었습니다.");
        } catch {
          showToast("미디어 삭제에 실패했습니다.", "danger");
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

    const onImageError = (event) => { event.target.style.display = "none"; };
    const onImageLoad = (event) => { event.target.style.display = "block"; };

    return {
      localEvent,
      uploading, isSelectingFiles, postUploadSettling,
      isMobileLike, modalLock,
      fileInput, previewVideos,
      showImageDeleteModal,
      maxDate, dateRangeInfo,
      requestClose, onSave,
      onDateTypeChange, validateSingleDate, validateRangeDate,
      triggerFileInput, handleFileUpload,
      confirmRemoveImage, closeImageDeleteModal, removeImage,
      handlePreviewVideoLoaded, handlePreviewVideoPlay,
      onImageError, onImageLoad,
      isVideoMedia, getMediaUrl,
    };
  },
};
</script>

<style src="@/assets/css/history.css" scoped></style>
