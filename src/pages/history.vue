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
              <img :src="event.image" :alt="event.title" />
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
    const { triggerToast } = useToast();
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
        triggerToast("Failed to load events", "danger");
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
        triggerToast("날짜를 입력해주세요.", "danger");
        return false;
      }

      const selectedDate = new Date(dateValue);
      const today = new Date();

      if (isNaN(selectedDate.getTime())) {
        triggerToast("올바른 날짜를 입력해주세요.", "danger");
        currentEvent.value.date = "";
        return false;
      }

      if (selectedDate > today) {
        triggerToast("미래의 날짜는 입력할 수 없습니다.", "danger");
        currentEvent.value.date = "";
        return false;
      }

      return true;
    };

    const saveEvent = async () => {
      // 필수 입력값 검사
      if (!currentEvent.value.title?.trim()) {
        triggerToast("제목을 입력해주세요.", "danger");
        return;
      }
      if (!currentEvent.value.date?.trim()) {
        triggerToast("날짜를 입력해주세요.", "danger");
        return;
      }
      if (!currentEvent.value.category?.trim()) {
        triggerToast("카테고리를 선택해주세요.", "danger");
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
          triggerToast("이벤트가 수정되었습니다.");
        } else {
          await axios.post("/histories", currentEvent.value);
          triggerToast("이벤트가 생성되었습니다.");
        }
        await fetchEvents();
        closeEventModal();
      } catch (error) {
        triggerToast(
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
        triggerToast("이벤트가 삭제되었습니다.");
      } catch (error) {
        triggerToast("이벤트 삭제에 실패했습니다.", "danger");
      }
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
  margin-bottom: 30px;
}

.timeline-filter {
  display: flex;
  gap: 10px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 20px;
  background: #f0f0f0;
  cursor: pointer;
  transition: all 0.3s ease;
}

.filter-btn.active {
  background: #007bff;
  color: white;
}

.timeline {
  position: relative;
  padding: 20px 0;
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
  margin-bottom: 30px;
  width: calc(50% - 30px);
  margin-left: auto;
}

.timeline-item:nth-child(even) {
  margin-left: 0;
  margin-right: auto;
}

.timeline-date {
  position: absolute;
  top: 0;
  left: -150px;
  padding: 5px 10px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 14px;
}

.timeline-item:nth-child(even) .timeline-date {
  left: auto;
  right: -150px;
}

.timeline-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.timeline-icon {
  position: absolute;
  left: -45px;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  background: #007bff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.timeline-item:nth-child(even) .timeline-icon {
  left: auto;
  right: -45px;
}

.timeline-body h3 {
  margin: 0 0 10px;
  color: #333;
}

.timeline-image {
  margin: 15px 0;
}

.timeline-image img {
  max-width: 100%;
  border-radius: 4px;
}

.timeline-footer {
  margin-top: 10px;
  font-size: 14px;
  color: #666;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.location {
  display: inline-flex;
  align-items: center;
  gap: 5px;
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

@media (max-width: 768px) {
  .timeline::before {
    left: 30px;
  }

  .timeline-item {
    width: calc(100% - 60px);
    margin-left: 60px;
  }

  .timeline-item:nth-child(even) {
    margin-left: 60px;
    margin-right: 0;
  }

  .timeline-date {
    left: -90px;
    width: 80px;
    text-align: right;
  }

  .timeline-item:nth-child(even) .timeline-date {
    left: -90px;
    right: auto;
  }

  .timeline-icon {
    left: -55px;
  }

  .timeline-item:nth-child(even) .timeline-icon {
    left: -55px;
    right: auto;
  }
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
