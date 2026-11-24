<template>
  <section
    class="strategy-lab"
    aria-labelledby="lab-title"
  >
    <header class="lab-heading">
      <div>
        <span class="eyebrow">LOCAL RESEARCH · PAPER ONLY</span>
        <h1 id="lab-title">
          전략 연구실
        </h1>
        <p>연구와 가상 매매는 자동으로, 전략 교체는 비교 결과를 확인한 뒤에.</p>
      </div>
      <span class="mode-badge">실계좌 주문 없음</span>
    </header>

    <div class="scope-notice">
      <strong>연구·가상매매 전용입니다. 실제 운용 전략은 변경하지 않습니다.</strong>
      <p>결제된 현금 안에서 매수 · 고점 대비 10% 하락 시 매수 차단 · 전략을 바꿔도 잔고와 고점, 차단 이력 유지</p>
      <p>거래 비용 차감 후 연 10%는 목표이며 보장 수익이 아닙니다. 가격 갭으로 실제 손실은 차단 기준을 넘을 수 있습니다.</p>
    </div>

    <div
      v-if="error"
      class="notice danger"
      role="alert"
    >
      <strong>{{ error }}</strong>
      <p v-if="state">
        아래는 마지막 확인 값입니다. 연결을 다시 확인하기 전에는 변경할 수 없습니다.
      </p>
      <button
        type="button"
        :disabled="busy || loading"
        @click="refresh"
      >
        연결 다시 확인
      </button>
    </div>
    <p
      v-if="notice"
      class="notice"
      role="status"
    >
      {{ notice }}
    </p>
    <p
      v-if="loading && !state"
      class="empty"
      role="status"
    >
      연구실 상태를 확인하고 있습니다…
    </p>

    <template v-if="state">
      <div class="control-card">
        <div>
          <h2>연구 자동 실행</h2>
          <p class="control-status">
            {{ state.running ? '연구·가상 원장 갱신 중' : state.scheduler?.enabled ? '자동 실행 켜짐' : '자동 실행 꺼짐' }}
          </p>
          <p>로컬 서버가 실행 중일 때 동작합니다. 브라우저를 닫아도 서버는 계속 실행됩니다.</p>
          <p v-if="state.scheduler?.nextRunAt">
            다음 실행 {{ stamp(state.scheduler.nextRunAt) }}
          </p>
          <p
            v-if="state.scheduler?.error"
            class="error-text"
          >
            마지막 자동 실행 오류: {{ state.scheduler.error }}
          </p>
        </div>
        <div class="controls">
          <button
            type="button"
            class="primary"
            :disabled="!canChange || state.running"
            @click="runCycle"
          >
            {{ state.running ? '연구 진행 중…' : '지금 연구 실행' }}
          </button>
          <button
            type="button"
            :disabled="!canChange"
            @click="toggleScheduler"
          >
            {{ state.scheduler?.enabled ? '자동 실행 끄기' : '자동 실행 켜기' }}
          </button>
          <button
            type="button"
            :disabled="busy || loading"
            @click="refresh"
          >
            상태 새로고침
          </button>
        </div>
      </div>

      <p
        v-if="state.pendingSwitch"
        class="notice"
        role="status"
      >
        {{ state.pendingSwitch.name }} 교체 적용 대기 · 다음 완료 일봉 판단부터 적용합니다. 그동안 기존 잔고와 위험 이력은 유지됩니다.
      </p>
      <p
        v-if="state.fixture === true"
        class="notice"
        role="status"
      >
        보관자료 기능 검증 모드 · 최신 자료 자동 수집 없음
      </p>
      <div class="source-strip">
        <span>자료 기준 <strong>{{ state.market?.lastDate || state.lastMarketDate || '아직 없음' }}</strong></span>
        <span>관찰 등록 (UTC) <strong>{{ state.registeredDate || '아직 없음' }}</strong></span>
        <span
          v-if="state.market?.stale"
          class="error-text"
        >자료가 오래되었거나 갱신 대기 중 · 교체 불가</span>
        <span v-else>과거 검증과 등록 이후 관찰을 별도로 비교합니다.</span>
      </div>

      <section
        class="account-section"
        aria-labelledby="account-title"
      >
        <div class="section-heading">
          <div>
            <span class="eyebrow">현재 가상 운용</span>
            <h2 id="account-title">
              {{ state.activeStrategy?.name || '아직 선택한 전략 없음' }}
            </h2>
            <p>연구 대조군이며 운영 전략이나 수익성이 검증된 전략을 뜻하지 않습니다.</p>
          </div>
          <span
            v-if="account.hardLatched"
            class="lock-badge"
          >10% 손실 차단 · 교체/매수 불가</span>
        </div>
        <div class="metrics-grid">
          <div><span>가상 평가액</span><strong>{{ money(account.equityUsd) }}</strong></div>
          <div><span>결제된 현금</span><strong>{{ money(account.cashUsd) }}</strong></div>
          <div><span>계좌 고점</span><strong>{{ money(account.peakUsd) }}</strong></div>
          <div><span>고점 대비 하락</span><strong :class="{ 'error-text': account.hardLatched }">{{ percent(account.drawdownPct) }}</strong></div>
        </div>
        <p
          v-if="account.hardLatched"
          class="notice danger"
        >
          차단 후 자동 재개나 고점 초기화는 하지 않습니다. 전략 교체로 손실 차단을 우회할 수 없습니다.
        </p>
        <p class="account-extra">
          미결제 매도 대금 {{ money(account.unsettledUsd) }} · 배당 채권 {{ money(account.dividendReceivableUsd) }}
        </p>
        <ul
          v-if="account.holdings?.length"
          class="holdings"
          aria-label="가상 보유 종목"
        >
          <li
            v-for="item in account.holdings"
            :key="item.symbol"
          >
            <strong>{{ item.symbol }}</strong> {{ item.quantity }}주
          </li>
        </ul>
        <p
          v-else
          class="muted"
        >
          가상 보유 종목 없음
        </p>
      </section>

      <section
        aria-labelledby="compare-title"
        class="comparison-section"
      >
        <div class="section-heading">
          <div>
            <span class="eyebrow">비교 보고서</span><h2 id="compare-title">
              다음 전략을 확인하세요
            </h2>
          </div>
          <span v-if="state.report">생성 {{ stamp(state.report.createdAt) }}</span>
        </div>
        <p class="muted">
          등록 이후의 새 자료에서 관찰 기간과 거래 수를 쌓고, 비용·낙폭·현재 전략 대비 개선을 모두 확인합니다. 과거 수익만으로 교체하지 않습니다.
        </p>
        <p class="muted">
          과거 연환산 수익은 2008년 이후 연속 구간에 편도 비용 25bp를 반영한 값입니다. 등록 이후 가상 수익은 별도의 관찰 성과이며, 연환산 수익과 직접 비교하지 않습니다.
        </p>
        <div
          v-if="!state.report"
          class="empty"
        >
          <h3>아직 비교 보고서가 없습니다</h3>
          <p>연구를 실행하면 정해진 후보를 같은 조건으로 검증합니다. 첫 실행의 과거 성과를 등록 이후 실적으로 계산하지 않습니다.</p>
        </div>
        <div
          v-else
          class="candidate-grid"
        >
          <article
            v-for="candidate in candidates"
            :key="candidate.id"
            class="candidate-card"
            :class="{ active: candidate.id === state.activeStrategy?.id }"
          >
            <div class="candidate-heading">
              <h3>{{ candidate.name }}</h3>
              <span
                v-if="candidate.id === state.activeStrategy?.id"
                class="tag"
              >현재 가상 전략</span>
              <span
                v-else
                :class="['tag', { ready: candidate.eligible }]"
              >{{ candidate.eligible ? '검토 가능' : '교체 기준 미충족' }}</span>
            </div>
            <dl class="candidate-metrics">
              <div><dt>과거 연환산 수익</dt><dd>{{ percent(candidate.historical?.annualizedPct) }}</dd></div>
              <div><dt>등록 이후 누적 수익</dt><dd>{{ forwardPercent(candidate.forward?.returnPct, candidate.forward?.days) }}</dd></div>
              <div><dt>등록 이후 최대 낙폭</dt><dd>{{ forwardPercent(candidate.forward?.maxDrawdownPct, candidate.forward?.days) }}</dd></div>
              <div><dt>관찰 거래일 / 체결 수</dt><dd>{{ candidate.forward?.days ?? 0 }}일 / {{ candidate.forward?.fillCount ?? 0 }}건</dd></div>
            </dl>
            <ul
              v-if="candidate.reasons?.length"
              class="reasons"
            >
              <li
                v-for="reason in candidate.reasons"
                :key="reason"
              >
                {{ reasonText(reason) }}
              </li>
            </ul>
            <p
              v-else
              class="muted"
            >
              {{ candidate.eligible ? '보고서를 확인한 뒤 직접 승인할 수 있습니다.' : '서버의 비교 판정을 기다립니다.' }}
            </p>
            <button
              type="button"
              :disabled="!canChange || state.running"
              :data-candidate="candidate.id"
              @click="review(candidate)"
            >
              비교 상세 확인
            </button>
          </article>
        </div>
      </section>

      <section
        v-if="selection"
        ref="reviewPanel"
        class="review-card"
        aria-labelledby="review-title"
        tabindex="-1"
      >
        <div class="section-heading">
          <div>
            <span class="eyebrow">사용자 확인</span><h2 id="review-title">
              {{ selectedCandidate?.name }}
            </h2>
          </div>
          <button
            type="button"
            :disabled="busy"
            @click="cancelReview"
          >
            닫기
          </button>
        </div>
        <p>이 보고서와 전략 버전에 대해서만 승인합니다. 승인하면 다음 가상 판단부터 교체하며 실제 계좌에는 반영하지 않습니다.</p>
        <details>
          <summary>과거 검증 구간 상세</summary>
          <div
            v-if="selectedCandidate?.historical?.periods?.length"
            class="period-list"
          >
            <div
              v-for="(period, index) in selectedCandidate.historical.periods"
              :key="index"
              class="period-item"
            >
              <strong>{{ period.period || period.name || `${index + 1}번 구간` }}</strong>
              <span>{{ periodSummary(period) }}</span>
            </div>
          </div>
          <p v-else>
            표시할 구간 상세가 없습니다.
          </p>
        </details>
        <p class="report-reference">
          보고서 {{ selection.reportId }} · 전략 버전 {{ selectedCandidate?.version }}
        </p>
        <p
          v-if="!canApprove"
          class="notice"
        >
          {{ approvalBlockReason }}
        </p>
        <label class="confirm-label">
          <input
            v-model="confirmed"
            type="checkbox"
            :disabled="!canApprove || busy"
          >
          <span>비교 결과를 확인했으며, 기존 잔고·보유·고점·손실 차단 이력을 유지하는 가상 전략 교체에 동의합니다.</span>
        </label>
        <div class="controls">
          <button
            type="button"
            class="primary"
            :disabled="!canApprove || !confirmed || busy"
            @click="decide('approve')"
          >
            가상 운용 전략 교체
          </button>
          <button
            type="button"
            :disabled="!canChange || state.running || busy"
            @click="decide('reject')"
          >
            이 후보 보류
          </button>
          <button
            type="button"
            :disabled="!canApprove || state.deploymentExportEnabled !== true"
            @click="exportReport"
          >
            실계좌 검토용 보고서 내보내기
          </button>
        </div>
        <p class="muted">
          {{ state.deploymentExportReason || '파일 내보내기는 실계좌 승인이나 주문이 아닙니다. 미국 자동매매 화면에서 파일을 등록하고 별도로 승인해야 합니다.' }}
        </p>
      </section>

      <section
        class="audit-section"
        aria-labelledby="audit-title"
      >
        <h2 id="audit-title">
          연구·교체 기록
        </h2>
        <p
          v-if="!state.audit?.length"
          class="muted"
        >
          아직 기록이 없습니다.
        </p>
        <ol v-else>
          <li
            v-for="(event, index) in [...state.audit].reverse().slice(0, 20)"
            :key="index"
          >
            <time>{{ stamp(event.at) }}</time><strong>{{ eventLabel(event.event) }}</strong><span>{{ detailText(event.detail) }}</span>
          </li>
        </ol>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { usStrategyLabApi as api } from '@/api/usStrategyLabApi'

const state = ref(null)
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const notice = ref('')
const selection = ref(null)
const confirmed = ref(false)
const reviewPanel = ref(null)
let reader = null
let sequence = 0
let timer = null
let stopped = false
let reviewButton = null

const account = computed(() => state.value?.paperAccount || {})
const candidates = computed(() => state.value?.candidates || [])
const canChange = computed(() => state.value?.paperOnly === true && !error.value && !busy.value)
const selectedCandidate = computed(() => candidates.value.find(c => c.id === selection.value?.candidateId))
const currentSelection = () => selection.value && state.value?.report?.id === selection.value.reportId && state.value?.revision === selection.value.expectedRevision
const canApprove = computed(() => canChange.value && !loading.value && !state.value?.running && !state.value?.market?.stale &&
  !account.value.hardLatched && !state.value?.pendingSwitch && currentSelection() && selectedCandidate.value?.eligible === true &&
  selectedCandidate.value.id !== state.value.activeStrategy?.id)
const approvalBlockReason = computed(() => {
  if (state.value?.pendingSwitch) return '이미 승인된 교체를 다음 완료 일봉에서 적용할 예정입니다.'
  if (account.value.hardLatched) return '계좌 손실 차단 상태에서는 교체할 수 없습니다.'
  if (error.value) return '연결 상태를 다시 확인해야 합니다.'
  if (state.value?.market?.stale) return '자료가 오래되어 교체할 수 없습니다.'
  if (state.value?.running) return '연구가 끝난 뒤 새 보고서를 확인하세요.'
  if (selectedCandidate.value?.id === state.value?.activeStrategy?.id) return '이미 가상 운용 중인 전략입니다.'
  return '관찰 기간·거래 수·수익·위험 기준을 모두 충족한 후보만 교체할 수 있습니다.'
})
const money = value => typeof value === 'number' && Number.isFinite(value) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value) : '—'
const percent = value => typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(2)}%` : '—'
const forwardPercent = (value, days) => days > 0 ? percent(value) : '관찰 대기'
const stamp = value => {
  if (!value) return '아직 없음'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('ko-KR')
}
const detailText = value => value == null ? '' : typeof value === 'string' ? value : JSON.stringify(value)
const reasonText = reason => ({ CURRENT_STRATEGY: '현재 가상 운용 전략입니다.', INSUFFICIENT_FORWARD_DAYS: '등록 이후 관찰 기간이 부족합니다.', INSUFFICIENT_FORWARD_FILLS: '등록 이후 체결 수가 부족합니다.', HISTORICAL_TARGET_FAILED: '과거 검증에서 연 10% 목표·위험 기준을 충족하지 못했습니다.', HARD_LATCHED: '계좌 손실 차단 상태입니다.' })[reason] || reason
const eventLabel = event => ({ REGISTER: '연구 등록', CYCLE: '연구 실행', APPROVE: '가상 전략 교체 승인', REJECT: '후보 보류', SWITCH: '가상 전략 교체', ERROR: '실행 오류' })[event] || event
const periodSummary = period => {
  const annual = period.annualizedPct ?? period.annualized_pct
  const dd = period.maxDrawdownPct ?? period.mdd_pct
  const cost = period.costBps ?? period.cost_bps
  return `연환산 ${percent(annual)} · 최대 낙폭 ${percent(dd)}${cost != null ? ` · 편도 비용 ${cost}bp` : ''}`
}
function accept(data) {
  if (!data || data.paperOnly !== true || !Number.isInteger(data.revision)) throw new Error('연구 전용 서버의 응답을 확인할 수 없습니다.')
  state.value = data
  if (selection.value && !currentSelection()) {
    selection.value = null; confirmed.value = false
    notice.value = '보고서 또는 운용 상태가 바뀌었습니다. 최신 비교 결과를 다시 확인하세요.'
  }
}
function errorMessage(cause) {
  if (cause?.response?.status === 409) return '보고서 또는 운용 상태가 바뀌었습니다. 상태를 새로고침한 뒤 다시 확인하세요.'
  return cause?.response?.data?.message || cause?.response?.data?.error || cause?.message || '연구 서버에 연결할 수 없습니다.'
}
async function refresh() {
  if (loading.value || busy.value || stopped) return
  loading.value = true
  const id = ++sequence
  reader = new AbortController()
  try {
    const response = await api.status(reader.signal)
    if (stopped || id !== sequence) return
    accept(response.data); error.value = ''
  } catch (cause) {
    if (!stopped && id === sequence && cause?.code !== 'ERR_CANCELED') error.value = errorMessage(cause)
  } finally {
    if (id === sequence) { loading.value = false; reader = null }
  }
}
function stopRead() { sequence++; reader?.abort(); reader = null; loading.value = false }
async function mutate(operation, success) {
  if (!canChange.value) return
  stopRead(); busy.value = true; notice.value = ''
  try {
    await operation()
    if (!stopped) {
      const response = await api.status()
      if (!stopped) { accept(response.data); error.value = ''; notice.value = success }
    }
  } catch (cause) {
    if (!stopped) { error.value = errorMessage(cause); selection.value = null; confirmed.value = false }
  } finally { busy.value = false }
}
const runCycle = () => mutate(() => api.cycle(), '연구 실행을 요청했습니다. 완료 결과는 자동으로 갱신됩니다.')
const toggleScheduler = () => {
  const enabled = !state.value.scheduler?.enabled
  return mutate(() => api.scheduler(enabled), enabled ? '로컬 서버의 자동 연구를 켰습니다.' : '자동 연구를 껐습니다. 기존 기록은 유지됩니다.')
}
async function review(candidate) {
  if (!canChange.value || !state.value.report) return
  reviewButton = [...document.querySelectorAll('[data-candidate]')].find(button => button.dataset.candidate === candidate.id)
  selection.value = { candidateId: candidate.id, reportId: state.value.report.id, expectedRevision: state.value.revision }
  confirmed.value = false; notice.value = ''
  await nextTick(); reviewPanel.value?.focus()
}
function cancelReview() { selection.value = null; confirmed.value = false; reviewButton?.focus() }
async function decide(kind) {
  if (!selection.value || !canChange.value || (kind === 'approve' && (!canApprove.value || !confirmed.value))) return
  const decision = { ...selection.value }
  await mutate(async () => {
    // Re-read immediately before approval; the server also checks this exact binding atomically.
    const response = await api.status()
    accept(response.data)
    if (!selection.value || !currentSelection() || response.data.running || (kind === 'approve' &&
      (response.data.pendingSwitch || response.data.market?.stale || response.data.paperAccount?.hardLatched || selectedCandidate.value?.eligible !== true))) {
      throw new Error('상태 또는 승인 조건이 바뀌었습니다. 최신 보고서를 다시 확인하세요.')
    }
    await api[kind](decision)
    selection.value = null; confirmed.value = false
  }, kind === 'approve' ? '가상 운용 전략 교체를 승인했습니다. 실제 계좌에는 반영하지 않았습니다.' : '이 보고서의 후보를 보류했습니다.')
}
async function exportReport() {
  if (!selection.value || !canApprove.value || state.value.deploymentExportEnabled !== true) return
  const decision = { ...selection.value }
  await mutate(async () => {
    const response = await api.status()
    accept(response.data)
    if (!selection.value || !currentSelection() || response.data.deploymentExportEnabled !== true || response.data.running || response.data.market?.stale || response.data.pendingSwitch || response.data.paperAccount?.hardLatched || selectedCandidate.value?.eligible !== true) throw new Error('보고서 또는 내보내기 조건이 바뀌었습니다. 최신 비교 결과를 확인하세요.')
    const exported = await api.exportReport(decision)
    if (typeof exported.data?.payloadJson !== 'string' || typeof exported.data?.signature !== 'string') throw new Error('서명된 보고서를 확인하지 못했습니다.')
    const url = URL.createObjectURL(new Blob([JSON.stringify(exported.data, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url; anchor.download = 'us-strategy-review.json'; document.body.appendChild(anchor)
    anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, '실계좌 검토용 보고서를 내보냈습니다. 실계좌용 승인이나 주문은 하지 않았습니다.')
}
onMounted(() => { refresh(); timer = setInterval(refresh, 10000) })
onBeforeUnmount(() => { stopped = true; clearInterval(timer); stopRead() })
</script>

<style scoped>
.strategy-lab{max-width:1260px;margin:auto;color:var(--text-primary);line-height:1.65}.strategy-lab h1{font-size:clamp(28px,4vw,40px);font-weight:750;margin:5px 0}.strategy-lab h2{font-size:21px;font-weight:700}.strategy-lab h3{font-size:17px;font-weight:700}.strategy-lab p{margin:6px 0}.eyebrow{color:var(--accent);font-size:12px;letter-spacing:.1em;font-weight:700}.lab-heading,.section-heading,.candidate-heading{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.lab-heading{margin-bottom:24px}.lab-heading p,.muted,.control-card p,.source-strip,.account-extra{color:var(--text-secondary);font-size:14px}.mode-badge,.tag,.lock-badge{display:inline-block;border:1px solid var(--card-border-strong);border-radius:30px;padding:5px 12px;font-size:12px;white-space:nowrap}.mode-badge,.tag.ready{background:var(--accent-dim);color:var(--accent-light)}.scope-notice{border-left:3px solid var(--accent);background:var(--surface);padding:18px 22px;border-radius:6px;margin-bottom:20px;font-size:14px}.scope-notice p{color:var(--text-secondary)}.control-card,.account-section,.review-card,.audit-section{background:var(--surface);border:1px solid var(--card-border);border-radius:var(--radius-card);padding:24px;margin:20px 0}.control-card{display:flex;justify-content:space-between;align-items:center;gap:20px}.control-status{color:var(--accent-light)!important;font-weight:700}.controls{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.strategy-lab button{border:1px solid var(--card-border-strong);border-radius:var(--radius-control);padding:10px 15px;background:var(--surface-2);color:var(--text-primary);font-size:14px;cursor:pointer;min-height:44px}.strategy-lab button.primary{background:var(--accent);color:var(--text-on-accent);font-weight:700;border-color:var(--accent)}.strategy-lab button:disabled{opacity:.45;cursor:not-allowed}.strategy-lab button:focus-visible,.strategy-lab input:focus-visible,.strategy-lab summary:focus-visible,.review-card:focus-visible{outline:2px solid var(--accent-light);outline-offset:4px}.source-strip{display:flex;flex-wrap:wrap;gap:10px 24px;padding:0 3px}.source-strip strong{color:var(--text-primary)}.section-heading{margin-bottom:18px}.section-heading>span{font-size:12px;color:var(--text-secondary)}.metrics-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.metrics-grid>div{border-left:1px solid var(--card-border-strong);padding-left:18px}.metrics-grid span{display:block;font-size:13px;color:var(--text-secondary)}.metrics-grid strong{font-size:24px;font-weight:700}.account-extra{margin-top:20px!important}.holdings{display:flex;gap:10px;flex-wrap:wrap;list-style:none;padding:0;margin-top:12px}.holdings li{background:var(--surface-2);padding:7px 12px;border-radius:6px;font-size:14px}.comparison-section{margin:32px 0}.candidate-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:20px}.candidate-card{padding:22px;border:1px solid var(--card-border);border-radius:var(--radius-card);background:var(--surface);display:flex;flex-direction:column}.candidate-card.active{border-color:var(--accent)}.candidate-heading{gap:12px}.candidate-heading h3{overflow-wrap:anywhere}.candidate-metrics{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:18px 0}.candidate-metrics dt{font-size:12px;color:var(--text-secondary)}.candidate-metrics dd{font-size:19px;font-weight:700;margin:3px 0}.candidate-card>button{align-self:flex-start;margin-top:auto}.reasons{color:var(--text-secondary);font-size:13px;padding-left:18px;margin:0 0 18px;overflow-wrap:anywhere}.notice{padding:14px 18px;background:var(--accent-dim);border-radius:var(--radius-control);margin:16px 0;color:var(--text-primary);font-size:14px}.danger{background:rgba(224,95,95,.12);border:1px solid rgba(224,95,95,.3)}.error-text,.lock-badge{color:#ffb2ae!important}.lock-badge{border-color:#aa5555}.empty{padding:35px 24px;border:1px dashed var(--card-border-strong);border-radius:var(--radius-card);text-align:center;margin:20px 0;color:var(--text-secondary)}.empty h3{color:var(--text-primary)}.review-card{border-color:var(--accent)}.confirm-label{display:flex;gap:12px;align-items:flex-start;padding:18px 0;font-size:14px}.confirm-label input{margin-top:5px;width:18px;height:18px;accent-color:var(--accent);flex-shrink:0}.report-reference{font-size:12px;color:var(--text-muted);overflow-wrap:anywhere}.period-list{display:grid;gap:8px;margin:12px 0}.period-item{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:13px;border-bottom:1px solid var(--card-border);padding-bottom:8px}.strategy-lab summary{cursor:pointer;padding:8px 0}.audit-section ol{list-style:none;padding:0;margin-top:16px}.audit-section li{display:grid;grid-template-columns:180px 160px 1fr;gap:12px;padding:12px 0;border-bottom:1px solid var(--card-border);font-size:13px;overflow-wrap:anywhere}.audit-section time{color:var(--text-secondary)}
@media(max-width:760px){.lab-heading,.control-card,.section-heading{flex-direction:column}.mode-badge{align-self:flex-start}.control-card,.account-section,.review-card,.audit-section{padding:18px}.metrics-grid{grid-template-columns:1fr 1fr;gap:20px 10px}.metrics-grid strong{font-size:21px}.metrics-grid>div{padding-left:10px}.candidate-grid{grid-template-columns:1fr}.candidate-heading{flex-wrap:wrap}.controls{width:100%}.controls button{flex:1}.audit-section li{grid-template-columns:1fr;gap:3px}.scope-notice{padding:15px}.candidate-card{padding:18px}.source-strip{gap:6px 15px}.candidate-metrics dd{font-size:18px}}

/* Shared finance control sizing; operational state colors are intentionally retained. */
button, summary { min-height: var(--control-height); }
button { border-radius: var(--radius-control); }
input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), select { min-height: var(--control-height); border-radius: var(--radius-control); }
</style>
