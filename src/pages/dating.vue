<template>
  <div class="dating-container">
    <div class="page-header">
      <h2>My Dating History</h2>
      <button class="btn btn-primary" @click="openCreateModal">
        Add New Memory
      </button>
    </div>

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
        v-for="memory in filteredMemories"
        :key="memory.id"
        :class="['timeline-item', memory.category]"
        @click="openMemoryDetail(memory)"
      >
        <div class="timeline-date">
          {{ formatDate(memory.date) }}
        </div>
        <div class="timeline-content">
          <div class="timeline-icon">
            <i :class="getCategoryIcon(memory.category)"></i>
          </div>
          <div class="timeline-body">
            <h3>{{ memory.title }}</h3>
            <p>{{ memory.description }}</p>
            <div v-if="memory.images && memory.images.length > 0" class="timeline-images">
              <div class="image-gallery">
                <img 
                  v-for="(image, index) in memory.images.slice(0, 3)" 
                  :key="index"
                  :src="getImageUrl(image)" 
                  :alt="memory.title" 
                  @error="handleImageError"
                  @load="handleImageLoad"
                  class="memory-image"
                />
                <div v-if="memory.images.length > 3" class="more-images">
                  +{{ memory.images.length - 3 }}
                </div>
              </div>
            </div>
            <div class="timeline-footer">
              <span class="location" v-if="memory.location">
                <i class="fas fa-map-marker-alt"></i>
                {{ memory.location }}
              </span>
              <div class="memory-tags" v-if="memory.partner">
                <span class="partner-tag">
                  <i class="fas fa-heart"></i>
                  {{ memory.partner }}
                </span>
              </div>
              <button
                class="btn btn-sm btn-danger delete-btn"
                @click.stop="openDeleteModal(memory)"
              >
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

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
              <label>Date</label>
              <input
                v-model="currentMemory.date"
                type="date"
                class="form-control"
                required
                :max="maxDate"
                @input="validateDate"
              />
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
              <label>Partner</label>
              <input
                v-model="currentMemory.partner"
                type="text"
                class="form-control"
                placeholder="상대방 이름 (선택사항)"
              />
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
                <div v-if="currentMemory.images && currentMemory.images.length > 0" class="uploaded-images">
                  <div 
                    v-for="(image, index) in currentMemory.images" 
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
                @click="openDeleteModal(currentMemory)"
                v-if="isEditing"
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
                취소
              </button>
              <button type="button" class="btn btn-primary" @click="saveMemory">
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
    const { triggerToast } = useToast();
    const memories = ref([]);
    const showMemoryModal = ref(false);
    const isEditing = ref(false);
    const selectedCategory = ref("all");
    const showDeleteModal = ref(false);
    const memoryToDelete = ref(null);
    const uploading = ref(false);
    const fileInput = ref(null);
    const showImageDeleteModal = ref(false);
    const imageToDelete = ref(null);

    const currentMemory = ref({
      title: "",
      date: "",
      category: "",
      partner: "",
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
      { id: "special", name: "특별한날", icon: "fas fa-star" },
      { id: "memory", name: "추억", icon: "fas fa-camera" },
    ];

    // 실제 카테고리만 포함하는 배열 (전체 제외)
    const categoryOptions = categories.filter((cat) => cat.id !== "all");

    const filteredMemories = computed(() => {
      if (selectedCategory.value === "all") return memories.value;
      return memories.value.filter(
        (memory) => memory.category === selectedCategory.value
      );
    });

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
              console.error('이미지 데이터 파싱 실패:', e);
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
        
        console.log('로드된 메모리 데이터:', memories.value);
      } catch (error) {
        triggerToast("Failed to load memories", "danger");
      }
    };

    const openCreateModal = () => {
      isEditing.value = false;
      currentMemory.value = {
        title: "",
        date: "",
        category: "",
        partner: "",
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
          console.error('이미지 데이터 파싱 실패:', e);
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
        images: imagesArray
      };
      
      console.log('수정 모달에서 로드된 데이터:', currentMemory.value);
      console.log('이미지 배열:', imagesArray);
      
      showMemoryModal.value = true;
    };

    const closeMemoryModal = () => {
      showMemoryModal.value = false;
      currentMemory.value = {
        title: "",
        date: "",
        category: "",
        partner: "",
        description: "",
        location: "",
        images: [],
      };
    };

    // 최대 날짜를 현재 날짜로 설정
    const maxDate = new Date().toISOString().split("T")[0];

    const validateDate = (event) => {
      const dateValue = event.target.value;
      if (!dateValue) {
        triggerToast("날짜를 입력해주세요.", "danger");
        return false;
      }

      const selectedDate = new Date(dateValue);
      const today = new Date();

      if (isNaN(selectedDate.getTime())) {
        triggerToast("올바른 날짜를 입력해주세요.", "danger");
        currentMemory.value.date = "";
        return false;
      }

      if (selectedDate > today) {
        triggerToast("미래의 날짜는 입력할 수 없습니다.", "danger");
        currentMemory.value.date = "";
        return false;
      }

      return true;
    };

    const saveMemory = async () => {
      // 필수 입력값 검사
      if (!currentMemory.value.title?.trim()) {
        triggerToast("제목을 입력해주세요.", "danger");
        return;
      }
      if (!currentMemory.value.date?.trim()) {
        triggerToast("날짜를 입력해주세요.", "danger");
        return;
      }
      if (!currentMemory.value.category?.trim()) {
        triggerToast("카테고리를 선택해주세요.", "danger");
        return;
      }

      // 날짜 유효성 검사
      if (!validateDate({ target: { value: currentMemory.value.date } })) {
        return;
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

        // 디버깅을 위한 로그
        console.log('전송할 데이터:', memoryData);
        console.log('이미지 배열:', currentMemory.value.images);
        console.log('JSON 문자열:', memoryData.images);

        if (isEditing.value) {
          await axios.put(
            `/dating/${currentMemory.value.id}`,
            memoryData
          );
          triggerToast("추억이 수정되었습니다.");
        } else {
          await axios.post("/dating", memoryData);
          triggerToast("추억이 생성되었습니다.");
        }
        await fetchMemories();
        closeMemoryModal();
      } catch (error) {
        triggerToast(
          isEditing.value
            ? "추억 수정에 실패했습니다."
            : "추억 생성에 실패했습니다.",
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
        triggerToast("추억이 삭제되었습니다.");
      } catch (error) {
        triggerToast("추억 삭제에 실패했습니다.", "danger");
      }
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
        triggerToast("최대 10개의 이미지만 업로드할 수 있습니다.", "danger");
        return;
      }

      // 기존 이미지와 합쳐서 총 개수 확인
      const totalImages = (currentMemory.value.images?.length || 0) + files.length;
      if (totalImages > 10) {
        triggerToast("총 이미지 개수는 10개를 초과할 수 없습니다.", "danger");
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
        
        triggerToast(`${uploadedImages.length}개의 이미지가 업로드되었습니다.`);
      } catch (error) {
        triggerToast(`이미지 업로드에 실패했습니다: ${error.message}`, "danger");
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
      if (imageToDelete.value !== null && currentMemory.value.images) {
        const imageToRemove = currentMemory.value.images[imageToDelete.value];
        
        try {
          // 서버에서 이미지 파일 삭제
          await axios.delete('/dating/image', {
            params: { imagePath: imageToRemove }
          });
          
          // 프론트엔드에서 이미지 배열에서 제거
          currentMemory.value.images.splice(imageToDelete.value, 1);
          triggerToast("이미지가 삭제되었습니다.");
        } catch (error) {
          console.error('이미지 삭제 실패:', error);
          triggerToast("이미지 삭제에 실패했습니다.", "danger");
        }
      }
      closeImageDeleteModal();
    };

    const getImageUrl = (imagePath) => {
      if (!imagePath || imagePath.trim() === '') return '';
      // 이미 전체 URL인 경우 그대로 반환
      if (imagePath.startsWith('http')) return imagePath;
      // 상대 경로인 경우 현재 axios baseURL과 결합
      const baseURL = axios.defaults.baseURL || 'http://localhost:3200/my-vue-project';
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

    // 초기 데이터 로드
    fetchMemories();

    return {
      memories,
      showMemoryModal,
      currentMemory,
      categories,
      categoryOptions,
      selectedCategory,
      filteredMemories,
      isEditing,
      openCreateModal,
      openMemoryDetail,
      closeMemoryModal,
      saveMemory,
      filterByCategory,
      formatDate,
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
      getImageUrl,
      handleImageError,
      handleImageLoad,
      // 이미지 삭제 모달 관련
      showImageDeleteModal,
      closeImageDeleteModal,
    };
  },
};
</script>

<style scoped>
.dating-container {
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
  color: #e91e63;
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
  background: #e91e63;
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
  background: #ffc1cc;
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
  top: 0;
  left: -180px;
  padding: 8px 16px;
  background: #fce4ec;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  color: #e91e63;
}

.timeline-item:nth-child(even) .timeline-date {
  left: auto;
  right: -180px;
}

.timeline-content {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(233, 30, 99, 0.1);
  border: 1px solid #fce4ec;
}

.timeline-icon {
  position: absolute;
  left: -70px;
  top: 50%;
  transform: translateY(-50%);
  width: 50px;
  height: 50px;
  background: #e91e63;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
  box-shadow: 0 2px 8px rgba(233, 30, 99, 0.3);
}

.timeline-item:nth-child(even) .timeline-icon {
  left: auto;
  right: -70px;
}

.timeline-body h3 {
  margin: 0 0 15px;
  font-size: 1.4rem;
  color: #e91e63;
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

.timeline-footer {
  margin-top: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.location {
  color: #666;
  font-size: 1rem;
}

.location i {
  margin-right: 8px;
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

  .timeline-footer {
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
  background: rgba(233, 30, 99, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
  min-width: 40px;
  text-align: center;
}

/* 모바일에서 이미지 갤러리 조정 */
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
</style>
