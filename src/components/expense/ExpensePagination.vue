<template>
  <div class="pagination">
    <div class="pagination-controls">
      <button
        @click="$emit('go-to-page', currentPage - 1)"
        :disabled="currentPage === 1"
        class="pagination-btn nav-btn"
      >
        ← 이전
      </button>

      <div v-if="totalPages > 1" class="page-input-container">
        <span class="page-label">페이지</span>
        <input
          :value="pageInput"
          @input="$emit('update:pageInput', Number($event.target.value))"
          @keyup.enter="$emit('go-to-input-page')"
          @blur="$emit('go-to-input-page')"
          type="number"
          :min="1"
          :max="totalPages"
          class="page-input"
          :class="{ error: pageInputError }"
        />
        <span class="page-total">/ {{ totalPages }}</span>
      </div>

      <button
        @click="$emit('go-to-page', currentPage + 1)"
        :disabled="currentPage === totalPages"
        class="pagination-btn nav-btn"
      >
        다음 →
      </button>
    </div>

    <div v-if="totalPages > 1" class="pagination-pages">
      <button
        v-for="page in visiblePages"
        :key="page"
        @click="$emit('go-to-page', page)"
        :class="['pagination-btn page-btn', { active: page === currentPage }]"
        :disabled="page === '...'"
      >
        {{ page }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ExpensePagination',
  props: {
    currentPage: { type: Number, required: true },
    totalPages: { type: Number, required: true },
    visiblePages: { type: Array, required: true },
    pageInput: { type: [Number, String], default: 1 },
    pageInputError: { type: Boolean, default: false },
  },
  emits: ['go-to-page', 'go-to-input-page', 'update:pageInput'],
};
</script>

<style src="@/assets/css/expense.css" scoped></style>
