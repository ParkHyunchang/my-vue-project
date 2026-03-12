<template>
  <div class="toast-box">
    <transition-group name="slide">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="alert"
        :class="`alert-${toast.type}`"
        role="alert"
      >
        {{ toast.message }}
      </div>
    </transition-group>
  </div>
</template>

<script>
import { computed } from 'vue';
import { useStore } from 'vuex';

export default {
  setup() {
    const store = useStore();
    const toasts = computed(() => store.state.toast.toasts);

    return {
      toasts,
    };
  },
};
</script>

<style scoped>
.toast-box {
  position: fixed;
  top: 80px; /* navbar 높이에 맞춰 조정 */
  right: 20px;
  z-index: 100000; /* 모달보다 높은 z-index 값 설정 */
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none; /* 클릭 이벤트가 토스트를 통과하도록 설정 */
}

.alert {
  min-width: 200px;
  padding: 15px 20px;
  border-radius: 8px;
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  color: var(--text-primary);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45);
  animation: slideIn 0.3s ease-out;
  pointer-events: auto;
  font-weight: 500;
}

.alert-success {
  border-color: rgba(106, 173, 106, 0.4);
  background-color: var(--success-bg);
  color: var(--success-color);
}

.alert-danger,
.alert-error {
  border-color: rgba(196, 90, 90, 0.4);
  background-color: var(--danger-bg);
  color: var(--danger-color);
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.slide-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>
