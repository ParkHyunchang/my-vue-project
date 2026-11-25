<template>
  <details
    v-if="!hidden"
    class="manual-cleanup"
    @toggle="onToggle"
  >
    <summary>이전 수기 기록 정리</summary>
    <div class="cleanup-body">
      <p>현재 로그인한 계정에 직접 입력했던 주식·현금성 자산과 수기 계좌를 삭제합니다. 키움으로 표시한 수기 계좌도 포함됩니다.</p>
      <p>키움 자동매매의 보유·주문·체결·전략 기록은 유지됩니다.</p>
      <p
        v-if="loading"
        role="status"
      >
        삭제할 기록을 확인하고 있습니다.
      </p>
      <p
        v-if="error"
        role="alert"
      >
        {{ error }}
      </p>
      <p
        v-if="success"
        role="status"
      >
        {{ success }}
      </p>
      <template v-if="summary && !loading">
        <dl>
          <div
            v-for="item in categories"
            :key="item.key"
          >
            <dt>{{ item.label }}</dt><dd>{{ summary[item.key] }}개</dd>
          </div>
        </dl>
        <p v-if="summary.total === 0">
          삭제할 수기 기록이 없습니다.
        </p>
        <button
          v-if="summary.total === 0"
          type="button"
          @click="hideCompleted"
        >
          정리 도구 숨기기
        </button>
        <label
          v-else
          class="confirmation"
        >
          <input
            v-model="confirmed"
            type="checkbox"
            :disabled="deleting"
          >
          <span>위 수기 기록을 모두 삭제합니다. 삭제 후 복구할 수 없습니다.</span>
        </label>
        <button
          v-if="summary.total > 0"
          type="button"
          class="delete-button"
          :disabled="!confirmed || deleting"
          @click="remove"
        >
          {{ deleting ? '삭제 중…' : '수기 기록 모두 삭제' }}
        </button>
      </template>
      <button
        type="button"
        :disabled="loading || deleting"
        @click="load"
      >
        {{ summary ? '다시 확인' : '기록 확인' }}
      </button>
    </div>
  </details>
</template>

<script setup>
/* global defineProps */
import { ref } from 'vue';
import { fetchManualRecordsSummary, deleteManualRecords } from '@/api/manualPortfolioCleanupApi';
import { apiErrorMessage } from '@/utils/apiError';
const props = defineProps({ ownerKey: { type: String, default: '' } });
const hiddenKey = props.ownerKey ? `manual-cleanup-complete:${props.ownerKey}` : '';
function wasHidden() { try { return !!hiddenKey && sessionStorage.getItem(hiddenKey) === 'true'; } catch { return false; } }
const hidden = ref(wasHidden());
function hideCompleted() {
  if (loading.value || deleting.value || !summary.value || summary.value.total !== 0) return;
  hidden.value = true;
  try { if (hiddenKey) sessionStorage.setItem(hiddenKey, 'true'); } catch { /* Hiding still works for this view. */ }
}

const categories = [
  { key: 'stock', label: '기존 장기 기록' },
  { key: 'general', label: '기존 단기 기록' },
  { key: 'isa', label: '기존 ISA 기록' },
  { key: 'irp', label: '기존 IRP 기록' },
  { key: 'accountHoldings', label: '추가 계좌의 보유 기록' },
  { key: 'accounts', label: '수기 계좌 정보' },
];
const summary = ref(null), loading = ref(false), deleting = ref(false);
const confirmed = ref(false), error = ref(''), success = ref('');
function validCounts(data) {
  return data && [...categories.map(item => item.key), 'total'].every(key => Number.isSafeInteger(data[key]) && data[key] >= 0)
    && categories.reduce((total, item) => total + data[item.key], 0) === data.total;
}
async function load() {
  if (loading.value || deleting.value) return;
  loading.value = true; confirmed.value = false; error.value = ''; summary.value = null;
  try {
    const { data } = await fetchManualRecordsSummary();
    if (!validCounts(data)) throw new Error('Invalid summary');
    summary.value = data;
  } catch (failure) { error.value = apiErrorMessage(failure, '수기 기록을 확인하지 못했습니다. 다시 확인해 주세요.'); }
  finally { loading.value = false; }
}
function onToggle(event) { if (event.target.open && !summary.value) load(); }
async function remove() {
  if (!confirmed.value || !summary.value || summary.value.total === 0 || deleting.value || loading.value) return;
  deleting.value = true; error.value = ''; success.value = '';
  try {
    const { data } = await deleteManualRecords();
    if (!validCounts(data)) throw new Error('Invalid deletion result');
    success.value = `수기 기록 ${data.total}개를 삭제했습니다. 키움 자동매매 기록은 유지됩니다.`;
    summary.value = null;
  } catch (failure) {
    error.value = apiErrorMessage(failure, '삭제 결과를 확인하지 못했습니다. 다시 확인으로 남은 기록을 확인해 주세요.');
    summary.value = null;
  } finally { confirmed.value = false; deleting.value = false; }
  if (success.value) await load();
}
</script>

<style scoped>
.manual-cleanup { margin-top: 32px; border-top: 1px solid var(--card-border); padding-top: 16px; color: var(--text-secondary); }
summary { cursor: pointer; min-height: 44px; padding: 12px 0; }
.cleanup-body { max-width: 720px; padding: 12px 0; }
p { font-size: 13px; line-height: 1.7; }
dl { display: grid; gap: 8px; font-size: 13px; }
dl > div { display: flex; justify-content: space-between; gap: 16px; }
dd { margin: 0; color: var(--text-primary); }
.confirmation { display: flex; align-items: flex-start; gap: 10px; padding: 12px 0; font-size: 13px; line-height: 1.7; }
.confirmation input { margin-top: 5px; flex-shrink: 0; }
button { min-height: 44px; border: 1px solid var(--card-border); border-radius: var(--radius-control); background: var(--card-bg); color: var(--text-primary); padding: 10px 16px; margin: 4px 8px 4px 0; }
.delete-button, [role=alert] { color: var(--danger-color); }
button:disabled { opacity: .5; cursor: not-allowed; }
@media (max-width: 480px) { button { width: 100%; margin-right: 0; } }
</style>
