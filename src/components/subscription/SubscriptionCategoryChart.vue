<template>
  <div class="insight-card category-card">
    <div class="insight-card-header">
      <h3 class="insight-title">
        🥧 카테고리별 비중
      </h3>
      <span class="insight-sub">활성 구독 월 환산 기준</span>
    </div>

    <div
      v-if="!segments.length"
      class="insight-empty"
    >
      활성 구독이 없습니다.
    </div>

    <div
      v-else
      class="cat-chart-body"
    >
      <div class="cat-donut-wrap">
        <svg
          viewBox="-100 -100 200 200"
          class="cat-donut-svg"
        >
          <path
            v-for="seg in segments"
            :key="seg.id"
            :d="seg.path"
            :fill="seg.color"
            :style="{ opacity: hoveredId && hoveredId !== seg.id ? 0.4 : 1 }"
            class="cat-donut-seg"
            @mouseenter="hoveredId = seg.id"
            @mouseleave="hoveredId = null"
          />
          <template v-if="hovered">
            <text
              y="-12"
              text-anchor="middle"
              font-size="8"
              fill="var(--text-muted)"
              style="pointer-events:none"
            >{{ hovered.name }}</text>
            <text
              y="3"
              text-anchor="middle"
              font-size="13"
              font-weight="700"
              fill="var(--accent)"
              style="pointer-events:none"
            >{{ (hovered.pct * 100).toFixed(1) }}%</text>
            <text
              y="16"
              text-anchor="middle"
              font-size="7.5"
              fill="var(--text-primary)"
              style="pointer-events:none"
            >₩{{ formatCurrency(hovered.value) }}</text>
          </template>
          <template v-else>
            <text
              y="-8"
              text-anchor="middle"
              font-size="9"
              fill="var(--text-muted)"
              style="pointer-events:none"
            >월 평균</text>
            <text
              y="10"
              text-anchor="middle"
              font-size="14"
              font-weight="600"
              fill="var(--text-primary)"
              style="pointer-events:none"
            >₩{{ formatCurrency(totalMonthly) }}</text>
          </template>
        </svg>
      </div>

      <ul class="cat-legend">
        <li
          v-for="seg in segments"
          :key="seg.id"
          class="cat-leg-row"
          @mouseenter="hoveredId = seg.id"
          @mouseleave="hoveredId = null"
        >
          <span
            class="cat-leg-dot"
            :style="{ background: seg.color }"
          />
          <span class="cat-leg-name">{{ seg.name }}</span>
          <span class="cat-leg-count">({{ seg.count }})</span>
          <span class="cat-leg-pct">{{ (seg.pct * 100).toFixed(1) }}%</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';

const PALETTE = [
  '#c9a96e', '#7ec4cf', '#a78bfa', '#fbbf24', '#f97316',
  '#34d399', '#f472b6', '#60a5fa', '#facc15', '#e879f9',
];

function toMonthly(s) {
  const amount = s.amount || 0;
  switch (s.billingCycle) {
    case 'WEEKLY': return amount * 4.345;
    case 'YEARLY': return amount / 12;
    case 'MONTHLY':
    default:       return amount;
  }
}

// 도넛 path 생성 — viewBox -100..100, 바깥 R=88, 안쪽 R=52
function arcPath(startAngle, endAngle) {
  const RO = 88, RI = 52;
  const toXY = (r, a) => [Math.sin(a) * r, -Math.cos(a) * r];
  const [x0, y0] = toXY(RO, startAngle);
  const [x1, y1] = toXY(RO, endAngle);
  const [x2, y2] = toXY(RI, endAngle);
  const [x3, y3] = toXY(RI, startAngle);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M${x0},${y0} A${RO},${RO} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${RI},${RI} 0 ${large} 0 ${x3},${y3} Z`;
}

export default {
  name: 'SubscriptionCategoryChart',
  props: {
    subscriptions: { type: Array, required: true },
    formatCurrency: { type: Function, required: true },
  },
  setup(props) {
    const hoveredId = ref(null);

    const grouped = computed(() => {
      const map = new Map();
      for (const sub of props.subscriptions) {
        if (sub.status !== 'ACTIVE') continue;
        const monthly = toMonthly(sub);
        if (monthly <= 0) continue;
        const key = sub.category || '기타';
        if (!map.has(key)) map.set(key, { name: key, value: 0, count: 0 });
        const entry = map.get(key);
        entry.value += monthly;
        entry.count += 1;
      }
      return Array.from(map.values()).sort((a, b) => b.value - a.value);
    });

    const totalMonthly = computed(() => Math.round(grouped.value.reduce((s, g) => s + g.value, 0)));

    const segments = computed(() => {
      const total = totalMonthly.value;
      if (total <= 0) return [];
      let cursor = 0;
      return grouped.value.map((g, i) => {
        const pct = g.value / total;
        const sweep = pct * Math.PI * 2;
        const start = cursor;
        const end = cursor + sweep;
        cursor = end;
        return {
          id: `cat-${i}`,
          name: g.name,
          value: Math.round(g.value),
          count: g.count,
          pct,
          color: PALETTE[i % PALETTE.length],
          path: arcPath(start, end),
        };
      });
    });

    const hovered = computed(() => segments.value.find(s => s.id === hoveredId.value) || null);

    return { segments, totalMonthly, hoveredId, hovered };
  },
};
</script>

<style src="@/assets/css/subscription.css" scoped></style>
