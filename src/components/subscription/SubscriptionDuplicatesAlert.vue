<template>
  <div v-if="duplicates.length" class="dup-alert">
    <div class="dup-alert-header">
      <span class="dup-alert-icon">⚠️</span>
      <span class="dup-alert-title">중복 카테고리 감지</span>
      <span class="dup-alert-sub">같은 카테고리에 여러 구독이 활성화되어 있어요. 정리하면 절약 가능합니다.</span>
    </div>
    <ul class="dup-alert-list">
      <li v-for="g in duplicates" :key="g.category" class="dup-alert-item">
        <span class="dup-cat">#{{ g.category }}</span>
        <span class="dup-services">
          <span v-for="s in g.subs" :key="s.id" class="dup-service-chip">
            {{ s.name }}<span class="dup-amount">{{ fmtMonthly(s) }}</span>
          </span>
        </span>
        <span class="dup-total">월 합계 ₩{{ formatCurrency(g.monthlyTotal) }}</span>
      </li>
    </ul>
  </div>
</template>

<script>
import { computed } from 'vue';

function toMonthly(s) {
  const amount = s.amount || 0;
  switch (s.billingCycle) {
    case 'WEEKLY': return amount * 4.345;
    case 'YEARLY': return amount / 12;
    case 'MONTHLY':
    default:       return amount;
  }
}

export default {
  name: 'SubscriptionDuplicatesAlert',
  props: {
    subscriptions: { type: Array, required: true },
    formatCurrency: { type: Function, required: true },
  },
  setup(props) {
    const duplicates = computed(() => {
      const map = new Map();
      for (const sub of props.subscriptions) {
        if (sub.status !== 'ACTIVE') continue;
        const key = sub.category || '기타';
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(sub);
      }
      return Array.from(map.entries())
        .filter(([, subs]) => subs.length >= 2)
        .map(([category, subs]) => ({
          category,
          subs,
          monthlyTotal: Math.round(subs.reduce((s, x) => s + toMonthly(x), 0)),
        }))
        .sort((a, b) => b.monthlyTotal - a.monthlyTotal);
    });

    const fmtMonthly = (s) => {
      const m = Math.round(toMonthly(s));
      return ` · ₩${props.formatCurrency(m)}/월`;
    };

    return { duplicates, fmtMonthly };
  },
};
</script>

<style src="@/assets/css/subscription.css" scoped></style>
