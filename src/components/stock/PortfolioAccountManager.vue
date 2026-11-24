<template>
  <Modal
    v-if="show"
    :close-disabled="saving"
    :close-on-backdrop="!saving"
    :close-on-esc="!saving"
    @close="close"
  >
    <template #header>
      <h3>수기 계좌 관리</h3>
    </template>
    <template #body>
      <p>증권사와 계좌 별칭을 직접 구분합니다. 증권사를 선택해도 계좌가 자동 연결되지는 않습니다. 계좌번호·비밀번호는 입력하지 마세요.</p>
      <form
        id="manual-account-form"
        @submit.prevent="save"
      >
        <fieldset :disabled="saving">
          <label>관리할 계좌<select
            v-model="selectedId"
            @change="selectAccount"
          ><option value="">새 수기 계좌 만들기</option><option
            v-for="account in accounts"
            :key="account.id"
            :value="account.id"
          >{{ account.name }}</option></select></label>
          <label>증권사<select v-model="draft.broker"><option value="UNASSIGNED">미지정</option><option value="SAMSUNG">삼성증권</option><option value="SHINHAN">신한투자증권</option><option value="KIWOOM">키움증권 (수기 기록)</option><option value="OTHER">기타</option></select></label>
          <label>계좌 별칭<input
            v-model="draft.name"
            maxlength="80"
            required
            placeholder="예: 삼성 국내·미국 투자"
          ></label>
          <label>운용 목적<select v-model="draft.purpose"><option value="LONG_TERM">장기</option><option value="SHORT_TERM">단기</option><option value="ISA">ISA</option><option value="IRP">IRP</option><option value="OTHER">기타</option></select></label>
          <p v-if="selectedId">
            이름·증권사·목적만 수정합니다. 기존 보유 종목을 이동하거나 삭제하지 않습니다.
          </p>
        </fieldset>
      </form>
      <p
        v-if="error"
        role="alert"
      >
        {{ error }}
      </p>
    </template>
    <template #footer>
      <button
        class="secondary-action"
        :disabled="saving"
        @click="close"
      >
        취소
      </button><button
        form="manual-account-form"
        type="submit"
        :disabled="saving || !draft.name.trim()"
      >
        {{ saving ? '저장 중…' : '계좌 저장' }}
      </button>
    </template>
  </Modal>
</template>
<script setup>
/* global defineProps, defineEmits */
import { ref, watch } from 'vue';
import Modal from '@/components/Modal.vue';
import { createPortfolioAccount, updatePortfolioAccount } from '@/api/portfolioAccountsApi';
import { apiErrorMessage } from '@/utils/apiError';
const props = defineProps({ show: Boolean, accounts: { type: Array, default: () => [] } });
const emit = defineEmits(['close', 'saved']);
const saving = ref(false), error = ref(''), selectedId = ref('');
const blank = () => ({ broker: 'UNASSIGNED', name: '', purpose: 'OTHER' });
const draft = ref(blank());
watch(() => props.show, show => { if (show) { selectedId.value = ''; draft.value = blank(); error.value = ''; } });
function selectAccount() { const account = props.accounts.find(item => item.id === selectedId.value); draft.value = account ? { broker: account.broker, name: account.name, purpose: account.purpose } : blank(); }
function close() { if (!saving.value) emit('close'); }
async function save() {
  if (saving.value || !draft.value.name.trim()) return;
  saving.value = true; error.value = '';
  try {
    const payload = { ...draft.value, name: draft.value.name.trim() };
    const response = selectedId.value ? await updatePortfolioAccount(selectedId.value, payload) : await createPortfolioAccount(payload);
    emit('saved', response.data); emit('close');
  } catch (failure) { error.value = apiErrorMessage(failure, '계좌를 저장하지 못했습니다.'); }
  finally { saving.value = false; }
}
</script>
<style scoped>
p { line-height: 1.7; color: var(--text-secondary); font-size: 13px; }
fieldset { border: 0; padding: 0; min-width: 0; display: grid; gap: 16px; }
label { display: grid; gap: 8px; color: var(--text-primary); }
input, select { width: 100%; min-height: 44px; background: var(--input-bg); border: 1px solid var(--input-border); color: var(--input-text); border-radius: var(--radius-control); padding: 10px; }
button { min-height: 44px; padding: 10px 16px; margin: 4px; background: var(--accent); color: var(--text-on-accent); border-radius: var(--radius-control); }
button:disabled { opacity: .5; }
button.secondary-action { background: var(--card-bg); color: var(--text-primary); border: 1px solid var(--card-border); }
[role=alert] { color: var(--danger-color); }
</style>
