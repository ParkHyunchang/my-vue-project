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

  // 재시도 버튼 대기: 로컬 연타 방지(30초)와 provider 차단 해제(retryAt) 중 더 늦은 시점.
  // 로컬 쿨다운만 보면 provider가 아직 차단 중일 때 눌러 무조건 실패하는 요청이 나간다.
  const cooldownSec = computed(() => {
    let localSec = 0;
    if (lastFetchAt.value) {
      const elapsed = Math.floor((now.value - lastFetchAt.value) / 1000);
      localSec = Math.max(0, 30 - elapsed);
    }
    let retrySec = 0;
    if (retryAt.value) {
      retrySec = Math.max(0, Math.floor((retryAt.value.getTime() - now.value) / 1000));
    }
    return Math.max(localSec, retrySec);
  });

  const cooldownText = computed(() => {
    const sec = cooldownSec.value;
    if (sec <= 0) return '';
    if (sec < 60) return `${sec}초`;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0) return `${h}시간 ${String(m).padStart(2, '0')}분`;
    return `${m}분 ${String(sec % 60).padStart(2, '0')}초`;
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
    cooldownText,
    allDisabled,
    loadingText,
    reset,
    runAnalysis,
    formatTime,
  };
}
