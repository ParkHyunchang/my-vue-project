<template>
  <teleport to="body">
    <div
      v-if="modelValue"
      class="lightbox-overlay"
      @click.self="close"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <!-- 좌측 상단: 뒤로 -->
      <button class="lightbox-back" aria-label="뒤로" @click="close">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        <span>뒤로</span>
      </button>

      <!-- 우측 상단: 닫기(X) -->
      <button class="lightbox-close" aria-label="닫기" @click="close">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      <!-- 좌측 화살표 -->
      <button
        v-if="items.length > 1"
        class="lightbox-nav lightbox-prev"
        aria-label="이전"
        @click="prev"
      >
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <!-- 우측 화살표 -->
      <button
        v-if="items.length > 1"
        class="lightbox-nav lightbox-next"
        aria-label="다음"
        @click="next"
      >
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      <div class="lightbox-content" @click.stop>
        <video
          v-if="items[currentIndex]?.isVideo"
          :key="'v-' + currentIndex"
          :src="items[currentIndex]?.url"
          class="lightbox-media"
          controls
          playsinline
        ></video>
        <img
          v-else
          :key="'i-' + currentIndex"
          :src="items[currentIndex]?.url"
          class="lightbox-media"
        />
      </div>

      <div v-if="items.length > 1" class="lightbox-counter">
        {{ currentIndex + 1 }} / {{ items.length }}
      </div>
    </div>
  </teleport>
</template>

<script>
import { ref, watch } from "vue";

export default {
  name: "LightboxViewer",
  props: {
    modelValue: { type: Boolean, default: false },
    items: { type: Array, default: () => [] },
    initialIndex: { type: Number, default: 0 },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const currentIndex = ref(props.initialIndex);
    const touchStartX = ref(0);

    const close = () => emit("update:modelValue", false);
    const prev = () => {
      currentIndex.value = (currentIndex.value - 1 + props.items.length) % props.items.length;
    };
    const next = () => {
      currentIndex.value = (currentIndex.value + 1) % props.items.length;
    };

    const onKey = (e) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };

    const onTouchStart = (e) => { touchStartX.value = e.touches[0].clientX; };
    const onTouchEnd = (e) => {
      const delta = e.changedTouches[0].clientX - touchStartX.value;
      if (Math.abs(delta) < 50) return;
      if (delta < 0) next();
      else prev();
    };

    watch(
      () => props.modelValue,
      (open) => {
        if (open) {
          currentIndex.value = props.initialIndex;
          document.addEventListener("keydown", onKey);
        } else {
          document.removeEventListener("keydown", onKey);
        }
      },
    );

    return { currentIndex, close, prev, next, onTouchStart, onTouchEnd };
  },
};
</script>

<style src="@/assets/css/components/lightbox.css" scoped></style>
