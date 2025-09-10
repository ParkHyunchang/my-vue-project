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
  z-index: 99999; /* 더 높은 z-index 값 설정 */
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none; /* 클릭 이벤트가 토스트를 통과하도록 설정 */
}

.alert {
  min-width: 200px;
  padding: 15px 20px;
  border-radius: 4px;
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease-out;
  pointer-events: auto; /* 알림 자체는 클릭 가능하도록 유지 */
}

.alert-success {
  color: #155724;
  background-color: #d4edda;
  border-color: #c3e6cb;
}

.alert-error {
  color: #721c24;
  background-color: #f8d7da;
  border-color: #f5c6cb;
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
