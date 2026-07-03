import { computed, onBeforeUnmount, ref, unref, watch } from 'vue';
import { apiErrorMessage } from '@/utils/apiError';

export function useAiAnalysis({
  show,
  loadingMessages,
  errorFallback,
  onError,
  resetExtra = () => {},
}) {
  const loading = ref(false);
  const error = ref('');
  const blocked = ref(false);
  const report = ref('');
  const providerName = ref('');
  const model = ref('');
  const analyzedAt = ref(null);
  const retryAt = ref(null);
  const providersStatus = ref([]);
  const loadingMsgIdx = ref(0);
  const now = ref(Date.now());
  const lastFetchAt = ref(0);

  let loadingTimer = null;
  let tickerTimer = null;

  const messages = computed(() => unref(loadingMessages) || []);
  const loadingText = computed(() => messages.value[loadingMsgIdx.value] || '');

  function reset() {
    loading.value = false;
    error.value = '';
    blocked.value = false;
    report.value = '';
    providerName.value = '';
    model.value = '';
    analyzedAt.value = null;
    retryAt.value = null;
    providersStatus.value = [];
    resetExtra();
  }

  function startLoadingRotation() {
    loadingMsgIdx.value = 0;
    clearInterval(loadingTimer);
    if (messages.value.length <= 1) return;
    loadingTimer = setInterval(() => {
      loadingMsgIdx.value = (loadingMsgIdx.value + 1) % messages.value.length;
    }, 3500);
  }

  async function runAnalysis(requestFn, onData = () => {}) {
    reset();
    loading.value = true;
    startLoadingRotation();

    try {
      const data = await requestFn();
      if (data?.blocked) {
        blocked.value = true;
        retryAt.value = data.retryAt ? new Date(data.retryAt) : null;
        providersStatus.value = data.providersStatus || [];
      } else {
        onData(data || {});
        providerName.value = data?.providerName || '';
        model.value = data?.model || '';
        analyzedAt.value = data?.analyzedAt ? new Date(data.analyzedAt) : new Date();
        providersStatus.value = data?.providersStatus || [];
      }
    } catch (err) {
      if (onError) onError(err);
      error.value = apiErrorMessage(err, errorFallback);
    } finally {
      loading.value = false;
      clearInterval(loadingTimer);
      loadingTimer = null;
      lastFetchAt.value = Date.now();
    }
  }

  const showSource = typeof show === 'function' ? show : () => unref(show);
  watch(
    showSource,
    (showVal) => {
      clearInterval(tickerTimer);
      if (showVal) {
        now.value = Date.now();
        tickerTimer = setInterval(() => { now.value = Date.now(); }, 1000);
      }
    },
    { immediate: true },
  );

  const retryCountdown = computed(() => {
    if (!retryAt.value) return null;
    const diff = retryAt.value.getTime() - now.value;
    if (diff <= 0) return '곧 가능';
    const totalSec = Math.floor(diff / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}시간 ${String(m).padStart(2, '0')}분`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  });

  const cooldownSec = computed(() => {
    if (!lastFetchAt.value) return 0;
    const elapsed = Math.floor((now.value - lastFetchAt.value) / 1000);
    return Math.max(0, 30 - elapsed);
  });

  const allDisabled = computed(() =>
    providersStatus.value.length > 0 &&
    providersStatus.value.every((providerStatus) => !providerStatus.enabled),
  );

  function formatTime(date) {
    if (!date) return '';
    return date.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  onBeforeUnmount(() => {
    clearInterval(loadingTimer);
    clearInterval(tickerTimer);
  });

  return {
    loading,
    error,
    blocked,
    report,
    providerName,
    model,
    analyzedAt,
    providersStatus,
    retryCountdown,
    cooldownSec,
    allDisabled,
    loadingText,
    reset,
    runAnalysis,
    formatTime,
  };
}
