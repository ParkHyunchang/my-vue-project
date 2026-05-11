<template>
  <teleport to="#modal">
    <Modal v-if="show" @close="$emit('close')">
      <template #header>
        <h3>{{ isEditing ? '가계부 수정' : '새 항목 추가' }}</h3>
      </template>
      <template #body>
        <form @submit.prevent="$emit('save')" class="expense-form">
          <div class="form-group">
            <label>내역</label>
            <input
              :value="modelValue.title"
              @input="updateField('title', $event.target.value)"
              type="text"
              class="form-control"
              required
            />
          </div>
          <div class="form-group">
            <label>날짜</label>
            <input
              :value="modelValue.date"
              @input="updateField('date', $event.target.value)"
              type="date"
              class="form-control"
              required
            />
            <span v-if="modelValue.fixed" class="form-hint">
              고정 지출은 선택한 날짜 기준으로 매달 자동 등록됩니다.
            </span>
          </div>
          <div class="form-group">
            <label>금액</label>
            <input
              :value="modelValue.amount"
              @input="updateField('amount', $event.target.value === '' ? null : Number($event.target.value))"
              type="number"
              class="form-control"
              required
              min="0"
            />
          </div>
          <div class="form-group">
            <label>유형</label>
            <select
              :value="modelValue.type"
              @change="updateField('type', $event.target.value)"
              class="form-control"
              required
            >
              <option value="INCOME">수입</option>
              <option value="EXPENSE">지출</option>
            </select>
          </div>
          <div class="form-group category-group">
            <label>카테고리</label>
            <div class="category-grid">
              <button
                type="button"
                v-for="category in formCategoryOptions"
                :key="category"
                :class="['category-option', { active: modelValue.category === category }]"
                @click="updateField('category', category)"
              >
                {{ category }}
              </button>
            </div>
            <input type="hidden" :value="modelValue.category" required>
          </div>
          <div
            v-if="modelValue.type === 'EXPENSE'"
            class="form-group form-group-inline"
          >
            <label class="checkbox-label">
              <input
                type="checkbox"
                :checked="modelValue.fixed"
                @change="updateField('fixed', $event.target.checked)"
              />
              고정 지출 항목
            </label>
            <span class="form-hint">
              매달 반복되는 지출일 때 체크하세요.
            </span>
          </div>
        </form>
      </template>
      <template #footer>
        <div class="modal-footer-buttons">
          <button type="button" class="btn btn-primary" @click="$emit('save')">
            {{ isEditing ? '수정' : '저장' }}
          </button>
          <button
            type="button"
            class="btn btn-danger"
            @click="$emit('delete', modelValue)"
            v-if="isEditing"
          >
            삭제
          </button>
          <button
            type="button"
            class="btn btn-primary"
            @click="$emit('close')"
          >
            취소
          </button>
        </div>
      </template>
    </Modal>
  </teleport>
</template>

<script>
import Modal from '@/components/Modal.vue';

export default {
  name: 'ExpenseFormModal',
  components: { Modal },
  props: {
    show: { type: Boolean, required: true },
    isEditing: { type: Boolean, default: false },
    modelValue: { type: Object, required: true },
    formCategoryOptions: { type: Array, required: true },
  },
  emits: ['close', 'save', 'delete', 'update:modelValue'],
  setup(props, { emit }) {
    const updateField = (key, value) => {
      emit('update:modelValue', { ...props.modelValue, [key]: value });
    };
    return { updateField };
  },
};
</script>

<style src="@/assets/css/expense.css" scoped></style>
