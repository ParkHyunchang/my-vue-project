<template>
  <div class="expense-list">
    <div v-if="expenses.length === 0" class="empty-state">
      가계부 항목이 없습니다.
    </div>
    <div
      v-else
      v-for="expense in expenses"
      :key="expense.id"
      class="expense-item"
    >
      <div class="expense-info">
        <div class="expense-header">
          <h4>{{ expense.title }}</h4>
          <div class="expense-tags">
            <span
              class="badge"
              :class="expense.type === 'INCOME' ? 'badge-income' : 'badge-expense'"
            >
              {{ expense.type === 'INCOME' ? '수입' : '지출' }}
            </span>
            <span v-if="expense.fixed" class="badge badge-fixed">
              고정
            </span>
          </div>
        </div>
        <p v-if="expense.description" class="description">
          {{ expense.description }}
        </p>
        <div class="meta">
          <span class="category">{{ expense.category }}</span>
          <span class="date">{{ formatDate(expense.createdAt) }}</span>
        </div>
      </div>
      <div class="expense-amount" :class="expense.type.toLowerCase()">
        <span v-if="expense.type === 'INCOME'">+</span>
        <span v-else>-</span>
        {{ formatCurrency(expense.amount) }}원
      </div>
      <div class="expense-actions">
        <button @click="$emit('edit', expense)" class="btn btn-sm btn-primary">수정</button>
        <button @click="$emit('delete', expense)" class="btn btn-sm btn-danger">삭제</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ExpenseList',
  props: {
    expenses: { type: Array, required: true },
    formatCurrency: { type: Function, required: true },
    formatDate: { type: Function, required: true },
  },
  emits: ['edit', 'delete'],
};
</script>

<style src="@/assets/css/expense.css" scoped></style>
