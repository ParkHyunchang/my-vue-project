<template>
  <Modal
    v-if="show"
    @close="$emit('close')"
  >
    <template #header>
      <h3>⚠️ 사용자 삭제 확인</h3>
    </template>
    <template #body>
      <div class="delete-warning">
        <div class="warning-icon">
          ⚠️
        </div>
        <div class="warning-content">
          <h4>정말로 삭제하시겠습니까?</h4>
          <p><strong>{{ user?.name }}</strong> ({{ user?.userId }}) 사용자를 삭제하려고 합니다.</p>
          <p class="delete-user-email">
            {{ user?.email }}
          </p>
          <div class="warning-details">
            <p class="warning-text">
              ⚠️ 이 작업은 되돌릴 수 없습니다!
            </p>
            <p class="warning-text">
              ⚠️ 사용자의 모든 데이터가 영구적으로 삭제됩니다!
            </p>
            <p class="warning-text">
              ⚠️ 삭제 후에는 복구가 불가능합니다!
            </p>
          </div>
          <div class="confirmation-input">
            <label for="delete-confirm">삭제를 확인하려면 "DELETE"를 입력하세요:</label>
            <input
              id="delete-confirm"
              v-model="deleteConfirmation"
              type="text"
              class="form-control"
              placeholder="DELETE 입력"
              @input="onChange"
            >
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <button
        class="btn btn-secondary"
        @click="$emit('close')"
      >
        취소
      </button>
      <button
        class="btn btn-danger"
        :disabled="loading || deleteConfirmation !== 'DELETE'"
        @click="$emit('confirm')"
      >
        {{ loading ? '삭제 중...' : '정말 삭제하기' }}
      </button>
    </template>
  </Modal>
</template>

<script>
import { ref, watch } from "vue";
import Modal from "@/components/Modal.vue";

export default {
  name: "ConfirmDeleteModal",
  components: { Modal },
  props: {
    show: { type: Boolean, default: false },
    user: { type: Object, default: null },
    loading: { type: Boolean, default: false },
  },
  emits: ["close", "confirm"],
  setup(props) {
    const deleteConfirmation = ref("");

    watch(
      () => props.show,
      (show) => {
        if (show) deleteConfirmation.value = "";
      },
    );

    const onChange = () => {
      deleteConfirmation.value = deleteConfirmation.value.toUpperCase();
    };

    return { deleteConfirmation, onChange };
  },
};
</script>

<style src="@/assets/css/admin.css" scoped></style>

<style src="@/assets/css/components/admin/confirm-delete-modal.css" scoped></style>
