<template>
  <section
    class="risk-panel"
    aria-label="계좌 전체 위험 관리"
  >
    <header>
      <div><h4>내 계좌 운용 범위</h4><p>주문 가능한 USD 현금 전체 · 기존 미국주식도 매도 관리에 포함</p></div>
      <strong>{{ stateLabel }}</strong>
    </header>
    <p class="risk-policy">
      입출금을 보정한 최고 계좌 평가 대비 10% 하락 시 신규 매수를 중단하고 전체 미국주식 청산을 진행합니다. 주문 지연·갭·미체결로 실제 손실은 10%를 넘을 수 있습니다.
    </p>
    <p
      v-if="error"
      class="risk-warning"
      role="alert"
    >
      {{ error }} · 이전 수치는 참고용이며 신규 매수는 차단됩니다.
    </p>
    <p
      v-if="risk.message"
      class="risk-warning"
    >
      {{ risk.message }}
    </p>
    <dl>
      <div><dt>계좌 평가액</dt><dd>{{ usd(risk.equityUsd) }}</dd></div>
      <div><dt>입출금 보정 고점</dt><dd>{{ usd(risk.peakEquityUsd) }}</dd></div>
      <div><dt>고점 대비 하락</dt><dd>{{ percent(risk.drawdownPercent) }} / 10%</dd></div>
      <div><dt>입출금 대조</dt><dd>{{ !loaded ? '확인 전' : risk.capitalFlowConfirmed ? '확인됨' : '확인 필요 · 매수 보류' }}</dd></div>
    </dl>
    <p
      v-if="risk.triggered"
      class="risk-warning"
      role="alert"
    >
      손실 중단 잠금이 유지됩니다. {{ risk.liquidationPending ? '전체 보유 청산 진행 중 · 미체결/동기화 상태 확인 필요' : '청산 처리 결과를 보유·주문 동기화에서 확인하세요.' }} 시작 버튼이나 입출금 기록으로 잠금을 해제하지 않습니다.
    </p>
    <p class="risk-note">
      마지막 위험 평가: {{ risk.observedAt || '아직 없음' }} · 값이 없거나 조회에 실패하면 0으로 추정하지 않습니다.
    </p>

    <details
      v-if="loaded && !risk.enabled"
      class="risk-form"
    >
      <summary>최초 정책 활성화</summary>
      <p>현재 계좌를 위험 관리 기준으로 등록합니다. 이 작업 자체는 신규 자동매수를 시작하지 않습니다. 다만 활성화 후에는 기존 보유도 손절·익절·계좌 손실 한도에 따른 매도 감시가 시작되어, 조건 충족 시 실제 매도 주문이 나갈 수 있습니다. 이미 활성화된 기준 고점을 다시 설정할 수 없습니다.</p>
      <label><input
        v-model="allHoldingsConfirmed"
        type="checkbox"
      > 기존 미국주식 전체가 매도 대상에 포함되고, 신규 매수를 켜지 않아도 매도 감시가 시작됨을 확인했습니다.</label>
      <label><input
        v-model="initialFlowsConfirmed"
        type="checkbox"
      > 계좌 입출금 내역과 현재 평가 기준을 확인했습니다.</label>
      <button
        :disabled="busy || !fresh || !allHoldingsConfirmed || !initialFlowsConfirmed"
        @click="$emit('activate')"
      >
        전체 계좌 위험 정책 활성화
      </button>
    </details>

    <details
      v-if="loaded && risk.enabled"
      class="risk-form"
    >
      <summary>입출금 내역 확인</summary>
      <p>입금·출금 전 확인 대기로 전환하세요. 평가액 증감을 입출금으로 자동 추정하지 않습니다. 대조가 끝나기 전에는 신규 매수와 새 낙폭 판정을 보류합니다.</p>
      <button
        v-if="risk.capitalFlowConfirmed"
        :disabled="busy || !fresh"
        @click="$emit('review')"
      >
        입출금 확인 대기로 전환
      </button>
      <form
        v-else
        @submit.prevent="submitFlow"
      >
        <label for="risk-flow-reference">거래내역 고유 참조번호</label>
        <input
          id="risk-flow-reference"
          v-model="reference"
          required
          maxlength="100"
          autocomplete="off"
          placeholder="같은 입출금에는 같은 번호 사용"
          :disabled="busy"
        >
        <label for="risk-flow-amount">확인된 USD 입출금 (입금 + / 출금 −)</label>
        <input
          id="risk-flow-amount"
          v-model="amountUsd"
          required
          type="number"
          step="0.01"
          inputmode="decimal"
          :disabled="busy"
        >
        <small>주식 손익·환율 변동을 입출금으로 입력하지 마세요. 실제 거래내역을 대조한 금액만 입력합니다. 자금 이동이 없었음을 확인했다면 0을 입력합니다.</small>
        <label><input
          v-model="flowConfirmed"
          type="checkbox"
          :disabled="busy"
        > 거래내역의 참조번호와 USD 금액을 대조했습니다.</label>
        <button :disabled="busy || !fresh || !validFlow">
          확인한 입출금 반영
        </button>
      </form>
    </details>
    <section
      class="validation-note"
      aria-label="전략 성과 검증"
    >
      <strong>S&amp;P 500 대비 성과: 검증 전</strong>
      <p>실제 성과·독립 모의검증 결과가 아직 없습니다. 비교 관찰(OBSERVE)은 모의매매가 아니며 기존 조건으로 실주문이 발생할 수 있습니다.</p>
    </section>
  </section>
</template>

<script setup>
/* global defineProps, defineEmits */
import { computed, ref } from 'vue'

const props = defineProps({
  risk: { type: Object, default: () => ({}) },
  loaded: { type: Boolean, default: false },
  fresh: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' },
})
const emit = defineEmits(['activate', 'review', 'capital-flow'])
const allHoldingsConfirmed = ref(false), initialFlowsConfirmed = ref(false)
const reference = ref(''), amountUsd = ref(''), flowConfirmed = ref(false)
const stateLabel = computed(() => !props.fresh || props.error ? '위험 상태 확인 필요' : props.risk.triggered
  ? '손실 중단 잠금' : !props.risk.enabled ? '정책 미활성' : !props.risk.capitalFlowConfirmed ? '입출금 확인 대기' : '전체 계좌 위험 관리 중')
const validFlow = computed(() => reference.value.trim() && String(amountUsd.value).trim() !== '' && Number.isFinite(Number(amountUsd.value)) && flowConfirmed.value)
const known = value => props.loaded && value != null && value !== '' && Number.isFinite(Number(value))
const usd = value => known(value) ? `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'
const percent = value => known(value) ? `${Number(value).toFixed(2)}%` : '—'
function submitFlow() {
  if (props.busy || !props.fresh || !validFlow.value) return
  emit('capital-flow', { reference: reference.value.trim(), amountUsd: String(amountUsd.value) })
}
</script>

<style scoped>
.risk-panel{margin:0 0 16px;padding:18px;border:1px solid var(--card-border);border-radius:14px;background:var(--card-bg);color:var(--text-primary)}
header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}h4{margin:0;font-size:1rem}p{margin:8px 0;line-height:1.6;font-size:.82rem}header strong{color:var(--accent);white-space:nowrap}
dl{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:16px 0}dl>div{background:var(--input-bg);padding:12px;border-radius:10px}dt{font-size:.75rem;color:var(--text-secondary)}dd{margin:7px 0 0;font-weight:700;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.risk-warning{padding:10px;background:var(--warning-bg);color:var(--text-primary);border-left:3px solid var(--warning-color)}.risk-note,small{font-size:.74rem;color:var(--text-muted)}.risk-form,.validation-note{border-top:1px solid var(--card-border);padding-top:12px;margin-top:12px}summary{cursor:pointer;font-weight:700}label{display:flex;gap:8px;align-items:center;margin:10px 0;font-size:.8rem}form{display:grid;gap:5px;max-width:600px}input:not([type=checkbox]){padding:10px;background:var(--input-bg);border:1px solid var(--input-border);border-radius:8px;color:var(--text-primary);min-width:0}input[type=checkbox]{width:18px;height:18px;flex-shrink:0}button{min-height:42px;padding:9px 14px;border:1px solid var(--card-border-strong);border-radius:8px;color:var(--text-primary);background:var(--surface-2);cursor:pointer}button:disabled{opacity:.45;cursor:not-allowed}button:focus-visible,input:focus-visible,summary:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
@media(max-width:700px){header{flex-direction:column;gap:4px}dl{grid-template-columns:repeat(2,minmax(0,1fr))}.risk-panel{padding:14px}}
</style>
