<template>
  <div class="chart-view">
    <div class="chart-inner">
      <div class="donut-box">
        <svg viewBox="-100 -100 200 200" class="donut-svg">
          <path
            v-for="seg in chartSegments"
            :key="seg.id"
            :d="seg.path"
            :fill="seg.color"
            :style="{ opacity: hoveredSegId && hoveredSegId !== seg.id ? 0.45 : 1 }"
            class="donut-seg"
            @mouseenter="$emit('update:hoveredSegId', seg.id)"
            @mouseleave="$emit('update:hoveredSegId', null)"
          />
          <template v-for="seg in chartSegments" :key="'lbl-' + seg.id">
            <text
              v-if="seg.pct >= 0.05"
              :x="seg.labelX"
              :y="seg.labelY"
              text-anchor="middle"
              dominant-baseline="middle"
              font-size="7"
              font-weight="700"
              fill="white"
              style="pointer-events: none"
            >
              {{ (seg.pct * 100).toFixed(1) }}%
            </text>
          </template>
          <template v-if="hoveredSegment">
            <text y="-18" text-anchor="middle" font-size="8" fill="var(--text-muted)" style="pointer-events:none">{{ hoveredSegment.name.length > 8 ? hoveredSegment.name.slice(0,7) + '…' : hoveredSegment.name }}</text>
            <text y="-3" text-anchor="middle" font-size="14" font-weight="700" fill="var(--accent)" style="pointer-events:none">{{ (hoveredSegment.pct * 100).toFixed(1) }}%</text>
            <text y="14" text-anchor="middle" font-size="7.5" fill="var(--text-primary)" style="pointer-events:none">{{ fmtLegVal(hoveredSegment) }}</text>
          </template>
          <template v-else>
            <text
              class="donut-lbl1"
              y="-10"
              text-anchor="middle"
              font-size="9"
              fill="var(--text-muted)"
              style="pointer-events:none"
            >
              총 평가
            </text>
            <text
              class="donut-lbl2"
              y="8"
              text-anchor="middle"
              font-size="15"
              font-weight="600"
              fill="var(--text-primary)"
              style="pointer-events:none"
            >
              {{ filteredHoldingsCount }}종목
            </text>
          </template>
        </svg>
      </div>
      <div class="chart-legend">
        <div v-for="seg in chartSegments" :key="seg.id" class="leg-row">
          <span class="leg-dot" :style="{ background: seg.color }"></span>
          <span class="leg-name">{{ seg.name }}</span>
          <div class="leg-right">
            <span class="leg-pct">{{ (seg.pct * 100).toFixed(1) }}%</span>
            <span class="leg-val">{{ fmtLegVal(seg) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PortfolioChart',
  props: {
    chartSegments: { type: Array, required: true },
    hoveredSegId: { default: null },
    hoveredSegment: { default: null },
    filteredHoldingsCount: { type: Number, required: true },
    fmtLegVal: { type: Function, required: true },
  },
  emits: ['update:hoveredSegId'],
};
</script>

<style src="@/assets/css/stock.css" scoped></style>
