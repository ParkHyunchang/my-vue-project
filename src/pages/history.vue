<template>
  <div class="history-container">
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
    <div class="timeline-filter">
      <button
        v-for="category in categories"
        :key="category.id"
        :class="['filter-btn', { active: selectedCategory === category.id }]"
        @click="filterByCategory(category.id)"
      >
        <i :class="category.icon"></i>
        {{ category.name }}
      </button>
    </div>

    <!-- 타임라인 -->
    <div class="timeline">
      <div
        v-for="event in processedEvents"
        :key="event.id"
        :class="['timeline-item', event.category]"
        @click="openEventDetail(event)"
      >
        <div class="timeline-date">
          {{ formatEventDate(event) }}
        </div>
        <div class="timeline-content">
          <div class="timeline-icon">
            <i :class="getCategoryIcon(event.category)"></i>
          </div>
          <div class="timeline-body">
            <h3>{{ event.title }}</h3>
            <p>{{ event.description }}</p>
            <div v-if="event.processedImages && event.processedImages.length > 0" class="timeline-images">
              <div class="image-gallery">
                <img 
                  v-for="(imageUrl, index) in event.processedImages.slice(0, 3)" 
                  :key="index"
                  :src="imageUrl" 
                  :alt="event.title" 
                  @error="handleImageError"
                  @load="handleImageLoad"
                  class="memory-image"
                />
                <div v-if="event.processedImages.length > 3" class="more-images">
                  +{{ event.processedImages.length - 3 }}
                </div>
              </div>
            </div>
            <div class="timeline-footer">
              <span class="location" v-if="event.location">
                <i class="fas fa-map-marker-alt"></i>
                {{ event.location }}
              </span>
              <button
                class="btn btn-sm btn-danger delete-btn"
                @click.stop="openDeleteModal(event)"
              >
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 이벤트 생성/수정 모달 -->
    <teleport to="#modal">
      <Modal v-if="showEventModal" @close="closeEventModal">
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
                <div v-if="currentEvent.dateType === 'single'" class="single-date-input">
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
                <div v-if="currentEvent.dateType === 'range'" class="range-date-inputs">
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
                    <span class="range-duration">{{ dateRangeInfo.duration }}일</span>
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
              <label>Images</label>
              <div class="image-upload-container">
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/*"
                  multiple
                  @change="handleFileUpload"
                  style="display: none"
                />
                <div class="image-upload-area" @click="triggerFileInput">
                  <div class="upload-placeholder">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <p>이미지를 업로드하세요</p>
                    <small>클릭하여 파일 선택 (여러 개 선택 가능)</small>
                  </div>
                </div>
                
                <!-- 업로드된 이미지들 -->
                <div v-if="currentEvent.images && currentEvent.images.length > 0" class="uploaded-images">
                  <div 
                    v-for="(image, index) in currentEvent.images" 
                    :key="index" 
                    class="image-preview-item"
                  >
                    <img :src="getImageUrl(image)" :alt="`Image ${index + 1}`" />
                    <button 
                      type="button" 
                      class="remove-image" 
                      @click.stop="confirmRemoveImage(index)"
                      title="이미지 삭제"
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
        :title="'이미지 삭제'"
        :message="'이 이미지를 정말 삭제하시겠습니까?'"
        @close="closeImageDeleteModal"
        @delete="removeImage"
      />
    </teleport>
  </div>
</template>

<script>
import { ref, computed } from "vue";
import Modal from "@/components/Modal.vue";
import DeleteModal from "@/components/DeleteModal.vue";
import { useToast } from "@/composables/toast";
import axios from "@/axios";

export default {
  components: {
    Modal,
    DeleteModal,
  },
  setup() {
    const { showToast } = useToast();
    const events = ref([]);
    const searchQuery = ref("");
    const searchInput = ref("");
    const showEventModal = ref(false);
    const isEditing = ref(false);
    const selectedCategory = ref("all");
    const showDeleteModal = ref(false);
    const eventToDelete = ref(null);
    const uploading = ref(false);
    const fileInput = ref(null);
    const showImageDeleteModal = ref(false);
    const imageToDelete = ref(null);

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

    const categories = [
      { id: "all", name: "전체", icon: "fas fa-list" },
      { id: "travel", name: "여행", icon: "fas fa-plane" },
      { id: "education", name: "교육", icon: "fas fa-graduation-cap" },
      { id: "move", name: "이사", icon: "fas fa-home" },
      { id: "work", name: "일", icon: "fas fa-briefcase" },
      { id: "record", name: "기록", icon: "fas fa-trophy" },
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
      const baseURL = axios.defaults.baseURL;
      const query = searchQuery.value.trim().toLowerCase();

      let eventsToProcess = filteredEvents.value;

      if (query) {
        eventsToProcess = eventsToProcess.filter((event) => {
          const target = [
            event.title,
            event.description,
            event.location,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return target.includes(query);
        });
      }
      
      return eventsToProcess.map(event => ({
        ...event,
        processedImages: event.images ? event.images
          .map(img => {
            if (!img || img.trim() === "") return "";
            if (img.startsWith("http")) return img;
            return `${baseURL}${img}`;
          })
          .filter(Boolean) : []
      }));
    });

    const fetchEvents = async () => {
      try {
        const response = await axios.get("/histories");
        // 백엔드에서 받은 데이터를 프론트엔드 형식으로 변환
        events.value = response.data.map(event => {
          let imagesArray = [];
          
          if (event.images && typeof event.images === 'string') {
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
            images: imagesArray
          };
        });
        
      } catch (error) {
        showToast("Failed to load events", "danger");
      }
    };

    const applySearch = () => {
      searchQuery.value = searchInput.value.trim();
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
      if (event.images && typeof event.images === 'string') {
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
        images: imagesArray
      };
      
      
      showEventModal.value = true;
    };

    const closeEventModal = () => {
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

    // 최대 날짜를 현재 날짜로 설정
    const maxDate = new Date().toISOString().split("T")[0];

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

      const selectedDate = new Date(dateValue);
      const today = new Date();

      if (isNaN(selectedDate.getTime())) {
        showToast("올바른 날짜를 입력해주세요.", "danger");
        currentEvent.value.date = "";
        return false;
      }

      if (selectedDate > today) {
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
        currentEvent.value.endDate = "";
        return false;
      }

      return true;
    };

    // 기간 정보 계산 (computed)
    const dateRangeInfo = computed(() => {
      if (currentEvent.value.dateType !== "range" || 
          !currentEvent.value.startDate || 
          !currentEvent.value.endDate) {
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
        period: `${startFormatted} ~ ${endFormatted}`
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
        if (!currentEvent.value.startDate?.trim() || !currentEvent.value.endDate?.trim()) {
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
        if (!validateSingleDate({ target: { value: currentEvent.value.date } })) {
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
          images: currentEvent.value.images ? JSON.stringify(currentEvent.value.images) : null,
          // 기존 단일 이미지 필드도 유지 (호환성)
          image: currentEvent.value.images && currentEvent.value.images.length > 0 
            ? currentEvent.value.images[0] 
            : null
        };


        if (isEditing.value) {
          await axios.put(
            `/histories/${currentEvent.value.id}`,
            eventData
          );
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

    const getImageUrl = (imagePath) => {
      if (!imagePath || imagePath.trim() === '') return '';
      // 이미 전체 URL인 경우 그대로 반환
      if (imagePath.startsWith('http')) return imagePath;
      // 상대 경로인 경우 현재 axios baseURL과 결합
      const baseURL = axios.defaults.baseURL;
      return `${baseURL}${imagePath}`;
    };

    const handleImageError = (event) => {
      // 이미지 로드 실패 시 숨기기
      event.target.style.display = 'none';
    };

    const handleImageLoad = (event) => {
      // 이미지 로드 성공 시 표시
      event.target.style.display = 'block';
    };

    // 파일 업로드 관련 함수들
    const triggerFileInput = () => {
      fileInput.value?.click();
    };

    const handleFileUpload = async (event) => {
      const files = Array.from(event.target.files);
      if (!files.length) return;

      // 파일 개수 제한 (최대 10개)
      if (files.length > 10) {
        showToast("최대 10개의 이미지만 업로드할 수 있습니다.", "danger");
        return;
      }

      // 기존 이미지와 합쳐서 총 개수 확인
      const totalImages = (currentEvent.value.images?.length || 0) + files.length;
      if (totalImages > 10) {
        showToast("총 이미지 개수는 10개를 초과할 수 없습니다.", "danger");
        return;
      }

      uploading.value = true;
      
      try {
        const uploadPromises = files.map(async (file) => {
          // 파일 크기 확인 (20MB 제한)
          if (file.size > 20 * 1024 * 1024) {
            throw new Error(`${file.name}: 파일 크기는 20MB 이하여야 합니다.`);
          }

          // 이미지 파일 확인
          if (!file.type.startsWith('image/')) {
            throw new Error(`${file.name}: 이미지 파일만 업로드 가능합니다.`);
          }

          const formData = new FormData();
          formData.append('file', file);

          const response = await axios.post('/histories/upload', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });

          return response.data;
        });

        const uploadedImages = await Promise.all(uploadPromises);
        
        // 기존 이미지 배열에 새 이미지들 추가
        if (!currentEvent.value.images) {
          currentEvent.value.images = [];
        }
        currentEvent.value.images.push(...uploadedImages);
        
        showToast(`${uploadedImages.length}개의 이미지가 업로드되었습니다.`);
      } catch (error) {
        showToast(`이미지 업로드에 실패했습니다: ${error.message}`, "danger");
      } finally {
        uploading.value = false;
        // 파일 입력 초기화
        if (fileInput.value) {
          fileInput.value.value = '';
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
          // 서버에서 이미지 파일 삭제
          await axios.delete('/histories/image', {
            params: { imagePath: imageToRemove }
          });
          
          // 프론트엔드에서 이미지 배열에서 제거
          currentEvent.value.images.splice(imageToDelete.value, 1);
          showToast("이미지가 삭제되었습니다.");
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('이미지 삭제 실패:', error);
          showToast("이미지 삭제에 실패했습니다.", "danger");
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
      filteredEvents,
      processedEvents,
      isEditing,
      openCreateModal,
      openEventDetail,
      closeEventModal,
      saveEvent,
      filterByCategory,
      formatDate,
      formatEventDate,
      getCategoryIcon,
      showDeleteModal,
      openDeleteModal,
      closeDeleteModal,
      deleteEvent,
      maxDate,
      validateDate,
      getImageUrl,
      handleImageError,
      handleImageLoad,
      // 파일 업로드 관련
      uploading,
      fileInput,
      triggerFileInput,
      handleFileUpload,
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

<style scoped>
.history-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 50px;
}

.page-header h2 {
  font-size: 2.5rem;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin: 0 auto 30px;
  max-width: 400px;
  background: #ffffff;
  border: 1px solid #d6e4ff;
  border-radius: 999px;
  box-shadow: 0 4px 10px rgba(0, 123, 255, 0.08);
}

.search-input {
  flex: 1;
  border: none;
  font-size: 1rem;
  color: #333;
  background: transparent;
  outline: none;
}

.search-input::placeholder {
  color: #93a3c1;
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

.timeline-filter {
  display: flex;
  gap: 15px;
  margin-bottom: 50px;
  flex-wrap: wrap;
  justify-content: center;
}

.filter-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 25px;
  background: #f0f0f0;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
}

.filter-btn.active {
  background: #007bff;
  color: white;
}

.timeline {
  position: relative;
  padding: 40px 0;
  max-width: 1000px;
  margin: 0 auto;
}

.timeline::before {
  content: "";
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  height: 100%;
  background: #e0e0e0;
}

.timeline-item {
  position: relative;
  margin-bottom: 80px;
  width: calc(50% - 50px);
  margin-left: auto;
}

.timeline-item:nth-child(even) {
  margin-left: 0;
  margin-right: auto;
}

.timeline-date {
  position: absolute;
  top: 10px;
  right: calc(100% + 24px);
  padding: 10px 20px;
  background: #f8f9fa;
  border-radius: 999px;
  font-size: 1rem;
  font-weight: 500;
  text-align: right;
  white-space: nowrap;
  word-break: keep-all;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08);
}

.timeline-item:nth-child(even) .timeline-date {
  right: auto;
  left: calc(100% + 24px);
  text-align: left;
}

.timeline-content {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.timeline-icon {
  position: absolute;
  left: -70px;
  top: 50%;
  transform: translateY(-50%);
  width: 50px;
  height: 50px;
  background: #007bff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
}

.timeline-item:nth-child(even) .timeline-icon {
  left: auto;
  right: -70px;
}

.timeline-body h3 {
  margin: 0 0 15px;
  font-size: 1.4rem;
}

.timeline-body p {
  margin: 0;
  color: #666;
  font-size: 1.1rem;
  line-height: 1.6;
}

.timeline-image {
  margin: 20px 0;
}

.timeline-image img {
  max-width: 100%;
  border-radius: 8px;
}

.memory-image {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.timeline-footer {
  margin-top: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.location {
  color: #666;
  font-size: 1rem;
}

.location i {
  margin-right: 8px;
}

/* 모바일 스타일 */
@media (max-width: 768px) {
  .page-header h2 {
    font-size: 1.5rem;
  }

  .filter-btn {
    padding: 6px 12px;
    font-size: 0.8rem;
  }

  .timeline::before {
    left: 20px;
  }

  .timeline-item,
  .timeline-item:nth-child(even) {
    width: calc(100% - 40px);
    margin-left: 40px;
    margin-right: 0;
  }

  .timeline-date,
  .timeline-item:nth-child(even) .timeline-date {
    position: relative;
    left: 0;
    right: 0;
    margin-bottom: 10px;
    display: inline-block;
    text-align: left;
    max-width: 100%;
    white-space: normal;
    border-radius: 12px;
    box-shadow: none;
  }

  .timeline-icon,
  .timeline-item:nth-child(even) .timeline-icon {
    left: -40px;
    right: auto;
    width: 30px;
    height: 30px;
    font-size: 0.8rem;
  }

  .timeline-content {
    padding: 15px;
  }

  .timeline-body h3 {
    font-size: 1rem;
  }

  .timeline-body p {
    font-size: 0.9rem;
  }

  .location {
    font-size: 0.8rem;
  }
}

.event-form {
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
  border-color: #007bff;
  background: #f0f8ff;
}

.upload-placeholder {
  color: #666;
}

.upload-placeholder i {
  font-size: 2rem;
  color: #007bff;
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
  background: #007bff;
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

.image-preview-item img {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: transform 0.3s ease;
}

.image-preview-item img:hover {
  transform: scale(1.05);
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

.more-images {
  background: rgba(0, 123, 255, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
  min-width: 40px;
  text-align: center;
}

/* 모바일에서 이미지 업로드 조정 */
@media (max-width: 768px) {
  .uploaded-images {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 10px;
  }
  
  .image-preview-item img {
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
  color: #007bff;
}

.radio-option input[type="radio"] {
  margin: 0;
  accent-color: #007bff;
}

.radio-option input[type="radio"]:checked + span {
  color: #007bff;
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
  color: #007bff;
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
</style>
