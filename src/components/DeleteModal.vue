<template>
  <Modal @close="onClose">
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
  padding: 0.9rem 1.2rem !important;
  border-top: 1px solid var(--card-border) !important;
}

@media (max-width: 768px) {
  .modal-footer {
    flex-direction: column !important;
    gap: 0.75rem !important;
  }
}
</style>
