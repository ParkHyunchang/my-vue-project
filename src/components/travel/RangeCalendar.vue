<template>
  <div class="rc">
    <!-- 선택 요약 -->
    <div class="rc-summary">
      <span class="rc-pick" :class="{ done: value.start }">
        <span class="rc-pick-label">{{ startLabel }}</span>
        <span class="rc-pick-date">{{ value.start ? fmt(value.start) : "클릭" }}</span>
      </span>
      <span class="rc-arrow">→</span>
      <span class="rc-pick" :class="{ done: value.end }">
        <span class="rc-pick-label">{{ endLabel }}</span>
        <span class="rc-pick-date">{{ value.end ? fmt(value.end) : "클릭" }}</span>
      </span>
      <span v-if="nights > 0" class="rc-nights">{{ nights }}박 {{ nights + 1 }}일</span>
      <span v-else-if="value.start" class="rc-nights">당일</span>
      <button v-if="value.start" type="button" class="rc-clear" @click="clear">초기화</button>
    </div>

    <!-- 연/월 이동 (« » = 연도, ‹ › = 월) -->
    <div class="rc-nav">
      <button type="button" class="rc-nav-btn" title="이전 해" @click="prevYear">«</button>
      <button type="button" class="rc-nav-btn" title="이전 달" @click="prevMonth">‹</button>
      <span class="rc-month">{{ viewYear }}년 {{ viewMonth + 1 }}월</span>
      <button type="button" class="rc-nav-btn" title="다음 달" @click="nextMonth">›</button>
      <button type="button" class="rc-nav-btn" title="다음 해" @click="nextYear">»</button>
    </div>

    <!-- 요일 -->
    <div class="rc-dow">
      <span v-for="(d, i) in dows" :key="d" :class="['rc-dow-cell', { sun: i === 0, sat: i === 6 }]">{{ d }}</span>
    </div>

    <!-- 날짜 그리드 -->
    <div class="rc-grid">
      <template v-for="(cell, i) in cells" :key="i">
        <span v-if="!cell" class="rc-cell rc-blank"></span>
        <button
          v-else
          type="button"
          :class="[
            'rc-cell',
            {
              'rc-start': cell.iso === value.start,
              'rc-end': cell.iso === value.end,
              'rc-inrange': inRange(cell.iso),
              'rc-today': cell.iso === todayIso,
              'rc-future': dimFuture && cell.iso > todayIso,
            },
          ]"
          @click="pick(cell.iso)"
        >{{ cell.day }}</button>
      </template>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from "vue";

export default {
  name: "RangeCalendar",
  props: {
    // { start: 'YYYY-MM-DD'|null, end: 'YYYY-MM-DD'|null }
    modelValue: { type: Object, default: () => ({ start: null, end: null }) },
    startLabel: { type: String, default: "출발" },
    endLabel: { type: String, default: "도착" },
    // 미래 날짜를 흐리게 표시할지 (다녀온 곳=true, 예정 일정=false)
    dimFuture: { type: Boolean, default: true },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const dows = ["일", "월", "화", "수", "목", "금", "토"];

    const value = computed(() => ({
      start: props.modelValue?.start || null,
      end: props.modelValue?.end || null,
    }));

    const now = new Date();
    const todayIso = toIso(now);

    // 표시 월: 선택된 출발일이 있으면 그 달, 없으면 이번 달
    const init = value.value.start ? parseIso(value.value.start) : now;
    const viewYear = ref(init.getFullYear());
    const viewMonth = ref(init.getMonth());

    // 모달이 다른 항목으로 다시 열릴 때 표시 월 동기화
    watch(
      () => props.modelValue?.start,
      (s) => {
        if (s) {
          const d = parseIso(s);
          viewYear.value = d.getFullYear();
          viewMonth.value = d.getMonth();
        }
      }
    );

    const cells = computed(() => {
      const first = new Date(viewYear.value, viewMonth.value, 1);
      const startDow = first.getDay();
      const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate();
      const out = [];
      for (let i = 0; i < startDow; i++) out.push(null);
      for (let d = 1; d <= daysInMonth; d++) {
        const iso = `${viewYear.value}-${pad(viewMonth.value + 1)}-${pad(d)}`;
        out.push({ day: d, iso });
      }
      while (out.length % 7 !== 0) out.push(null);
      return out;
    });

    const nights = computed(() => {
      if (!value.value.start || !value.value.end) return 0;
      const a = parseIso(value.value.start);
      const b = parseIso(value.value.end);
      return Math.max(0, Math.round((b - a) / 86400000));
    });

    function inRange(iso) {
      const { start, end } = value.value;
      return start && end && iso > start && iso < end;
    }

    function pick(iso) {
      const { start, end } = value.value;
      if (!start || (start && end)) {
        // 새로 시작
        emit("update:modelValue", { start: iso, end: null });
      } else if (iso < start) {
        // 출발일보다 앞을 누르면 출발일 재설정
        emit("update:modelValue", { start: iso, end: null });
      } else {
        emit("update:modelValue", { start, end: iso });
      }
    }

    function clear() {
      emit("update:modelValue", { start: null, end: null });
    }

    function prevMonth() {
      if (viewMonth.value === 0) {
        viewMonth.value = 11;
        viewYear.value -= 1;
      } else viewMonth.value -= 1;
    }
    function nextMonth() {
      if (viewMonth.value === 11) {
        viewMonth.value = 0;
        viewYear.value += 1;
      } else viewMonth.value += 1;
    }
    function prevYear() {
      viewYear.value -= 1;
    }
    function nextYear() {
      viewYear.value += 1;
    }

    function pad(n) {
      return String(n).padStart(2, "0");
    }
    function toIso(d) {
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
    function parseIso(s) {
      const [y, m, d] = s.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    function fmt(iso) {
      const [, m, d] = iso.split("-");
      return `${m}.${d}`;
    }

    return {
      dows, value, todayIso, viewYear, viewMonth, cells, nights,
      inRange, pick, clear, prevMonth, nextMonth, prevYear, nextYear, fmt,
    };
  },
};
</script>

<style scoped>
.rc {
  border: 1px solid var(--input-border);
  border-radius: 8px;
  background: var(--input-bg);
  padding: 12px;
}

.rc-summary {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  margin-bottom: 12px;
}
.rc-pick {
  display: flex; align-items: baseline; gap: 6px;
  padding: 4px 10px; border-radius: 7px;
  background: var(--card-bg); border: 1px dashed var(--input-border);
}
.rc-pick.done { border-style: solid; border-color: #6366f1; }
.rc-pick-label { font-size: 11px; color: var(--text-muted); }
.rc-pick-date { font-size: 14px; font-weight: 700; color: var(--text-primary); }
.rc-arrow { color: var(--text-muted); }
.rc-nights {
  font-size: 12px; font-weight: 700; color: #4f46e5;
  background: rgba(99, 102, 241, 0.1); padding: 3px 9px; border-radius: 10px;
}
.rc-clear {
  margin-left: auto; border: none; background: none; cursor: pointer;
  color: #ef4444; font-size: 12px; text-decoration: underline;
}

.rc-nav { display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 8px; }
.rc-nav-btn {
  border: 1px solid var(--input-border); background: var(--card-bg);
  color: var(--text-primary); width: 28px; height: 28px; border-radius: 6px;
  cursor: pointer; font-size: 16px; line-height: 1;
}
.rc-month { font-size: 14px; font-weight: 700; color: var(--text-primary); min-width: 100px; text-align: center; }

.rc-dow { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 4px; }
.rc-dow-cell { text-align: center; font-size: 11px; color: var(--text-muted); padding: 4px 0; }
.rc-dow-cell.sun { color: #ef4444; }
.rc-dow-cell.sat { color: #3b82f6; }

.rc-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.rc-cell {
  aspect-ratio: 1 / 1;
  display: flex; align-items: center; justify-content: center;
  border: none; background: none; cursor: pointer;
  font-size: 13px; color: var(--text-primary); border-radius: 7px;
}
.rc-cell.rc-blank { cursor: default; }
.rc-cell:not(.rc-blank):hover { background: rgba(99, 102, 241, 0.12); }
.rc-today { box-shadow: inset 0 0 0 1px var(--input-border); }
.rc-inrange { background: rgba(99, 102, 241, 0.15); border-radius: 0; }
.rc-start, .rc-end { background: #6366f1 !important; color: #fff; font-weight: 700; }
.rc-future { color: var(--text-muted); opacity: 0.5; }
</style>
