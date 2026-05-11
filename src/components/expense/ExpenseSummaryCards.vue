<template>
  <div class="summary-cards">
    <div class="summary-card income">
      <h3>총 수입</h3>
      <p class="amount">{{ formatCurrency(summary.totalIncome) }}원</p>
    </div>
    <div class="summary-card expense">
      <h3>총 지출</h3>
      <p class="amount">{{ formatCurrency(summary.totalExpense) }}원</p>
    </div>
    <div class="summary-card balance" :class="{ negative: summary.balance < 0 }">
      <h3>잔액</h3>
      <p class="amount">{{ formatCurrency(summary.balance) }}원</p>
    </div>
    <div class="summary-card fixed">
      <h3>고정 지출 합계</h3>
      <p class="amount">{{ formatCurrency(summary.totalFixedExpense) }}원</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ExpenseSummaryCards',
  props: {
    summary: {
      type: Object,
      required: true,
    },
    formatCurrency: {
      type: Function,
      required: true,
    },
  },
};
</script>

<style src="@/assets/css/expense.css" scoped></style>
