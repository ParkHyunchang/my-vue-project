<template>
  <Modal>
    <template #header>
      <h3>{{ title || "삭제 확인" }}</h3>
    </template>
    <template #body>
      {{ message || "정말 삭제하시겠습니까?" }}
    </template>
    <template #footer>
      <button type="button" class="btn btn-secondary" @click="onClose">
        취소
      </button>
      <button type="button" class="btn btn-danger" @click="onDelete">
        삭제
      </button>
    </template>
  </Modal>
</template>

<script>
import Modal from "@/components/Modal.vue";
import { getCurrentInstance } from "vue";

export default {
  components: {
    Modal,
  },
  props: {
    title: {
      type: String,
      default: "",
    },
    message: {
      type: String,
      default: "",
    },
  },
  setup() {
    const { emit } = getCurrentInstance();
    const onClose = () => {
      emit("close");
    };

    const onDelete = () => {
      emit("delete");
    };

    return {
      onClose,
      onDelete,
    };
  },
};
</script>

<style scoped>
.modal-footer {
  display: flex !important;
  justify-content: flex-end !important;
  gap: 0.5rem !important;
  padding: 1rem !important;
  border-top: 1px solid #dee2e6 !important;
}

.btn {
  display: inline-block !important;
  padding: 12px 20px !important;
  font-size: 16px !important;
  border: none !important;
  border-radius: 4px !important;
  cursor: pointer !important;
  text-decoration: none !important;
  transition: background-color 0.3s ease !important;
  min-height: 44px !important;
}

.btn-secondary {
  background-color: #6c757d !important;
  color: white !important;
}

.btn-secondary:hover {
  background-color: #545b62 !important;
}

.btn-danger {
  background-color: #dc3545 !important;
  color: white !important;
}

.btn-danger:hover {
  background-color: #c82333 !important;
}

/* 모바일에서 버튼 스타일 조정 */
@media (max-width: 768px) {
  .modal-footer {
    flex-direction: column !important;
    gap: 0.75rem !important;
  }
  
  .btn {
    width: 100% !important;
    padding: 14px 20px !important;
    font-size: 16px !important;
  }
}
</style>
