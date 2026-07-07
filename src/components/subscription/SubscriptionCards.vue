<template>
  <div
    v-if="!subscriptions.length"
    class="empty-state"
  >
    아직 등록된 구독이 없습니다.
  </div>
  <div
    v-else
    class="subscription-grid"
  >
    <div
      v-for="sub in subscriptions"
      :key="sub.id"
      :class="['sub-card', `status-${(sub.status || 'ACTIVE').toLowerCase()}`]"
      @click="$emit('edit', sub)"
    >
      <div
        class="sub-card-accent"
        :style="{ background: sub.color || '#64748b' }"
      />
      <div class="sub-card-body">
        <div class="sub-card-top">
          <div class="sub-name-wrap">
            <h4 class="sub-name">
              {{ sub.name }}
            </h4>
            <span
              v-if="sub.category"
              class="sub-category"
            >{{ sub.category }}</span>
          </div>
          <span :class="['status-badge', `status-${(sub.status || 'ACTIVE').toLowerCase()}`]">
            {{ statusLabel(sub.status) }}
          </span>
        </div>

        <div class="sub-card-amount">
          <span class="amount-value">{{ currencySymbol(sub.currency) }}{{ formatCurrency(sub.amount) }}</span>
          <span class="amount-cycle">/ {{ cycleLabel(sub.billingCycle) }}</span>
        </div>

        <div class="sub-card-meta">
          <div class="meta-row">
            <span class="meta-label">다음 결제</span>
            <span class="meta-value">
              {{ formatDate(sub.nextBillingDate) }}
              <span :class="['dday-chip', ddayClass(sub.nextBillingDate, sub.status)]">
                {{ ddayLabel(sub.nextBillingDate, sub.status) }}
              </span>
            </span>
          </div>
          <div
            v-if="sub.paymentMethod"
            class="meta-row"
          >
            <span class="meta-label">결제수단</span>
            <span class="meta-value">{{ sub.paymentMethod }}</span>
          </div>
          <div
            v-if="sub.memo"
            class="meta-row memo-row"
          >
            <span class="meta-value memo-text">{{ sub.memo }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const CYCLE_LABEL = { MONTHLY: '월', YEARLY: '년', WEEKLY: '주' };
const STATUS_LABEL = { ACTIVE: '활성', PAUSED: '일시정지', CANCELED: '해지됨' };
const CURRENCY_SYMBOL = { KRW: '₩', USD: '$', JPY: '¥', EUR: '€' };

export default {
  name: 'SubscriptionCards',
  props: {
    subscriptions: { type: Array, required: true },
    formatCurrency: { type: Function, required: true },
  },
  emits: ['edit'],
  setup() {
    const formatDate = (d) => {
      if (!d) return '-';
      const date = new Date(d);
      return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
    };
    const cycleLabel = (c) => CYCLE_LABEL[c] || '월';
    const statusLabel = (s) => STATUS_LABEL[s] || '활성';
    const currencySymbol = (c) => CURRENCY_SYMBOL[c] || '₩';

    const daysUntil = (d) => {
      if (!d) return null;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const target = new Date(d); target.setHours(0, 0, 0, 0);
      return Math.round((target - today) / (1000 * 60 * 60 * 24));
    };

    const ddayLabel = (d, status) => {
      if (status === 'CANCELED' || status === 'PAUSED') return '-';
      const n = daysUntil(d);
      if (n === null) return '';
      if (n === 0) return 'D-day';
      if (n > 0) return `D-${n}`;
      return `D+${Math.abs(n)}`;
    };

    const ddayClass = (d, status) => {
      if (status === 'CANCELED' || status === 'PAUSED') return 'dday-mute';
      const n = daysUntil(d);
      if (n === null) return 'dday-mute';
      if (n < 0) return 'dday-overdue';
      if (n <= 3) return 'dday-urgent';
      if (n <= 7) return 'dday-soon';
      return 'dday-normal';
    };

    return { formatDate, cycleLabel, statusLabel, currencySymbol, ddayLabel, ddayClass };
  },
};
</script>

<style src="@/assets/css/subscription.css" scoped></style>
