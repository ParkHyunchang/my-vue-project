<template>
  <div class="fixed-section" :class="{ collapsed: fixedCollapsed }">
    <div class="section-header">
      <div class="section-header-left">
        <div>
          <h3>고정 지출 관리</h3>
          <p class="section-subtitle">
            매달 반복되는 지출을 별도로 기록하고 확인하세요.
          </p>
        </div>
      </div>
      <div class="section-actions">
        <div class="fixed-summary compact-summary">
          <span>총 {{ fixedExpenses.length }}건</span>
          <span>합계 {{ formatCurrency(fixedExpensesTotal) }}원</span>
        </div>
        <button
          type="button"
          class="collapse-toggle"
          @click="$emit('toggle')"
          :aria-expanded="!fixedCollapsed"
        >
          <span>{{ fixedCollapsed ? '열기' : '접기' }}</span>
          <span class="collapse-icon">{{ fixedCollapsed ? '＋' : '－' }}</span>
        </button>
        <button class="btn btn-secondary" @click="$emit('create-fixed')">
          + 고정 지출 추가
        </button>
      </div>
    </div>
    <div v-if="fixedCollapsed" class="fixed-collapsed-summary">
      총 {{ fixedExpenses.length }}건 · 합계 {{ formatCurrency(fixedExpensesTotal) }}원
    </div>
    <div v-else>
      <div class="fixed-toolbar">
        <div class="fixed-summary">
          <span>총 {{ fixedExpenses.length }}건</span>
          <span>합계 {{ formatCurrency(fixedExpensesTotal) }}원</span>
        </div>
        <button
          class="btn btn-primary"
          @click="$emit('import-fixed')"
          :disabled="isImportingFixed || fixedExpenses.length === 0 || !canImportToCurrentView"
          :title="canImportToCurrentView ? '' : '현재 선택한 기간에는 고정 지출을 일괄 추가할 수 없습니다.'"
        >
          <span v-if="isImportingFixed">추가 중...</span>
          <span v-else>{{ importButtonLabel }}</span>
        </button>
      </div>
      <div v-if="fixedLoading" class="fixed-loading">
        고정 지출을 불러오는 중입니다...
      </div>
      <div v-else-if="fixedExpenses.length === 0" class="empty-state">
        등록된 고정 지출이 없습니다.
      </div>
      <div v-else class="fixed-list">
        <div
          v-for="expense in fixedExpenses"
          :key="expense.id"
          class="fixed-item"
        >
          <div class="fixed-item-main">
            <div class="fixed-item-title">
              <h4>{{ expense.title }}</h4>
              <span class="badge badge-fixed">고정</span>
            </div>
            <p v-if="expense.description" class="description">
              {{ expense.description }}
            </p>
            <div class="meta">
              <span class="category">{{ expense.category }}</span>
              <span class="date">{{ formatDate(expense.createdAt) }}</span>
            </div>
          </div>
          <div class="fixed-item-amount">
            - {{ formatCurrency(expense.amount) }}원
          </div>
          <div class="fixed-item-actions">
            <button @click="$emit('edit', expense)" class="btn btn-sm btn-primary">
              수정
            </button>
            <button @click="$emit('delete', expense)" class="btn btn-sm btn-danger">
              삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FixedExpenseSection',
  props: {
    fixedExpenses: { type: Array, required: true },
    fixedExpensesTotal: { type: Number, required: true },
    fixedCollapsed: { type: Boolean, required: true },
    fixedLoading: { type: Boolean, default: false },
    isImportingFixed: { type: Boolean, default: false },
    canImportToCurrentView: { type: Boolean, default: false },
    importButtonLabel: { type: String, default: '' },
    formatCurrency: { type: Function, required: true },
    formatDate: { type: Function, required: true },
  },
  emits: ['toggle', 'create-fixed', 'import-fixed', 'edit', 'delete'],
};
</script>

<style src="@/assets/css/expense.css" scoped></style>
