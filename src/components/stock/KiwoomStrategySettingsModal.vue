<template>
  <!-- body 로 teleport — scoped CSS 가 적용되지 않으므로 전역 admin-modal.css 의 amodal-* 만 사용한다. -->
  <teleport to="body">
    <div
      class="amodal-overlay"
      data-lenis-prevent
      @click.self="close"
    >
      <div class="amodal-box">
        <div class="amodal-head">
          <div>
            <h2>전략 설정</h2>
            <span :class="['amodal-badge', form.autoExecute ? 'amodal-badge-on' : 'amodal-badge-off']">자동 전송 {{ form.autoExecute ? 'ON' : 'OFF' }}</span>
          </div>
          <button
            class="amodal-close"
            aria-label="닫기"
            @click="close"
          >
            ✕
          </button>
        </div>

        <div class="amodal-body">
          <div
            v-if="loading"
            class="amodal-desc"
          >
            불러오는 중...
          </div>
          <template v-else>
            <div class="amodal-form thin-scrollbar">
              <p class="amodal-section-label">
                자동 전송
              </p>
              <div class="amodal-field">
                <label for="ks-auto">자동 주문 전송 (autoExecute)
                  <span class="amodal-field-hint">예약 판단·리스크 청산 제안을 승인 없이 키움에 전송합니다.</span>
                </label>
                <input
                  id="ks-auto"
                  v-model="form.autoExecute"
                  type="checkbox"
                  class="amodal-check"
                >
              </div>
              <div
                v-if="form.autoExecute"
                class="amodal-note"
              >
                ⚠ 자동 전송이 켜지면 신뢰도 기준을 넘는 지정가 제안이 사람 확인 없이 전송됩니다.
                {{ dryRun ? '현재는 dry-run 상태라 실제 주문은 나가지 않습니다.' : '현재 실주문 전송이 활성화되어 있습니다.' }}
              </div>
              <div class="amodal-field">
                <label for="ks-conf">자동 전송 최소 신뢰도 (%)
                  <span class="amodal-field-hint">이 값보다 낮은 신뢰도의 제안은 자동 전송하지 않습니다. (0~100)</span>
                </label>
                <input
                  id="ks-conf"
                  v-model.number="form.autoExecuteMinConfidence"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  class="amodal-input"
                >
              </div>

              <p class="amodal-section-label">
                매수 한도
              </p>
              <div class="amodal-field">
                <label for="ks-budget">매수 1건당 예수금 비율 (%)
                  <span class="amodal-field-hint">한 번의 매수 금액이 예수금의 이 비율을 넘으면 차단합니다. (0~100)</span>
                </label>
                <input
                  id="ks-budget"
                  v-model.number="form.maxBuyDepositPercent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  class="amodal-input"
                >
              </div>

              <p class="amodal-section-label">
                손절 · 익절 · 보유기간
              </p>
              <div class="amodal-field">
                <label for="ks-sl">손절 기준 (%)
                  <span class="amodal-field-hint">평단 대비 이 비율 이상 하락하면 청산 대상입니다. (0~100)</span>
                </label>
                <input
                  id="ks-sl"
                  v-model.number="form.swingStopLossPercent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  class="amodal-input"
                >
              </div>
              <div class="amodal-field">
                <label for="ks-tp">익절 기준 (%)
                  <span class="amodal-field-hint">평단 대비 이 비율 이상 상승하면 청산 대상입니다. (0~100)</span>
                </label>
                <input
                  id="ks-tp"
                  v-model.number="form.swingTakeProfitPercent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  class="amodal-input"
                >
              </div>
              <div class="amodal-field">
                <label for="ks-days">최대 보유일 (일)
                  <span class="amodal-field-hint">엔진이 매수한 종목을 이 일수보다 오래 들고 있으면 청산 대상입니다. (1~30)</span>
                </label>
                <input
                  id="ks-days"
                  v-model.number="form.swingMaxHoldingDays"
                  type="number"
                  min="1"
                  max="30"
                  step="1"
                  class="amodal-input"
                >
              </div>

              <p class="amodal-section-label">
                리스크 관리
              </p>
              <div class="amodal-field">
                <label for="ks-loop">손절·익절 집행 루프
                  <span class="amodal-field-hint">장중 5분마다 보유 종목을 검사해 손절·익절·보유기간 청산 SELL 제안을 만듭니다.</span>
                </label>
                <input
                  id="ks-loop"
                  v-model="form.riskLoopEnabled"
                  type="checkbox"
                  class="amodal-check"
                >
              </div>
              <div class="amodal-field">
                <label for="ks-loss">일일 손실 한도 (원)
                  <span class="amodal-field-hint">당일 총자산이 장 시작 스냅샷보다 이 금액 이상 줄면 신규 매수를 차단합니다. 0 = 비활성{{ form.dailyLossLimitAmount > 0 ? ` · 현재 ${Number(form.dailyLossLimitAmount).toLocaleString()}원` : '' }}</span>
                </label>
                <input
                  id="ks-loss"
                  v-model.number="form.dailyLossLimitAmount"
                  type="number"
                  min="0"
                  step="10000"
                  class="amodal-input"
                >
              </div>
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
          <span class="amodal-tools-note">{{ isDirty ? '저장 안 됨' : '' }}</span>
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
              {{ saving ? '저장 중...' : '저장' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
/* global defineProps, defineEmits */
import { computed, onMounted, ref } from 'vue'
import axios from '@/axios'

defineProps({ dryRun: Boolean })
const emit = defineEmits(['close', 'saved'])

const loading = ref(true), saving = ref(false), error = ref('')
const form = ref({ autoExecute: false, autoExecuteMinConfidence: 85, maxBuyDepositPercent: 10, swingStopLossPercent: 3, swingTakeProfitPercent: 6, swingMaxHoldingDays: 5, riskLoopEnabled: false, dailyLossLimitAmount: 0 })
const original = ref('')
// 서버의 PATCH 는 prompt 를 항상 저장한다(비면 기본 지침으로 덮어씀) — 조회한 값을 그대로 되돌려보내 커스텀 프롬프트 유실을 막는다.
let prompt = ''

const isDirty = computed(() => JSON.stringify(form.value) !== original.value)
const validationError = computed(() => {
  const f = form.value
  if (!Number.isInteger(f.autoExecuteMinConfidence) || f.autoExecuteMinConfidence < 0 || f.autoExecuteMinConfidence > 100) return '자동 전송 최소 신뢰도는 0~100 사이 정수여야 합니다.'
  for (const [label, v] of [['매수 예수금 비율', f.maxBuyDepositPercent], ['손절 기준', f.swingStopLossPercent], ['익절 기준', f.swingTakeProfitPercent]]) {
    if (typeof v !== 'number' || Number.isNaN(v) || v < 0 || v > 100) return `${label}은 0~100 사이 값이어야 합니다.`
  }
  if (!Number.isInteger(f.swingMaxHoldingDays) || f.swingMaxHoldingDays < 1 || f.swingMaxHoldingDays > 30) return '최대 보유일은 1~30 사이 정수여야 합니다.'
  if (!Number.isInteger(f.dailyLossLimitAmount) || f.dailyLossLimitAmount < 0) return '일일 손실 한도는 0 이상의 정수(원)여야 합니다.'
  return ''
})

function close () {
  if (isDirty.value && !window.confirm('저장하지 않은 변경사항이 있습니다. 닫으시겠습니까?')) return
  emit('close')
}

async function save () {
  saving.value = true
  error.value = ''
  try {
    await axios.patch('/api/kiwoom/strategy/settings', { ...form.value, prompt })
    emit('saved')
  } catch (e) {
    error.value = e.response?.data?.message || '설정을 저장하지 못했습니다.'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const { data } = await axios.get('/api/kiwoom/strategy/settings')
    prompt = data.prompt || ''
    form.value = {
      autoExecute: !!data.autoExecute,
      autoExecuteMinConfidence: data.autoExecuteMinConfidence ?? 85,
      maxBuyDepositPercent: data.maxBuyDepositPercent ?? 10,
      swingStopLossPercent: data.swingStopLossPercent ?? 3,
      swingTakeProfitPercent: data.swingTakeProfitPercent ?? 6,
      swingMaxHoldingDays: data.swingMaxHoldingDays ?? 5,
      riskLoopEnabled: !!data.riskLoopEnabled,
      dailyLossLimitAmount: data.dailyLossLimitAmount ?? 0
    }
    original.value = JSON.stringify(form.value)
  } catch (e) {
    error.value = e.response?.data?.message || '설정을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
})
</script>
