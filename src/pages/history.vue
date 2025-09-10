<template>
  <div class="history-container">
    <div class="page-header">
      <h2>My History</h2>
      <button class="btn btn-primary" @click="openCreateModal">
        Add New Event
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
        v-for="event in filteredEvents"
        :key="event.id"
        :class="['timeline-item', event.category]"
        @click="openEventDetail(event)"
      >
        <div class="timeline-date">
          {{ formatDate(event.date) }}
        </div>
        <div class="timeline-content">
          <div class="timeline-icon">
            <i :class="getCategoryIcon(event.category)"></i>
          </div>
          <div class="timeline-body">
            <h3>{{ event.title }}</h3>
            <p>{{ event.description }}</p>
            <div v-if="event.image" class="timeline-image">
              <img :src="getImageUrl(event.image)" :alt="event.title" />
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
              <label>Date</label>
              <input
                v-model="currentEvent.date"
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
              <label>Image URL</label>
              <input
                v-model="currentEvent.image"
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
    const showEventModal = ref(false);
    const isEditing = ref(false);
    const selectedCategory = ref("all");
    const showDeleteModal = ref(false);
    const eventToDelete = ref(null);

    const currentEvent = ref({
      title: "",
      date: "",
      category: "",
      description: "",
      location: "",
      image: "",
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

    const fetchEvents = async () => {
      try {
        const response = await axios.get("/histories");
        events.value = response.data;
      } catch (error) {
        showToast("Failed to load events", "danger");
      }
    };

    const openCreateModal = () => {
      isEditing.value = false;
      currentEvent.value = {
        title: "",
        date: "",
        category: "",
        description: "",
        location: "",
        image: "",
      };
      showEventModal.value = true;
    };

    const openEventDetail = (event) => {
      isEditing.value = true;
      currentEvent.value = { ...event };
      showEventModal.value = true;
    };

    const closeEventModal = () => {
      showEventModal.value = false;
      currentEvent.value = {
        title: "",
        date: "",
        category: "",
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

    const saveEvent = async () => {
      // 필수 입력값 검사
      if (!currentEvent.value.title?.trim()) {
        showToast("제목을 입력해주세요.", "danger");
        return;
      }
      if (!currentEvent.value.date?.trim()) {
        showToast("날짜를 입력해주세요.", "danger");
        return;
      }
      if (!currentEvent.value.category?.trim()) {
        showToast("카테고리를 선택해주세요.", "danger");
        return;
      }

      // 날짜 유효성 검사
      if (!validateDate({ target: { value: currentEvent.value.date } })) {
        return;
      }

      try {
        if (isEditing.value) {
          await axios.put(
            `/histories/${currentEvent.value.id}`,
            currentEvent.value
          );
          showToast("이벤트가 수정되었습니다.");
        } else {
          await axios.post("/histories", currentEvent.value);
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
      const baseURL = axios.defaults.baseURL || 'http://125.141.20.218:3200';
      return `${baseURL}${imagePath}`;
    };

    // 초기 데이터 로드
    fetchEvents();

    return {
      events,
      showEventModal,
      currentEvent,
      categories,
      categoryOptions,
      selectedCategory,
      filteredEvents,
      isEditing,
      openCreateModal,
      openEventDetail,
      closeEventModal,
      saveEvent,
      filterByCategory,
      formatDate,
      getCategoryIcon,
      showDeleteModal,
      openDeleteModal,
      closeDeleteModal,
      deleteEvent,
      maxDate,
      validateDate,
      getImageUrl,
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
  top: 0;
  left: -180px;
  padding: 8px 16px;
  background: #f8f9fa;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
}

.timeline-item:nth-child(even) .timeline-date {
  left: auto;
  right: -180px;
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
</style>
