<template>
  <section
    class="deployment-panel"
    aria-labelledby="deployment-title"
  >
    <header>
      <div>
        <span class="eyebrow">연구 결과 → 실계좌 전략 승인</span>
        <h3 id="deployment-title">
          연구 전략 연결
        </h3>
      </div>
      <button
        type="button"
        :disabled="loading || busy"
        @click="refresh"
      >
        연결 상태 확인
      </button>
    </header>
    <p>연구실에서 내보낸 서명된 보고서를 확인하고 이 계좌에 사용할 전략 버전을 승인합니다. <strong>승인만으로 자동매매를 켜거나 주문하지 않습니다.</strong></p>
    <p class="safety-note">
      주문 가능 현금 내 매수 · 기존 보유 미국주식 전체 매도 관리 · 계좌 고점 대비 10% 손실 차단을 유지합니다. 교체해도 잔고·고점·손실 차단 이력을 초기화하지 않습니다. 가격 급변 시 손실이 10%를 넘을 수 있습니다.
    </p>
    <p class="safety-note">
      현재 연구 전략의 대상은 SPY·QQQ·GLD·IEF입니다. 이 밖의 기존 보유 종목은 승인 후 자동매매를 별도로 시작했을 때 다음 실행의 매도 계획에 포함됩니다. 승인 즉시 매도하는 것은 아닙니다.
    </p>
    <p
      v-if="loading && !state"
      role="status"
    >
      연결 상태를 확인하고 있습니다…
    </p>
    <p
      v-if="error"
      class="message error"
      role="alert"
    >
      {{ error }} <span v-if="state">마지막 확인 값이며, 다시 확인하기 전에는 변경할 수 없습니다.</span>
    </p>
    <p
      v-if="notice"
      class="message"
      role="status"
    >
      {{ notice }}
    </p>
    <template v-if="state">
      <p
        v-if="!state.bridgeEnabled"
        class="message disabled-note"
        role="status"
      >
        실계좌 전략 연결 비활성 · 보고서 등록과 승인, 철회가 잠겨 있습니다. 이 화면에서 운영 연결을 켜지 않습니다.
      </p>
      <dl class="state-grid">
        <div><dt>대상 계좌 식별값</dt><dd>{{ state.accountScope || '확인되지 않음' }}</dd></div>
        <div><dt>승인된 전략</dt><dd>{{ state.active?.candidateId || '승인된 전략 없음' }}</dd></div>
        <div><dt>실행기 관리 상태</dt><dd>{{ state.managed ? state.active ? '연구 전략 관리 중' : '연구 전략 중지 · 기존 전략 자동 복귀 없음' : '연구 전략 관리 전' }}</dd></div>
      </dl>
      <p
        v-if="state.active"
        class="reference"
      >
        승인 보고서 {{ state.active.reportId }} · 버전 {{ state.active.version }} · 승인 시각 {{ stamp(state.active.approvedAt) }}
      </p>
      <p
        v-if="state.lastExecution"
        class="reference"
      >
        최근 실행 상태: {{ state.lastExecution }}
      </p>
      <ul
        v-if="state.blockers?.length"
        class="blockers"
      >
        <li
          v-for="reason in state.blockers"
          :key="reason"
        >
          {{ reason }}
        </li>
      </ul>

      <div class="import-block">
        <label for="deployment-report">서명된 연구 보고서 파일</label>
        <p>로컬 연구실에서 내보낸 JSON 파일을 선택하세요. 서버에서 서명·전략 버전·검증 근거를 다시 확인합니다.</p>
        <input
          id="deployment-report"
          ref="fileInput"
          type="file"
          accept="application/json,.json"
          :disabled="!canChange || loading"
          @change="selectReport"
        >
        <p
          v-if="fileName"
          class="reference"
        >
          선택한 파일: {{ fileName }}
        </p>
        <button
          type="button"
          :disabled="!canChange || loading || !envelope"
          @click="importReport"
        >
          보고서 검증·등록
        </button>
      </div>

      <article
        v-if="state.candidate"
        class="candidate"
        aria-labelledby="deployment-candidate-title"
      >
        <header>
          <h4 id="deployment-candidate-title">
            {{ state.candidate.name || state.candidate.candidateId }}
          </h4><span class="badge">{{ state.candidate.eligible ? '검토 가능한 후보' : '승인 조건 미충족' }}</span>
        </header>
        <dl class="state-grid">
          <div><dt>과거 연환산 수익</dt><dd>{{ percent(state.candidate.historicalAnnualizedPct) }}</dd></div>
          <div><dt>등록 이후 누적 수익</dt><dd>{{ state.candidate.forwardDays > 0 ? percent(state.candidate.forwardReturnPct) : '관찰 대기' }}</dd></div>
          <div><dt>관찰 거래일 / 체결 수</dt><dd>{{ state.candidate.forwardDays ?? 0 }}일 / {{ state.candidate.forwardFillCount ?? 0 }}건</dd></div>
        </dl>
        <p class="reference">
          보고서 {{ state.candidate.reportId }} · 전략 버전 {{ state.candidate.version }}
        </p>
        <ul
          v-if="state.candidate.reasons?.length"
          class="blockers"
        >
          <li
            v-for="reason in state.candidate.reasons"
            :key="reason"
          >
            {{ reason }}
          </li>
        </ul>
        <p>과거 연환산 수익과 등록 이후 누적 수익은 기간이 다른 지표입니다. 과거·가상 수익은 실제 계좌의 수익을 보장하지 않습니다.</p>
        <label class="confirm-label"><input
          v-model="confirmed"
          type="checkbox"
          :disabled="!canApprove"
        ><span>대상 계좌 {{ state.accountScope }}와 보고서·전략 버전을 확인했습니다. 기존 보유 종목의 매도 관리와 10% 손실 차단을 유지하는 실계좌용 전략 변경을 승인합니다.</span></label>
        <button
          type="button"
          class="primary"
          :disabled="!canApprove || !confirmed"
          @click="approve"
        >
          이 버전을 실계좌용 전략으로 승인
        </button>
        <p class="muted">
          승인 후에도 자동매매 시작은 별도입니다. 실제 주문은 기존 주문 허용·계좌 위험·자동매매 실행 조건을 모두 통과해야 합니다.
        </p>
      </article>
      <p
        v-else
        class="empty"
      >
        등록된 연구 후보가 없습니다. 서명된 보고서를 먼저 검증·등록하세요.
      </p>

      <div
        v-if="state.active || state.managed"
        class="revoke-block"
      >
        <label class="confirm-label"><input
          v-model="revokeConfirmed"
          type="checkbox"
          :disabled="!canChange || loading"
        ><span>연구 전략 승인을 철회합니다. 기존 보유와 손실 차단 기록은 유지하며, 다른 전략으로 자동 전환하지 않습니다.</span></label>
        <button
          type="button"
          :disabled="!canChange || loading || !revokeConfirmed"
          @click="revoke"
        >
          연구 전략 승인 철회
        </button>
      </div>
    </template>
  </section>
</template>

<script setup>
/* global defineEmits */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { usStrategyDeploymentApi as api } from '@/api/usStrategyDeploymentApi'
import { apiErrorMessage } from '@/utils/apiError'

const emit = defineEmits(['status'])
const state = ref(null), loading = ref(false), busy = ref(false), error = ref(''), notice = ref('')
const confirmed = ref(false), revokeConfirmed = ref(false), envelope = ref(null), fileName = ref(''), fileInput = ref(null)
let stopped = false, reader = null, readSequence = 0, fileSequence = 0
const canChange = computed(() => state.value?.bridgeEnabled === true && !!state.value.accountScope && !error.value && !busy.value)
const canApprove = computed(() => canChange.value && !loading.value && state.value?.candidate?.eligible === true && !state.value.blockers?.length)
const stamp = value => value ? new Date(value).toLocaleString('ko-KR') : '—'
const percent = value => typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(2)}%` : '—'
const identity = data => JSON.stringify([data?.revision, data?.accountScope, data?.candidate?.id, data?.candidate?.reportId, data?.candidate?.version, data?.active?.version])
function accept(data) {
  if (!data || typeof data.bridgeEnabled !== 'boolean' || !Number.isSafeInteger(data.revision) || !Array.isArray(data.blockers)) throw new Error('전략 연결 서버의 응답을 확인할 수 없습니다.')
  if (identity(data) !== identity(state.value)) { confirmed.value = false; revokeConfirmed.value = false }
  state.value = data
  emit('status', { ...data, fresh: true })
}
function failure(cause, fallback) {
  return cause?.response ? apiErrorMessage(cause, fallback) : cause?.message || fallback
}
async function refresh() {
  if (loading.value || busy.value || stopped) return
  loading.value = true; reader = new AbortController()
  const sequence = ++readSequence
  try {
    const response = await api.status(reader.signal)
    if (!stopped && sequence === readSequence) { accept(response.data); error.value = '' }
  } catch (cause) {
    if (!stopped && sequence === readSequence && cause?.code !== 'ERR_CANCELED') { error.value = failure(cause, '연결 상태를 확인하지 못했습니다.'); confirmed.value = false; revokeConfirmed.value = false; emit('status', { ...state.value, fresh: false }) }
  } finally { if (sequence === readSequence) { loading.value = false; reader = null } }
}
async function selectReport(event) {
  const sequence = ++fileSequence
  envelope.value = null; fileName.value = ''; notice.value = ''
  if (!canChange.value) return
  const file = event.target.files?.[0]
  if (!file) return
  try {
    if (file.size > 1024 * 1024) throw new Error('보고서 파일은 1MB 이하여야 합니다.')
    const value = JSON.parse(await file.text())
    if (stopped || sequence !== fileSequence) return
    if (!value || typeof value.payloadJson !== 'string' || !value.payloadJson || typeof value.signature !== 'string' || !value.signature || Object.keys(value).some(key => !['payloadJson', 'signature'].includes(key))) throw new Error('서명된 연구 보고서 형식을 확인하세요.')
    envelope.value = { payloadJson: value.payloadJson, signature: value.signature }; fileName.value = file.name
  } catch (cause) { if (!stopped && sequence === fileSequence) notice.value = cause.message || '보고서 파일을 읽지 못했습니다.' }
}
async function mutate(operation, success) {
  if (!canChange.value || loading.value) return
  busy.value = true; notice.value = ''
  try {
    await operation()
    if (stopped) return
    const response = await api.status()
    if (!stopped) { accept(response.data); error.value = ''; notice.value = success }
  } catch (cause) {
    if (!stopped) { error.value = failure(cause, '전략 변경을 처리하지 못했습니다. 상태를 다시 확인하세요.'); confirmed.value = false; revokeConfirmed.value = false; emit('status', { ...state.value, fresh: false }) }
  } finally { busy.value = false }
}
async function importReport() {
  if (!envelope.value) return
  const selected = { ...envelope.value }
  await mutate(async () => { await api.importReport(selected); envelope.value = null; fileName.value = ''; if (fileInput.value) fileInput.value.value = '' }, '보고서를 검증·등록했습니다. 내용을 확인한 뒤 별도로 승인하세요. 자동매매를 시작하지 않았습니다.')
}
async function verifyCurrent(expected) {
  const response = await api.status()
  if (stopped) throw new Error('화면이 닫혀 전략 변경을 중단했습니다.')
  accept(response.data)
  if (identity(state.value) !== expected || !state.value.bridgeEnabled || !state.value.accountScope) throw new Error('계좌 또는 보고서 상태가 바뀌었습니다. 최신 정보를 확인하고 다시 동의하세요.')
}
async function approve() {
  if (!canApprove.value || !confirmed.value) return
  const expected = identity(state.value)
  const candidate = state.value.candidate
  const decision = { candidateId: candidate.id, expectedRevision: state.value.revision, reportId: candidate.reportId, version: candidate.version, confirmLive: true }
  await mutate(async () => {
    await verifyCurrent(expected)
    if (state.value.candidate?.eligible !== true || state.value.blockers.length) throw new Error('승인 조건이 변경되었습니다. 최신 정보를 다시 확인하세요.')
    await api.approve(decision); confirmed.value = false
  }, '이 전략 버전을 실계좌용으로 승인했습니다. 자동매매를 시작하거나 주문하지 않았습니다.')
}
async function revoke() {
  if (!revokeConfirmed.value || !(state.value?.active || state.value?.managed)) return
  const expected = identity(state.value), revision = state.value.revision
  await mutate(async () => { await verifyCurrent(expected); await api.revoke(revision); revokeConfirmed.value = false }, '연구 전략 승인을 철회했습니다. 다른 전략을 자동으로 시작하지 않았습니다. 기존 잔고와 위험 이력은 유지됩니다.')
}
onMounted(refresh)
onBeforeUnmount(() => { stopped = true; readSequence++; fileSequence++; reader?.abort() })
</script>

<style scoped>
.deployment-panel{padding:22px;border:1px solid var(--card-border-strong);background:var(--surface);border-radius:14px;margin:20px 0;color:var(--text-primary);line-height:1.65}.deployment-panel header{display:flex;justify-content:space-between;align-items:center;gap:16px}.deployment-panel h3{font-size:20px;font-weight:700;margin:3px 0}.deployment-panel h4{font-size:18px;font-weight:700}.deployment-panel p{font-size:14px;margin:10px 0}.eyebrow,.badge{color:var(--accent-light);font-size:12px}.state-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:20px 0}.state-grid dt{color:var(--text-secondary);font-size:12px}.state-grid dd{margin:4px 0;font-weight:700;overflow-wrap:anywhere}.deployment-panel button{min-height:44px;padding:10px 15px;border:1px solid var(--card-border-strong);background:var(--surface-2);color:var(--text-primary);border-radius:8px;cursor:pointer;font-size:14px}.deployment-panel button.primary{background:var(--accent);color:var(--text-on-accent);font-weight:700}.deployment-panel button:disabled,.deployment-panel input:disabled{opacity:.45;cursor:not-allowed}.deployment-panel button:focus-visible,.deployment-panel input:focus-visible{outline:2px solid var(--accent-light);outline-offset:3px}.safety-note,.message{padding:14px 16px;background:var(--accent-dim);border-radius:8px}.error{color:#ffb2ae;background:rgba(224,95,95,.12)}.reference,.muted,.import-block p,.candidate>p,.blockers{color:var(--text-secondary);font-size:13px!important;overflow-wrap:anywhere}.import-block,.candidate,.revoke-block{margin-top:22px;padding-top:20px;border-top:1px solid var(--card-border)}.import-block>label{display:block;font-weight:700}.import-block input{display:block;max-width:100%;margin:12px 0;color:var(--text-secondary)}.import-block input::file-selector-button{padding:10px;background:var(--surface-2);color:var(--text-primary);border:1px solid var(--card-border-strong);border-radius:6px;margin-right:10px}.blockers{padding-left:20px}.confirm-label{display:flex;align-items:flex-start;gap:12px;margin:18px 0;font-size:14px}.confirm-label input{width:18px;height:18px;flex-shrink:0;margin-top:5px;accent-color:var(--accent)}.empty{padding:20px;border:1px dashed var(--card-border-strong);border-radius:8px}.badge{padding:5px 10px;border:1px solid var(--card-border-strong);border-radius:20px;white-space:nowrap}@media(max-width:680px){.deployment-panel{padding:17px}.deployment-panel header{align-items:flex-start;flex-direction:column}.state-grid{grid-template-columns:1fr}.deployment-panel button{width:100%}.candidate header{gap:8px}}
</style>
