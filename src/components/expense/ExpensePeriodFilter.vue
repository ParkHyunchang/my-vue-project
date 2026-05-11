<template>
  <div class="period-section">
    <div class="period-buttons">
      <button
        :class="['period-button', { active: periodFilter === 'current-month' }]"
        @click="$emit('set-period', 'current-month')"
      >
        이번 달
      </button>
      <button
        :class="['period-button', { active: periodFilter === 'previous-month' }]"
        @click="$emit('set-period', 'previous-month')"
      >
        지난 달
      </button>
      <button
        :class="['period-button', { active: periodFilter === 'custom-month' }]"
        @click="$emit('set-period', 'custom-month')"
      >
        달 선택
      </button>
      <button
        :class="['period-button', { active: periodFilter === 'custom-range' }]"
        @click="$emit('set-period', 'custom-range')"
      >
        기간 선택
      </button>
      <button
        :class="['period-button', { active: periodFilter === 'all' }]"
        @click="$emit('set-period', 'all')"
      >
        전체
      </button>
    </div>

    <div v-if="periodFilter === 'custom-month'" class="period-inputs">
      <label class="period-label-text" for="periodMonth">조회할 달</label>
      <input
        id="periodMonth"
        type="month"
        :value="selectedMonth"
        class="period-input"
        @input="$emit('update:selectedMonth', $event.target.value)"
      />
    </div>

    <div v-if="periodFilter === 'custom-range'" class="period-inputs range-inputs">
      <label class="period-label-text">조회 기간</label>
      <div class="range-fields">
        <input
          type="date"
          :value="customStartDate"
          class="period-input"
          @input="$emit('update:customStartDate', $event.target.value)"
        />
        <span class="range-separator">~</span>
        <input
          type="date"
          :value="customEndDate"
          class="period-input"
          @input="$emit('update:customEndDate', $event.target.value)"
        />
      </div>
    </div>

    <div v-if="periodLabel" class="period-label">
      {{ periodLabel }}
    </div>
    <div v-if="dateRangeError" class="period-error">
      {{ dateRangeError }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'ExpensePeriodFilter',
  props: {
    periodFilter: { type: String, required: true },
    selectedMonth: { type: String, default: '' },
    customStartDate: { type: String, default: '' },
    customEndDate: { type: String, default: '' },
    periodLabel: { type: String, default: '' },
    dateRangeError: { type: String, default: '' },
  },
  emits: [
    'set-period',
    'update:selectedMonth',
    'update:customStartDate',
    'update:customEndDate',
  ],
};
</script>

<style src="@/assets/css/expense.css" scoped></style>
