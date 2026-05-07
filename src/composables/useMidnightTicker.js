import { ref, onMounted, onUnmounted } from "vue";

export function useMidnightTicker() {
  const nowTick = ref(Date.now());
  let timer = null;
  let onVisibilityChange = null;
  let lastDayKey = "";

  const getDayKey = (ms) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };

  const scheduleNext = () => {
    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0, 0, 0, 0,
    );
    const delay = Math.max(0, nextMidnight.getTime() - now.getTime());
    timer = setTimeout(() => {
      nowTick.value = Date.now();
      lastDayKey = getDayKey(nowTick.value);
      scheduleNext();
    }, delay);
  };

  onMounted(() => {
    lastDayKey = getDayKey(nowTick.value);
    scheduleNext();
    onVisibilityChange = () => {
      if (document.hidden) return;
      const nowMs = Date.now();
      const dayKey = getDayKey(nowMs);
      if (dayKey !== lastDayKey) {
        lastDayKey = dayKey;
        nowTick.value = nowMs;
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
  });

  onUnmounted(() => {
    if (timer) clearTimeout(timer);
    if (onVisibilityChange) {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      onVisibilityChange = null;
    }
  });

  return { nowTick };
}
