<template>
  <Modal @close="onClose">
    <template #header>
      <h3>{{ title || "삭제 확인" }}</h3>
    </template>
    <template #body>
      {{ message || "정말 삭제하시겠습니까?" }}
    </template>
    <template #footer>
      <button
        type="button"
        class="btn btn-secondary"
        :disabled="busy"
        @click="onClose"
      >
        취소
      </button>
      <button
        type="button"
        class="btn btn-danger"
        :disabled="busy"
        @click="onDelete"
      >
        {{ busy ? '삭제 중...' : '삭제' }}
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
    busy: { type: Boolean, default: false },
    title: {
      type: String,
      default: "",
    },
    message: {
      type: String,
      default: "",
    },
  },
  setup(props) {
    const { emit } = getCurrentInstance();
    const onClose = () => {
      if (props.busy) return;
      emit("close");
    };

    const onDelete = () => {
      if (props.busy) return;
      emit("delete");
    };

    return {
      onClose,
      onDelete,
    };
  },
};
</script>

<style src="@/assets/css/modal.css" scoped></style>
