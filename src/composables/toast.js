import { computed } from 'vue';
import { useStore } from 'vuex';

export const useToast = () => {
    const store = useStore();
    const toasts = computed(() => store.state.toast.toasts);

    const showToast = (message, type = 'success') => {
        store.dispatch('toast/showToast', { message, type });
    };

    return {
        toasts,
        showToast,
    };
};
