<template>
  <div class="summary-cards">
    <div class="summary-card">
      <div class="summary-label">
        활성 구독
      </div>
      <div class="summary-value">
        {{ activeCount }}<span class="summary-unit">건</span>
      </div>
      <div
        v-if="pausedCount + canceledCount > 0"
        class="summary-sub"
      >
        일시정지 {{ pausedCount }} · 해지 {{ canceledCount }}
      </div>
    </div>

    <div class="summary-card">
      <div class="summary-label">
        월 평균 지출
      </div>
      <div class="summary-value">
        {{ formatCurrency(monthlyTotal) }}<span class="summary-unit">원</span>
      </div>
      <div class="summary-sub">
        활성 구독 기준 월 환산
      </div>
    </div>

    <div class="summary-card">
      <div class="summary-label">
        연 환산 지출
      </div>
      <div class="summary-value">
        {{ formatCurrency(yearlyTotal) }}<span class="summary-unit">원</span>
      </div>
      <div class="summary-sub">
        월 × 12
      </div>
    </div>

    <div class="summary-card">
      <div class="summary-label">
        이번 달 결제 예정
      </div>
      <div class="summary-value">
        {{ formatCurrency(thisMonthTotal) }}<span class="summary-unit">원</span>
      </div>
      <div class="summary-sub">
        {{ thisMonthCount }}건 예정
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';

export default {
  name: 'SubscriptionSummary',
  props: {
    subscriptions: { type: Array, required: true },
    formatCurrency: { type: Function, required: true },
  },
  setup(props) {
    const activeList = computed(() =>
      props.subscriptions.filter(s => s.status === 'ACTIVE')
    );

    const activeCount = computed(() => activeList.value.length);
    const pausedCount = computed(() => props.subscriptions.filter(s => s.status === 'PAUSED').length);
    const canceledCount = computed(() => props.subscriptions.filter(s => s.status === 'CANCELED').length);

    const monthlyTotal = computed(() =>
      activeList.value.reduce((sum, s) => sum + toMonthly(s), 0)
    );
    const yearlyTotal = computed(() => Math.round(monthlyTotal.value * 12));

    const thisMonthList = computed(() => {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      return activeList.value.filter(s => {
        if (!s.nextBillingDate) return false;
        const d = new Date(s.nextBillingDate);
        return d.getFullYear() === y && d.getMonth() === m;
      });
    });
    const thisMonthCount = computed(() => thisMonthList.value.length);
    const thisMonthTotal = computed(() =>
      thisMonthList.value.reduce((sum, s) => sum + (s.amount || 0), 0)
    );

    return {
      activeCount, pausedCount, canceledCount,
      monthlyTotal, yearlyTotal,
      thisMonthCount, thisMonthTotal,
    };
  },
};

// 결제 주기를 월 단위 금액으로 환산.
// WEEKLY → 4.345주/월, YEARLY → /12.
function toMonthly(s) {
  const amount = s.amount || 0;
  switch (s.billingCycle) {
    case 'WEEKLY': return amount * 4.345;
    case 'YEARLY': return amount / 12;
    case 'MONTHLY':
    default:       return amount;
  }
}
</script>

<style src="@/assets/css/subscription.css" scoped></style>
