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

<style scoped>
.lightbox-overlay {
  position: fixed;
  inset: 0;
  /* navbar(보통 z-index 1000~9000)보다 위에 와야 함 */
  z-index: 99999;
  background: rgba(0, 0, 0, 0.93);
  display: flex;
  align-items: center;
  justify-content: center;
}
.lightbox-content {
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
.lightbox-media {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.7);
}

/* 좌측 상단: 뒤로 버튼 (텍스트 + 화살표) */
.lightbox-back {
  position: fixed;
  top: 20px;
  left: 24px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid rgba(255, 255, 255, 0.55);
  color: #fff;
  padding: 8px 16px 8px 14px;
  border-radius: 24px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.15s ease, border-color 0.2s ease;
  z-index: 3;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.55);
}
.lightbox-back:hover {
  background: rgba(0, 0, 0, 0.85);
  border-color: #fff;
  transform: translateX(-2px);
}

/* 우측 상단: 닫기 X */
.lightbox-close {
  position: fixed;
  top: 20px;
  right: 24px;
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid rgba(255, 255, 255, 0.55);
  color: #fff;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease, transform 0.15s ease, border-color 0.2s ease;
  z-index: 3;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.55);
}
.lightbox-close:hover {
  background: rgba(0, 0, 0, 0.85);
  border-color: #fff;
  transform: scale(1.06);
}

/* 좌우 화살표 */
.lightbox-nav {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid rgba(255, 255, 255, 0.55);
  color: #fff;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease, transform 0.15s ease, border-color 0.2s ease;
  z-index: 3;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.6);
}
.lightbox-nav:hover {
  background: rgba(0, 0, 0, 0.85);
  border-color: #fff;
}
.lightbox-prev { left: 24px; }
.lightbox-prev:hover {
  transform: translateY(-50%) scale(1.08) translateX(-3px);
}
.lightbox-next { right: 24px; }
.lightbox-next:hover {
  transform: translateY(-50%) scale(1.08) translateX(3px);
}

.lightbox-counter {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  color: #fff;
  background: rgba(0, 0, 0, 0.6);
  padding: 6px 14px;
  border-radius: 14px;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  z-index: 3;
}

@media (max-width: 768px) {
  .lightbox-back {
    top: max(14px, env(safe-area-inset-top));
    left: max(12px, env(safe-area-inset-left));
    padding: 6px 12px 6px 10px;
    font-size: 0.85rem;
  }
  .lightbox-close {
    top: max(14px, env(safe-area-inset-top));
    right: max(14px, env(safe-area-inset-right));
    width: 42px;
    height: 42px;
  }
  .lightbox-nav {
    width: 48px;
    height: 48px;
  }
  .lightbox-nav svg {
    width: 26px;
    height: 26px;
  }
  .lightbox-prev { left: max(10px, env(safe-area-inset-left)); }
  .lightbox-next { right: max(10px, env(safe-area-inset-right)); }
  .lightbox-counter {
    bottom: max(20px, calc(env(safe-area-inset-bottom) + 12px));
  }
}
</style>
