<template>
  <div v-if="firstMeetDate || specialDate" class="dday-section">
    <div class="dday-container">
      <div v-if="firstMeetDate" class="dday-item">
        <div class="dday-label">
          <i class="fas fa-heart"></i>
          첫만남
        </div>
        <div class="dday-value">D+{{ firstMeetDays }}</div>
        <div class="dday-date">
          <template v-if="firstMeetEndDate">
            <span>{{ formatDate(firstMeetDate) }}</span>
            <span>~ {{ formatDate(firstMeetEndDate) }}</span>
          </template>
          <span v-else>{{ formatDate(firstMeetDate) }}</span>
        </div>
      </div>
      <div v-if="specialDate" class="dday-item">
        <div class="dday-label">
          <i class="fas fa-star"></i>
          사귄날
        </div>
        <div class="dday-value">D+{{ specialDays }}</div>
        <div class="dday-date">
          <template v-if="specialEndDate">
            <span>{{ formatDate(specialDate) }}</span>
            <span>~ {{ formatDate(specialEndDate) }}</span>
          </template>
          <span v-else>{{ formatDate(specialDate) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from "vue";
import { useMidnightTicker } from "@/composables/useMidnightTicker";

const toLocalMidnight = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const parseYmdLocalMidnight = (v) => {
  if (!v) return null;
  const s = String(v);
  const d = s.length === 10 ? new Date(`${s}T00:00:00`) : new Date(s);
  return toLocalMidnight(d);
};

const formatDate = (date) => {
  const d = parseYmdLocalMidnight(date);
  if (!d) return "";
  return d.toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
  });
};

export default {
  name: "DdayDisplay",
  props: {
    memories: { type: Array, default: () => [] },
  },
  setup(props) {
    const { nowTick } = useMidnightTicker();

    const firstMeetDate = computed(() => {
      const item = props.memories.find((m) => m.category === "first_meet");
      if (!item) return null;
      return item.dateType === "range" && item.startDate ? item.startDate : item.date;
    });

    const firstMeetEndDate = computed(() => {
      const item = props.memories.find((m) => m.category === "first_meet");
      return item && item.dateType === "range" && item.endDate ? item.endDate : null;
    });

    const specialDate = computed(() => {
      const item = props.memories.find((m) => m.category === "special");
      if (!item) return null;
      return item.dateType === "range" && item.startDate ? item.startDate : item.date;
    });

    const specialEndDate = computed(() => {
      const item = props.memories.find((m) => m.category === "special");
      return item && item.dateType === "range" && item.endDate ? item.endDate : null;
    });

    const firstMeetDays = computed(() => {
      if (!firstMeetDate.value) return 0;
      const today = toLocalMidnight(new Date(nowTick.value));
      const fm = parseYmdLocalMidnight(firstMeetDate.value);
      return Math.floor((today - fm) / (1000 * 60 * 60 * 24));
    });

    const specialDays = computed(() => {
      if (!specialDate.value) return 0;
      const today = toLocalMidnight(new Date(nowTick.value));
      const sp = parseYmdLocalMidnight(specialDate.value);
      return Math.floor((today - sp) / (1000 * 60 * 60 * 24));
    });

    return {
      firstMeetDate, firstMeetEndDate,
      specialDate, specialEndDate,
      firstMeetDays, specialDays,
      formatDate,
    };
  },
};
</script>

<style src="@/assets/css/dating.css" scoped></style>
