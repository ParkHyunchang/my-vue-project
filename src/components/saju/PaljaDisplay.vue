<template>
  <div class="sj-palja-display">
    <div class="sj-pillars">
      <div
        v-for="p in pillarList"
        :key="p.key"
        class="sj-pillar"
      >
        <div class="sj-pillar-label">
          {{ p.title }}
        </div>
        <div :class="['sj-pillar-value', { 'sj-pillar-empty': p.empty }]">
          {{ p.value }}
        </div>
      </div>
    </div>

    <div class="sj-elements">
      <div
        v-for="el in elementList"
        :key="el.name"
        class="sj-element-bar"
      >
        <div class="sj-element-value">
          {{ el.count }}
        </div>
        <div class="sj-element-track">
          <div
            class="sj-element-fill"
            :style="{ height: (el.count / 8 * 100) + '%', background: el.color }"
          />
        </div>
        <div class="sj-element-name">
          {{ el.name }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from "vue";

const ELEMENT_COLORS = { 목: "#199e70", 화: "#b83232", 토: "#c98500", 금: "#d55181", 수: "#3987e5" };

export default {
  name: "PaljaDisplay",
  props: {
    palja: { type: Object, default: null },
  },
  setup(props) {
    const pillarList = computed(() => {
      const p = props.palja;
      if (!p) return [];
      return [
        { key: "year", title: "년주", value: p.yearPillar?.label || "-" },
        { key: "month", title: "월주", value: p.monthPillar?.label || "-" },
        { key: "day", title: "일주", value: p.dayPillar?.label || "-" },
        { key: "hour", title: "시주", value: p.hourPillar?.label || "모름", empty: !p.hourPillar },
      ];
    });

    const elementList = computed(() => {
      const counts = props.palja?.fiveElementCounts || {};
      return ["목", "화", "토", "금", "수"].map((name) => ({
        name,
        count: counts[name] || 0,
        color: ELEMENT_COLORS[name],
      }));
    });

    return { pillarList, elementList };
  },
};
</script>

<style src="@/assets/css/components/saju/palja-display.css" scoped></style>
