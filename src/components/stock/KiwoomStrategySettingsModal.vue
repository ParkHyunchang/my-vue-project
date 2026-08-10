<template>
  <teleport to="body">
    <div
      class="amodal-overlay"
      data-lenis-prevent
      @click.self="close"
    >
      <div class="amodal-box trade-settings-modal">
        <div class="amodal-head">
          <div>
            <h2>매매 규칙 설정</h2>
            <span :class="['amodal-badge', form.autoExecute ? 'amodal-badge-on' : 'amodal-badge-off']">
              자동 주문 {{ form.autoExecute ? '켜짐' : '꺼짐' }}
            </span>
          </div>
          <button
            class="amodal-close"
            aria-label="닫기"
            @click="close"
          >
            ×
          </button>
        </div>

        <div class="amodal-body">
          <p
            v-if="loading"
            class="amodal-desc"
          >
            설정을 불러오는 중...
          </p>
          <template v-else>
            <div class="easy-guide">
              <b>숫자만 바꾸면 됩니다.</b>
              <span>저장하기를 눌러야 실제 매매 규칙에 적용됩니다.</span>
            </div>

            <div class="amodal-form thin-scrollbar">
              <section class="setting-card buy-card">
                <p class="setting-step">
                  1. 새 주식을 살 때
                </p>
                <p class="setting-description">
                  자동으로 살지, 한 번에 얼마까지 살지만 정합니다.
                </p>

                <div class="amodal-field switch-field">
                  <label for="ks-auto">
                    자동으로 주문 보내기
                    <span class="amodal-field-hint">AI가 조건을 만족한 매수·매도 제안을 사람 확인 없이 키움에 보냅니다.</span>
                  </label>
                  <input
                    id="ks-auto"
                    v-model="form.autoExecute"
                    type="checkbox"
                    class="amodal-check"
                  >
                </div>
                <p
                  v-if="form.autoExecute"
                  class="amodal-note warning-note"
                >
                  실제 주문이 자동으로 전송됩니다. 아래 조건을 충분히 확인하세요.
                </p>

                <div class="amodal-field">
                  <label for="ks-conf">
                    AI 확신 점수
                    <span class="amodal-field-hint">이 점수 이상일 때만 자동 주문합니다. 숫자가 클수록 더 까다롭게 고릅니다.</span>
                  </label>
                  <div class="number-with-unit">
                    <input
                      id="ks-conf"
                      v-model.number="form.autoExecuteMinConfidence"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      class="amodal-input"
                    >
                    <span>% 이상</span>
                  </div>
                </div>

                <div class="amodal-field">
                  <label for="ks-budget">
                    한 번에 살 수 있는 돈
                    <span class="amodal-field-hint">예수금 중 한 번의 매수에 쓸 수 있는 최대 비율입니다.</span>
                  </label>
                  <div class="number-with-unit">
                    <input
                      id="ks-budget"
                      v-model.number="form.maxBuyDepositPercent"
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      class="amodal-input"
                    >
                    <span>%</span>
                  </div>
                </div>
              </section>

              <section class="setting-card screen-card">
                <p class="setting-step">
                  2. 매수 후보 찾기
                </p>
                <p class="setting-description">
                  조건을 충족한 종목만 AI가 다시 평가합니다. 기준을 낮추면 후보와 판단 횟수는 늘지만, 거래가 반드시 늘어나지는 않습니다.
                </p>

                <div class="amodal-field">
                  <label for="ks-reevaluation">
                    같은 후보 다시 판단하는 간격
                    <span class="amodal-field-hint">후보 목록이 같아도 이 시간이 지나면 AI가 다시 매수·보유 판단을 합니다.</span>
                  </label>
                  <div class="number-with-unit">
                    <input
                      id="ks-reevaluation"
                      v-model.number="form.candidateReevaluationMinutes"
                      type="number"
                      min="15"
                      max="240"
                      step="15"
                      class="amodal-input"
                    >
                    <span>분</span>
                  </div>
                </div>

                <div class="amodal-field">
                  <label for="ks-min-change">
                    후보 최소 당일 상승률
                    <span class="amodal-field-hint">이 비율 이상 오른 종목만 후보가 됩니다. 급등 추격 여부는 AI가 한 번 더 판단합니다.</span>
                  </label>
                  <div class="number-with-unit positive-unit">
                    <span>+</span>
                    <input
                      id="ks-min-change"
                      v-model.number="form.swingMinChangePercent"
                      type="number"
                      min="0.5"
                      max="15"
                      step="0.5"
                      class="amodal-input"
                    >
                    <span>%</span>
                  </div>
                </div>

                <div class="amodal-field">
                  <label for="ks-max-change">
                    후보 최대 당일 상승률
                    <span class="amodal-field-hint">이 비율보다 많이 오른 종목은 급등 추격을 피하기 위해 신규 매수 후보에서 제외합니다.</span>
                  </label>
                  <div class="number-with-unit positive-unit">
                    <span>+</span>
                    <input
                      id="ks-max-change"
                      v-model.number="form.swingMaxChangePercent"
                      type="number"
                      min="0.5"
                      max="30"
                      step="0.5"
                      class="amodal-input"
                    >
                    <span>%</span>
                  </div>
                </div>

                <div class="amodal-field">
                  <label for="ks-min-volume">
                    후보 최소 거래량 증가
                    <span class="amodal-field-hint">20일 평균 거래량 대비 배수입니다. 2배는 평소보다 거래량이 두 배 이상인 종목을 뜻합니다.</span>
                  </label>
                  <div class="number-with-unit">
                    <input
                      id="ks-min-volume"
                      v-model.number="form.swingMinVolumeRatio"
                      type="number"
                      min="1"
                      max="20"
                      step="0.5"
                      class="amodal-input"
                    >
                    <span>배</span>
                  </div>
                </div>
              </section>

              <section class="setting-card sell-card">
                <p class="setting-step">
                  2. 산 주식을 팔 때
                </p>
                <p class="setting-description">
                  손실을 줄이거나 이익을 지키기 위한 매도 규칙입니다.
                </p>

                <div class="amodal-field switch-field">
                  <label for="ks-loop">
                    손절·익절 자동 확인
                    <span class="amodal-field-hint">장중 5분마다 보유 종목을 확인해 아래 조건에 맞으면 매도 제안을 만듭니다.</span>
                  </label>
                  <input
                    id="ks-loop"
                    v-model="form.riskLoopEnabled"
                    type="checkbox"
                    class="amodal-check"
                  >
                </div>

                <div class="amodal-field">
                  <label for="ks-sl">
                    손실이 이만큼 나면 팔기
                    <span class="amodal-field-hint">평균 매수가보다 이 비율 이상 내려가면 손절 대상입니다. 0은 사용하지 않음입니다.</span>
                  </label>
                  <div class="number-with-unit negative-unit">
                    <span>-</span>
                    <input
                      id="ks-sl"
                      v-model.number="form.swingStopLossPercent"
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      class="amodal-input"
                    >
                    <span>%</span>
                  </div>
                </div>

                <div class="amodal-field">
                  <label for="ks-tp">
                    이익이 이만큼 나면 팔기
                    <span class="amodal-field-hint">평균 매수가보다 이 비율 이상 오르면 익절 대상입니다. 0은 사용하지 않음입니다.</span>
                  </label>
                  <div class="number-with-unit positive-unit">
                    <span>+</span>
                    <input
                      id="ks-tp"
                      v-model.number="form.swingTakeProfitPercent"
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      class="amodal-input"
                    >
                    <span>%</span>
                  </div>
                </div>

                <div class="amodal-field">
                  <label for="ks-tp2">
                    2차 익절 기준(0=사용 안 함)
                    <span class="amodal-field-hint">여기에 값을 넣으면 위 1차 기준에서 전량 매도하는 대신, 보유수량이 2주 이상일 때 1차/2차 두 단계로 나눠 팝니다. 1주만 보유 중이면 항상 1차 기준으로 전량 매도합니다.</span>
                  </label>
                  <div class="number-with-unit positive-unit">
                    <span>+</span>
                    <input
                      id="ks-tp2"
                      v-model.number="form.swingTakeProfitPercent2"
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      class="amodal-input"
                    >
                    <span>%</span>
                  </div>
                </div>

                <div class="amodal-field">
                  <label for="ks-tp-split">
                    1차에서 팔 비율
                    <span class="amodal-field-hint">2차 익절 기준을 사용할 때, 보유수량 중 1차 가격에서 매도할 비율입니다. 나머지는 2차 가격에서 매도합니다.</span>
                  </label>
                  <div class="number-with-unit">
                    <input
                      id="ks-tp-split"
                      v-model.number="form.swingTakeProfitSplitPercent"
                      type="number"
                      min="1"
                      max="99"
                      step="1"
                      class="amodal-input"
                    >
                    <span>%</span>
                  </div>
                </div>

                <div class="amodal-field">
                  <label for="ks-days">
                    최대 보유기간
                    <span class="amodal-field-hint">매수 체결일 다음 KRX 거래일부터 계산합니다. 토·일요일과 KRX 휴장일은 세지 않으며, 설정 기간을 초과한 첫 거래일에 자동 매도합니다. 예: 5거래일이면 5거래일까지 보유하고 6번째 거래일에 청산합니다.</span>
                  </label>
                  <div class="number-with-unit">
                    <input
                      id="ks-days"
                      v-model.number="form.swingMaxHoldingDays"
                      type="number"
                      min="1"
                      max="30"
                      step="1"
                      class="amodal-input"
                    >
                    <span>거래일</span>
                  </div>
                </div>
              </section>

              <section class="setting-card safety-card">
                <p class="setting-step">
                  3. 하루 안전장치
                </p>
                <div class="amodal-field">
                  <label for="ks-loss">
                    오늘 손실률이 이 비율이면 새 매수 멈추기
                    <span class="amodal-field-hint">당일 첫 잔고 확인 시점의 총자산을 기준으로 계산합니다. 이후 입금·출금은 키움 거래내역을 조회해 기준자산에 보정하므로, 자금 이동 자체가 손실로 계산되지 않습니다.</span>
                  </label>
                  <div class="number-with-unit">
                    <input
                      id="ks-loss"
                      v-model.number="form.dailyLossLimitPercent"
                      type="number"
                      min="0"
                      max="30"
                      step="0.1"
                      class="amodal-input"
                    >
                    <span>%</span>
                  </div>
                </div>
                <p class="amodal-note">
                  <b>발동 후 동작:</b> 장 마감까지 신규 매수만 차단하고 다음 거래일에 자동 초기화됩니다. 발동한 뒤에는 값을 0으로 바꿔도 그날 차단은 유지됩니다. <b>0%</b>는 다음 손실 점검부터 이 안전장치를 사용하지 않는 설정입니다.
                </p>

                <div class="amodal-field">
                  <label for="ks-daily">
                    오늘 신규 매수 체결 건수 제한
                    <span class="amodal-field-hint">실제로 체결 수량이 발생한 신규 매수 주문의 하루 최대 합계입니다. 미체결 주문, 주문 전송 실패, AI 제안만 생성된 경우는 포함하지 않습니다. 부분 체결은 한 건으로 셉니다. 익절·손절 매도와 후보 검토는 제한하지 않습니다.</span>
                  </label>
                  <div class="number-with-unit">
                    <input
                      id="ks-daily"
                      v-model.number="form.dailyMaxProposals"
                      type="number"
                      min="1"
                      max="200"
                      step="1"
                      class="amodal-input"
                    >
                    <span>건</span>
                  </div>
                </div>
              </section>
            </div>

            <div
              v-if="validationError"
              class="amodal-error"
            >
              ⚠ {{ validationError }}
            </div>
            <div
              v-if="error"
              class="amodal-error"
            >
              ⚠ {{ error }}
            </div>
          </template>
        </div>

        <div class="amodal-foot">
          <span class="amodal-tools-note">{{ isDirty ? '아직 저장되지 않았습니다' : '' }}</span>
          <div class="amodal-foot-right">
            <button
              class="amodal-btn amodal-btn-ghost"
              :disabled="saving"
              @click="close"
            >
              취소
            </button>
            <button
              class="amodal-btn amodal-btn-primary"
              :disabled="saving || loading || !isDirty || !!validationError"
              @click="save"
            >
              {{ saving ? '저장 중...' : '저장하기' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
/* global defineEmits */
import { computed, onMounted, ref } from 'vue'
import { fetchStrategySettings, updateStrategySettings } from '@/api/kiwoomApi'

const emit = defineEmits(['close', 'saved'])

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const form = ref({ autoExecute: false, autoExecuteMinConfidence: 85, maxBuyDepositPercent: 10, candidateReevaluationMinutes: 60, swingMinChangePercent: 2, swingMaxChangePercent: 8, swingMinVolumeRatio: 2, dailyMaxProposals: 10, swingStopLossPercent: 3, swingTakeProfitPercent: 6, swingTakeProfitPercent2: 0, swingTakeProfitSplitPercent: 50, swingMaxHoldingDays: 5, riskLoopEnabled: false, dailyLossLimitPercent: 0 })
const original = ref('')
let prompt = ''

const isDirty = computed(() => JSON.stringify(form.value) !== original.value)
const validationError = computed(() => {
  const f = form.value
  if (!Number.isInteger(f.autoExecuteMinConfidence) || f.autoExecuteMinConfidence < 0 || f.autoExecuteMinConfidence > 100) return 'AI 확신 점수는 0부터 100 사이의 정수여야 합니다.'
  if (!Number.isInteger(f.candidateReevaluationMinutes) || f.candidateReevaluationMinutes < 15 || f.candidateReevaluationMinutes > 240) return '후보 재판단 주기는 15부터 240분 사이의 정수여야 합니다.'
  if (typeof f.swingMinChangePercent !== 'number' || Number.isNaN(f.swingMinChangePercent) || f.swingMinChangePercent < 0.5 || f.swingMinChangePercent > 15) return '후보 최소 상승률은 0.5부터 15 사이여야 합니다.'
  if (typeof f.swingMaxChangePercent !== 'number' || Number.isNaN(f.swingMaxChangePercent) || f.swingMaxChangePercent < f.swingMinChangePercent || f.swingMaxChangePercent > 30) return '후보 최대 상승률은 최소 상승률 이상, 30 이하이어야 합니다.'
  if (typeof f.swingMinVolumeRatio !== 'number' || Number.isNaN(f.swingMinVolumeRatio) || f.swingMinVolumeRatio < 1 || f.swingMinVolumeRatio > 20) return '후보 최소 거래량 증가는 1부터 20배 사이여야 합니다.'
  for (const [label, value] of [['한 번에 살 수 있는 돈', f.maxBuyDepositPercent], ['손절 기준', f.swingStopLossPercent], ['익절 기준', f.swingTakeProfitPercent], ['2차 익절 기준', f.swingTakeProfitPercent2]]) {
    if (typeof value !== 'number' || Number.isNaN(value) || value < 0 || value > 100) return `${label}은 0부터 100 사이여야 합니다.`
  }
  if (typeof f.swingTakeProfitSplitPercent !== 'number' || Number.isNaN(f.swingTakeProfitSplitPercent) || f.swingTakeProfitSplitPercent < 1 || f.swingTakeProfitSplitPercent > 99) return '1차에서 팔 비율은 1부터 99 사이여야 합니다.'
  if (f.swingTakeProfitPercent2 > 0 && f.swingTakeProfitPercent2 <= f.swingTakeProfitPercent) return '2차 익절 기준은 1차 익절 기준보다 커야 합니다.'
  if (!Number.isInteger(f.swingMaxHoldingDays) || f.swingMaxHoldingDays < 1 || f.swingMaxHoldingDays > 30) return '가장 오래 들고 있을 날짜는 1부터 30 거래일 사이여야 합니다.'
  if (!Number.isInteger(f.dailyMaxProposals) || f.dailyMaxProposals < 1 || f.dailyMaxProposals > 200) return '오늘 신규 매수 체결 건수 제한은 1부터 200 사이의 정수여야 합니다.'
  if (typeof f.dailyLossLimitPercent !== 'number' || Number.isNaN(f.dailyLossLimitPercent) || f.dailyLossLimitPercent < 0 || f.dailyLossLimitPercent > 30) return '일일 손실 한도는 0부터 30% 사이여야 합니다.'
  return ''
})

function close () {
  if (isDirty.value && !window.confirm('저장하지 않은 변경사항이 있습니다. 닫을까요?')) return
  emit('close')
}

function extractErrorMessage (e, fallback) {
  const data = e.response?.data
  if (typeof data === 'string' && data) return data
  return data?.message || fallback
}

async function save () {
  if (!original.value.includes('"autoExecute":true') && form.value.autoExecute && !window.confirm('자동 주문을 켜면 조건에 맞는 주문이 사람 확인 없이 키움에 전송될 수 있습니다. 계속할까요?')) return
  saving.value = true
  error.value = ''
  try {
    const { data } = await updateStrategySettings({ ...form.value, prompt })
    emit('saved', data)
  } catch (e) {
    error.value = extractErrorMessage(e, '설정을 저장하지 못했습니다.')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const { data } = await fetchStrategySettings()
    prompt = data.prompt || ''
    form.value = {
      autoExecute: !!data.autoExecute,
      autoExecuteMinConfidence: data.autoExecuteMinConfidence ?? 85,
      maxBuyDepositPercent: data.maxBuyDepositPercent ?? 10,
      candidateReevaluationMinutes: data.candidateReevaluationMinutes ?? 60,
      swingMinChangePercent: data.swingMinChangePercent ?? 2,
      swingMaxChangePercent: data.swingMaxChangePercent ?? 8,
      swingMinVolumeRatio: data.swingMinVolumeRatio ?? 2,
      dailyMaxProposals: data.dailyMaxProposals ?? 10,
      swingStopLossPercent: data.swingStopLossPercent ?? 3,
      swingTakeProfitPercent: data.swingTakeProfitPercent ?? 6,
      swingTakeProfitPercent2: data.swingTakeProfitPercent2 ?? 0,
      swingTakeProfitSplitPercent: data.swingTakeProfitSplitPercent ?? 50,
      swingMaxHoldingDays: data.swingMaxHoldingDays ?? 5,
      riskLoopEnabled: !!data.riskLoopEnabled,
      dailyLossLimitPercent: data.dailyLossLimitPercent ?? 0
    }
    original.value = JSON.stringify(form.value)
  } catch (e) {
    error.value = extractErrorMessage(e, '설정을 불러오지 못했습니다.')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.trade-settings-modal { max-width: 640px; }
.easy-guide { display: grid; gap: 3px; margin: 0 0 14px; padding: 12px; border-radius: 10px; background: #1f2924; color: #dff5e5; font-size: .86rem; }
.easy-guide span { color: #b6c6ba; font-size: .78rem; }
.setting-card { margin: 0 0 12px; padding: 14px; border: 1px solid var(--card-border); border-radius: 12px; }
.buy-card { border-left: 3px solid #d98a51; }
.screen-card { border-left: 3px solid #9e8ee8; }
.sell-card { border-left: 3px solid #68a6e8; }
.safety-card { border-left: 3px solid #d4b466; }
.setting-step { margin: 0; font-size: 1rem; font-weight: 800; }
.setting-description { margin: 4px 0 10px; color: var(--text-muted); font-size: .78rem; }
.switch-field { align-items: center; }
.number-with-unit { display: inline-flex; align-items: center; justify-content: flex-end; gap: 5px; min-width: 118px; white-space: nowrap; font-size: .82rem; color: var(--text-muted); }
.number-with-unit .amodal-input { width: 78px; text-align: right; }
.negative-unit > :first-child { color: #f29090; font-weight: 800; }
.positive-unit > :first-child { color: #80d69a; font-weight: 800; }
.warning-note { margin-top: 0; }
@media (max-width: 520px) {
  .setting-card { padding: 12px; }
  .amodal-field { align-items: flex-start; flex-direction: column; gap: 6px; }
  .number-with-unit { align-self: flex-end; }
}
</style>
