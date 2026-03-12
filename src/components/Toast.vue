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


