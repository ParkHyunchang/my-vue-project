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
            <div v-if="memory.image" class="timeline-image">
              <img :src="memory.image" :alt="memory.title" />
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
              <label>Image URL</label>
              <input
                v-model="currentMemory.image"
                type="url"
                class="form-control"
              />
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

    const currentMemory = ref({
      title: "",
      date: "",
      category: "",
      partner: "",
      description: "",
      location: "",
      image: "",
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
        memories.value = response.data;
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
        image: "",
      };
      showMemoryModal.value = true;
    };

    const openMemoryDetail = (memory) => {
      isEditing.value = true;
      currentMemory.value = { ...memory };
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
        image: "",
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
        if (isEditing.value) {
          await axios.put(
            `/dating/${currentMemory.value.id}`,
            currentMemory.value
          );
          triggerToast("추억이 수정되었습니다.");
        } else {
          await axios.post("/dating", currentMemory.value);
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
</style>
