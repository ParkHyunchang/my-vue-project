<template>
  <section class="strategy-panel">
    <section class="panel-card">
      <div class="panel-card-head">
        <h3>AI 전략 제안</h3>
        <div class="status-chips">
          <span :class="['status-chip', { stopped: !autoTrading }]">{{ autoTrading ? '자동주문 실행 중' : '자동주문 완전 중지' }}</span>
          <span :class="['status-chip', { on: config.orderEnabled }]">{{ config.orderEnabled ? 'ORDER ENABLED' : 'ORDER DISABLED' }}</span>
        </div>
      </div>
      <p class="notice">
        {{ config.autoExecute ? `완전 자동매매 활성: 예약 판단에서 신뢰도 ${config.autoExecuteMinConfidence}% 이상인 제안을 안전 검사 후 자동 전송합니다.` : '자동 주문 전송이 꺼져 있습니다. 전략 설정에서 켜야 완전 자동매매가 시작됩니다.' }}
      </p>
      <div class="panel-card-actions">
        <button
          class="reassess-now"
          :disabled="pending"
          :title="DECIDE_NOW_HINT"
          @click="decideNow"
        >
          지금 재판단
        </button>
        <button
          class="sync-orders"
          :disabled="pending"
          :title="SYNC_ORDERS_HINT"
          @click="syncOrders"
        >
          주문 상태 동기화
        </button>
        <button
          :disabled="pending"
          :title="STRATEGY_SETTINGS_HINT"
          @click="showSettings = true"
        >
          전략 설정
        </button>
      </div>
      <p
        v-if="settingsMessage"
        class="settings-applied"
      >
        설정 저장 결과: {{ settingsMessage }}
      </p>
      <p class="usage-summary">
        오늘 AI 호출 {{ todayUsage.calls }}회 · 추정 입력 {{ todayUsage.input.toLocaleString() }} / 출력 {{ todayUsage.output.toLocaleString() }} 토큰
      </p>
    </section>
    <section
      v-if="operations.risk"
      class="panel-card"
    >
      <div class="panel-card-head">
        <h3>리스크 관리</h3>
        <span
          :class="['status-chip', 'risk-loop', { on: operations.risk.riskLoopEnabled }]"
          :title="RISK_LOOP_HINT"
        >손절·익절 루프 {{ operations.risk.riskLoopEnabled ? 'ON' : 'OFF' }}</span>
      </div>
      <div class="risk-strip">
        <span
          v-if="operations.risk.triggered"
          class="risk-triggered"
        >일일 손실 한도 발동 · 손실 {{ won(operations.risk.drawdown) }} / 한도 {{ won(operations.risk.dailyLossLimitAmount) }} · 신규 매수 차단</span><span v-else-if="operations.risk.dailyLossLimitAmount > 0">일일 손실 {{ won(operations.risk.drawdown) }} / 한도 {{ won(operations.risk.dailyLossLimitAmount) }}</span><span v-else>일일 손실 한도 미설정</span><button
          v-if="operations.risk.triggered"
          class="daily-loss-reset"
          :disabled="pending"
          :title="DAILY_LOSS_RESET_HINT"
          @click="resetDailyLossGuard"
        >
          오늘 손실 차단 해제
        </button><small
          v-if="operations.risk.snapshotDate"
          class="risk-assets"
        >기준 자산 {{ won(operations.risk.baseAsset) }} · 현재 자산 {{ won(operations.risk.lastAsset) }}</small><small v-if="operations.risk.lastScanAt">마지막 스캔 {{ date(operations.risk.lastScanAt) }}</small>
      </div>
    </section>
    <p
      v-if="error"
      class="error"
    >
      {{ error }}
    </p>
    <section class="broker-holdings">
      <div class="broker-holdings-title">
        <b>키움 실계좌 보유현황</b><small>자동매매 기준 · {{ brokerHoldings.length ? `마지막 동기화 ${date(brokerHoldings[0].syncedAt)}` : '아직 동기화된 보유종목 없음' }}</small><button
          v-if="brokerHoldings.length"
          class="liquidate-all"
          :disabled="pending"
          @click="liquidateAll"
        >
          전 종목 시장가 청산
        </button>
      </div>
      <div
        v-if="brokerHoldings.length"
        class="holdings-table-wrap"
      >
        <table class="holdings-table">
          <thead>
            <tr>
              <th>종목</th>
              <th class="th-r">
                보유수량
              </th>
              <th class="th-r">
                매도가능수량
              </th>
              <th class="th-r">
                평단가
              </th>
              <th class="th-r">
                현재가
              </th>
              <th class="th-r">
                수익률
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="holding in displayedBrokerHoldings"
              :key="holding.stockCode"
            >
              <td class="hname-cell">
                <div>
                  <div class="h-name">
                    {{ holding.stockName }}
                  </div>
                  <div class="h-sym">
                    {{ holding.stockCode }}
                  </div>
                </div>
              </td>
              <td class="td-r">
                {{ Number(holding.quantity).toLocaleString() }}주
              </td>
              <td class="td-r">
                {{ Number(holding.sellableQuantity).toLocaleString() }}주
              </td>
              <td class="td-r">
                {{ Number(holding.averagePrice).toLocaleString() }}원
              </td>
              <td class="td-r">
                {{ Number(holding.currentPrice || 0).toLocaleString() }}원
              </td>
              <td class="td-r">
                <span :class="changeClass(holding.profitLossPercent)">{{ formatChangePct(holding.profitLossPercent) }}</span>
              </td>
              <td class="td-act">
                <button
                  class="liquidate-one"
                  :disabled="pending"
                  @click="liquidateOne(holding)"
                >
                  시장가 청산
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        v-if="brokerHoldings.length"
        class="holdings-cards"
      >
        <div
          v-for="holding in displayedBrokerHoldings"
          :key="holding.stockCode"
          class="holding-card"
        >
          <div class="hcard-header">
            <div class="hcard-name-wrap">
              <div>
                <div class="h-name">
                  {{ holding.stockName }}
                </div>
                <div class="h-sym">
                  {{ holding.stockCode }}
                </div>
              </div>
            </div>
            <div class="hcard-price-wrap">
              <div class="hcard-price">
                {{ Number(holding.currentPrice || 0).toLocaleString() }}원
              </div>
              <div :class="['hcard-change', changeClass(holding.profitLossPercent)]">
                {{ formatChangePct(holding.profitLossPercent) }}
              </div>
            </div>
          </div>
          <div class="hcard-body">
            <div class="hcard-row">
              <span class="hcard-label">보유수량</span>
              <span>{{ Number(holding.quantity).toLocaleString() }}주</span>
            </div>
            <div class="hcard-row">
              <span class="hcard-label">매도가능수량</span>
              <span>{{ Number(holding.sellableQuantity).toLocaleString() }}주</span>
            </div>
            <div class="hcard-row">
              <span class="hcard-label">평단가</span>
              <span>{{ Number(holding.averagePrice).toLocaleString() }}원</span>
            </div>
          </div>
          <div class="hcard-actions">
            <button
              class="liquidate-one"
              :disabled="pending"
              @click="liquidateOne(holding)"
            >
              시장가 청산
            </button>
          </div>
        </div>
      </div>
      <p
        v-if="liquidationMessage"
        :class="['liquidation-result', { failed: liquidationFailed }]"
      >
        {{ liquidationMessage }}
      </p>
    </section>
    <div class="candidate-list">
      <span
        v-for="c in candidates"
        :key="c.code"
        class="candidate-chip"
      >{{ c.name }} · {{ c.code }} <span :class="['change-badge', changeClass(c.changePercent)]">{{ formatChangePct(c.changePercent) }}</span> <small>거래량 {{ c.volumeRatio }}배</small></span><small v-if="!candidates.length">현재 KRX 자동 스캔 매매 후보가 없습니다.</small>
    </div>
    <div class="runs">
      <template
        v-for="group in groupedRuns"
        :key="group.key"
      >
        <div class="run-date-divider">
          <span>{{ group.label }}</span>
        </div>
        <template
          v-for="item in group.items"
          :key="item.key"
        >
          <p
            v-if="item.type === 'skipped-group'"
            class="run-skipped-group"
          >
            변경 없음으로 건너뜀 {{ item.count }}건 · {{ date(item.from) }} ~ {{ date(item.to) }}
          </p>
          <article
            v-else
            class="run-card"
            :class="{ expanded: isRunExpanded(item.run.id) }"
          >
            <button
              type="button"
              class="run-summary"
              :aria-expanded="isRunExpanded(item.run.id)"
              @click="toggleRun(item.run.id)"
            >
              <span class="run-chevron">▸</span>
              <span>{{ runSummaryText(item.run) }}</span>
            </button>
            <div
              v-show="isRunExpanded(item.run.id)"
              class="run-detail"
            >
              <p>{{ item.run.marketView || item.run.errorMessage || '생성된 제안이 없습니다.' }}</p>
              <div class="proposals-grid">
                <div
                  v-for="proposal in item.run.proposals"
                  :key="proposal.id"
                  class="proposal-card"
                >
                  <div class="proposal-primary">
                    <span :class="['action-badge', proposal.action]">{{ actionDisplayLabel(proposal) }}</span>
                    <span class="proposal-name">{{ proposal.stockName }} <small>({{ proposal.stockCode }})</small></span>
                    <span v-if="proposal.quantity">{{ proposal.quantity.toLocaleString() }}주</span>
                    <span v-if="proposal.limitPrice">{{ proposal.limitPrice.toLocaleString() }}원</span>
                    <span :class="['status-badge', statusTone(proposal.status)]">{{ proposalStatusLabel(proposal.status) }}</span>
                  </div>
                  <p class="proposal-secondary">
                    신뢰도 {{ proposal.confidence }}% · {{ proposal.reason }}
                  </p>
                  <small
                    v-if="proposal.guardFlags"
                    class="guards"
                  >안전 경고: {{ guardText(proposal.guardFlags) }}</small>
                  <small
                    v-if="statusDetail(proposal)"
                    class="status-detail"
                  >{{ statusDetail(proposal) }}</small>
                </div>
              </div>
            </div>
          </article>
        </template>
      </template><p
        v-if="!loading && !runs.length"
        class="empty"
      >
        아직 전략 판단 이력이 없습니다.
      </p>
    </div>
    <KiwoomStrategySettingsModal
      v-if="showSettings"
      :order-enabled="config.orderEnabled"
      @close="showSettings = false"
      @saved="onSettingsSaved"
    />
  </section>
</template>

<script setup>
/* global defineProps */
import { computed, onMounted, ref } from 'vue'
import {
  fetchAccountHoldings,
  fetchStrategyConfig,
  fetchStrategyHealth,
  fetchStrategyRuns,
  fetchStrategyUniverse,
  liquidateHoldings,
  resetDailyLossGuard as requestDailyLossReset,
  runStrategyDecision,
  syncStrategyOrders
} from '@/api/kiwoomApi'
import KiwoomStrategySettingsModal from '@/components/stock/KiwoomStrategySettingsModal.vue'
import { useStockFormatters } from '@/composables/useStockFormatters'
const props = defineProps({
  configured: Boolean,
  autoTrading: Boolean,
  priceTicks: { type: Object, default: () => ({}) },
})
const { formatChangePct, changeClass } = useStockFormatters()
const candidates = ref([]), runs = ref([]), brokerHoldings = ref([])
const config = ref({ orderEnabled: false, autoExecute: false, autoExecuteMinConfidence: 85 }), operations = ref({}), pending = ref(false), loading = ref(false), error = ref(''), settingsMessage = ref(''), showSettings = ref(false)
const liquidationMessage = ref(''), liquidationFailed = ref(false)
const displayedBrokerHoldings = computed(() => brokerHoldings.value.map((holding) => {
  const livePrice = Number(props.priceTicks[holding.stockCode]?.price)
  const currentPrice = Number.isFinite(livePrice) && livePrice > 0 ? livePrice : Number(holding.currentPrice || 0)
  const averagePrice = Number(holding.averagePrice || 0)
  const profitLossPercent = averagePrice > 0 && currentPrice > 0
    ? ((currentPrice - averagePrice) / averagePrice) * 100
    : Number(holding.profitLossPercent || 0)
  return { ...holding, currentPrice, profitLossPercent }
}))
// 검토 내역은 기본 접힌 상태로 두고, 가장 최근 판단 1건만 자동으로 펼쳐 첫 진입 시 정보 과부하를 막는다.
const expandedRunIds = ref(new Set())
let lastAutoExpandedId = null
const isRunExpanded = (id) => expandedRunIds.value.has(id)
function toggleRun (id) {
  if (expandedRunIds.value.has(id)) expandedRunIds.value.delete(id)
  else expandedRunIds.value.add(id)
}
function autoExpandLatestRun () {
  const latest = runs.value.find((run) => run.status !== 'SKIPPED')
  if (latest && latest.id !== lastAutoExpandedId) {
    expandedRunIds.value.add(latest.id)
    lastAutoExpandedId = latest.id
  }
}
const date = (value) => value ? new Date(value).toLocaleString('ko-KR', { hour12: false }) : ''
const won = (value) => `${Number(value || 0).toLocaleString()}원`
// "지금 판단"을 눌러도 예전 기록과 섞여 전부 방금 일어난 것처럼 보이는 걸 막기 위해 날짜별로 묶어
// 구분선을 둔다. 서버가 최근 3일치만 남기므로(KiwoomStrategyHistoryCleanupService) 그룹 수는 최대 3~4개.
const dayMs = 24 * 60 * 60 * 1000
function dateKey (value) { const d = new Date(value); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` }
function dateLabel (value) {
  const d = new Date(value)
  const startOfDay = (x) => { const y = new Date(x); y.setHours(0, 0, 0, 0); return y }
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(d)) / dayMs)
  if (diffDays === 0) return '오늘'
  if (diffDays === 1) return '어제'
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
}
// SKIPPED(후보 변경 없어 AI 호출 생략)는 15분마다 쌓여 스크롤만 늘리므로
// 연속된 구간을 한 줄 요약으로 접는다. 실제로 의미 있는 판단(SUCCESS/FAILED/BLOCKED 등)은 그대로 카드로 보여준다.
const groupedRuns = computed(() => {
  const groups = []
  let currentKey = null
  for (const run of runs.value) {
    const key = dateKey(run.createdAt)
    if (key !== currentKey) {
      groups.push({ key, label: dateLabel(run.createdAt), items: [] })
      currentKey = key
    }
    const items = groups[groups.length - 1].items
    const last = items[items.length - 1]
    if (run.status === 'SKIPPED') {
      // runs는 최신순(id desc)이라 그룹 내 첫 SKIPPED가 구간의 최신 시각(to), 이후 더 과거로 갈수록 from을 갱신한다.
      if (last && last.type === 'skipped-group') {
        last.count++
        last.from = run.createdAt
      } else {
        items.push({ type: 'skipped-group', key: `skip-${run.id}`, count: 1, to: run.createdAt, from: run.createdAt })
      }
    } else {
      items.push({ type: 'run', key: run.id, run })
    }
  }
  return groups
})
const todayUsage = computed(() => {
  const today = dateKey(new Date())
  return runs.value.filter(run => dateKey(run.createdAt) === today && run.aiCalled).reduce(
    (total, run) => ({ calls: total.calls + 1, input: total.input + Number(run.inputTokens || 0), output: total.output + Number(run.outputTokens || 0) }),
    { calls: 0, input: 0, output: 0 }
  )
})
const GUARD_LABELS = { MAX_ORDER_AMOUNT: '주문한도 초과', DAILY_LIMIT: '오늘 신규 매수 체결 건수 한도', SYMBOL_COOLDOWN: '같은 종목 재주문 대기중(최근 주문 있음)', MARKET_CLOSED: '장외 시간', INSUFFICIENT_DEPOSIT: '예수금 부족', MAX_BUY_BUDGET: '매수 비율 한도 초과', DAILY_LOSS_LIMIT: '일일 손실 한도' }
const guardText = (flags) => (flags || '').split(',').filter(Boolean).map((f) => GUARD_LABELS[f] || f).join(', ')
const PROPOSAL_STATUS_LABELS = {
  PROPOSED: '주문 제안됨',
  APPROVED: '주문 승인됨',
  REJECTED: '주문 거절됨',
  ORDER_DRAFT: '주문 초안 생성됨',
  ORDERED: '주문 전송됨',
  PARTIALLY_FILLED: '일부 체결됨',
  CANCEL_REQUESTED: '주문 취소 요청됨',
  FILLED: '전량 체결됨',
  CANCELED: '주문 취소됨',
  ORDER_FAILED: '주문 전송 실패',
  ORDER_UNKNOWN: '주문 상태 확인 필요'
}
const RUN_STATUS_LABELS = {
  SUCCESS: '판단 완료',
  FAILED: '판단 실패',
  PARSE_FAILED: '응답 해석 실패',
  BLOCKED: '안전 규칙으로 차단됨',
  SKIPPED: '판단 건너뜀'
}
const ACTION_LABELS = { BUY: '매수', SELL: '매도', HOLD: '보유' }
const TRIGGER_LABELS = { MANUAL: '수동 실행', SCHEDULE: '자동 실행', RISK: '위험 관리' }
const proposalStatusLabel = (status) => PROPOSAL_STATUS_LABELS[status] || status
const runStatusLabel = (status) => RUN_STATUS_LABELS[status] || status
const actionLabel = (action) => ACTION_LABELS[action] || action
const actionDisplayLabel = (proposal) => actionLabel(proposal.action)
const triggerLabel = (trigger) => TRIGGER_LABELS[trigger] || trigger
// 상태 배지 색상 분류: 진행 중(neutral) · 완료(success) · 확인 필요(warn) · 실패(danger)
const STATUS_TONES = { PROPOSED: 'neutral', APPROVED: 'neutral', ORDER_DRAFT: 'neutral', ORDERED: 'success', PARTIALLY_FILLED: 'success', FILLED: 'success', CANCEL_REQUESTED: 'warn', CANCELED: 'warn', ORDER_UNKNOWN: 'warn', REJECTED: 'danger', ORDER_FAILED: 'danger' }
const statusTone = (status) => STATUS_TONES[status] || 'neutral'
// 상태 배지만으로 부족한, 새 정보가 있는 경우에만 상세 텍스트를 덧붙인다.
function statusDetail (proposal) {
  if (proposal.status === 'REJECTED') return `거절 사유: ${proposal.rejectionReason}`
  if (proposal.status === 'ORDER_FAILED') return `전송 실패: ${proposal.errorMessage}`
  if (proposal.status === 'CANCEL_REQUESTED') {
    return proposal.cancelReason
      ? `취소 사유: ${proposal.cancelReason} · 주문 상태 동기화 대기 중`
      : '주문 상태 동기화 대기 중'
  }
  if (proposal.status === 'CANCELED' && proposal.cancelReason) return `취소 사유: ${proposal.cancelReason}`
  return ''
}
function runSummaryText (run) {
  const parts = [date(run.createdAt), triggerLabel(run.triggeredBy), runStatusLabel(run.status)]
  if (run.proposals?.length) {
    const counts = ['BUY', 'SELL', 'HOLD']
      .map((action) => ({ action, count: run.proposals.filter((p) => p.action === action).length }))
      .filter((c) => c.count > 0)
      .map((c) => `${actionLabel(c.action)} ${c.count}`)
      .join(' · ')
    parts.push(`제안 ${run.proposals.length}건 (${counts})`)
  }
  return parts.join(' · ')
}
async function load () { loading.value = true; try { const [universe, history, strategyConfig, holdings] = await Promise.all([fetchStrategyUniverse(), fetchStrategyRuns(50), fetchStrategyConfig(), fetchAccountHoldings()]); candidates.value = universe.data; runs.value = history.data; config.value = strategyConfig.data; brokerHoldings.value = holdings.data; autoExpandLatestRun() } catch (e) { error.value = e.response?.data?.message || '전략 데이터를 불러오지 못했습니다.' } finally { loading.value = false } }
async function loadOperations () { try { operations.value = (await fetchStrategyHealth()).data } catch { /* 운영 상태 조회 실패는 기존 전략 기능을 막지 않는다. */ } }
// 버튼 title 툴팁에도 그대로 재사용해 확인 문구와 설명이 어긋나지 않게 한다.
const DECIDE_NOW_HINT = '현재 시세와 보유 종목으로 즉시 재판단할까요? 자동매매가 활성화되어 있으면 안전 검사를 통과한 주문은 자동 전송됩니다.'
const SYNC_ORDERS_HINT = '키움 서버에 전송한 주문의 체결·취소 상태를 다시 조회해 반영합니다.'
const STRATEGY_SETTINGS_HINT = '자동매매 조건(신뢰도 기준, 주문 한도, 손절·익절 등)을 설정합니다.'
const RISK_LOOP_HINT = '가격이 익절·손절 조건에 도달하면 자동으로 매도 주문을 요청합니다.'
async function decideNow () { if (!window.confirm(DECIDE_NOW_HINT)) return; pending.value = true; error.value = ''; try { await runStrategyDecision(); await Promise.all([load(), loadOperations()]) } catch (e) { error.value = e.response?.data?.message || '즉시 재판단에 실패했습니다.' } finally { pending.value = false } }
async function syncOrders () { pending.value = true; error.value = ''; try { const { data } = await syncStrategyOrders(); if (data.updated > 0) await load(); else error.value = data.message } catch (e) { error.value = e.response?.data?.message || '주문 상태 동기화에 실패했습니다.' } finally { pending.value = false } }
// 실계좌 시장가 매도라 되돌릴 수 없다. 확인 문구에 대상 종목과 수량을 그대로 적어 오조작을 막는다.
async function runLiquidation (stockCodes, question) {
  if (!window.confirm(question)) return
  pending.value = true; error.value = ''; liquidationMessage.value = ''; liquidationFailed.value = false
  try {
    const { data } = await liquidateHoldings(stockCodes)
    const items = data.items || []
    liquidationFailed.value = items.some((item) => item.status === 'FAILED')
    liquidationMessage.value = [data.message, ...items.map((item) => `${item.stockName}: ${item.message}`)].join(' · ')
    await load()
  } catch (e) {
    liquidationFailed.value = true
    liquidationMessage.value = e.response?.data?.message || '청산 요청에 실패했습니다.'
  } finally { pending.value = false }
}
async function liquidateAll () {
  const shares = brokerHoldings.value.reduce((sum, holding) => sum + Number(holding.quantity || 0), 0)
  await runLiquidation([], `보유 ${brokerHoldings.value.length}종목 ${shares.toLocaleString()}주 전부를 시장가로 매도합니다. 되돌릴 수 없습니다. 진행할까요?`)
}
async function liquidateOne (holding) {
  await runLiquidation([holding.stockCode], `${holding.stockName}(${holding.stockCode}) ${Number(holding.quantity).toLocaleString()}주를 시장가로 매도합니다. 되돌릴 수 없습니다. 진행할까요?`)
}
const DAILY_LOSS_RESET_HINT = '오늘의 일일 손실 차단을 해제할까요? 현재 자산을 오늘의 새 기준점으로 저장하며, 이후 신규 매수가 다시 가능해집니다.'
async function resetDailyLossGuard () { if (!window.confirm(DAILY_LOSS_RESET_HINT)) return; pending.value = true; error.value = ''; try { await requestDailyLossReset(); await loadOperations() } catch (e) { error.value = e.response?.data?.message || '일일 손실 차단 해제에 실패했습니다.' } finally { pending.value = false } }
async function onSettingsSaved (result = {}) {
  showSettings.value = false
  settingsMessage.value = [result.applyMessage, result.dailyLossApplyMessage].filter(Boolean).join(' · ') || '새 설정을 저장했습니다.'
  await load()
  await loadOperations()
}
onMounted(async () => { await load(); await loadOperations() })
</script>

<!-- .change-badge 색상 클래스는 전역 stock.css에 정의됨 (Top10Panel.vue와 동일 패턴) -->
<style src="@/assets/css/stock.css" scoped></style>
<style scoped>
.strategy-panel{margin:14px 0;color:var(--text-primary);background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;padding:18px}.panel-card{margin-bottom:14px;padding:14px 16px;border:1px solid var(--card-border);border-radius:10px;background:rgba(255,255,255,.02)}.panel-card-head{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:10px}.panel-card-head h3{margin:0;font-size:1rem}.status-chips{display:flex;flex-wrap:wrap;gap:6px}.status-chip{background:#30343a;color:#d9dce0;border-radius:99px;padding:4px 9px;font-size:.75rem;font-weight:700}.status-chip.on{background:#1f3a2a;color:#9fe2b8}.status-chip.stopped{background:#5a2323;color:#ff9c9c}.panel-card-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.risk-strip{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--card-border);border-radius:10px;font-size:.78rem}.risk-strip small{color:var(--text-muted)}.risk-strip button{margin-left:auto;padding:4px 8px;font-size:.75rem}.risk-triggered{background:#5a2323;color:#ffb4b4;border-radius:99px;padding:4px 9px;font-weight:700}.risk-loop{background:#30343a;color:#d9dce0;border-radius:99px;padding:4px 9px}.risk-loop.on{background:#1f3a2a;color:#9fe2b8}.strategy-panel button{cursor:pointer;border:1px solid var(--card-border-strong);border-radius:8px;padding:7px 10px;background:transparent;color:var(--text-primary)}.strategy-panel button:disabled{opacity:.5;cursor:not-allowed}.reassess-now{border-color:#7760cc!important;background:#5a48ae!important;color:#fff!important;font-weight:700}.notice,.error{padding:10px;border-radius:8px;font-size:.82rem}.notice{background:#3c3424;color:#f2ce8b}.error{margin-bottom:14px;background:#482424;color:#ffb4b4}.broker-holdings{margin:0 0 12px;padding:10px;border:1px solid #31516f;border-radius:10px;background:#1b2938}.broker-holdings-title{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:.78rem}.candidate-list{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0}.candidate-chip{display:inline-flex;align-items:center;gap:5px;background:#1f2924;border-radius:99px;font-size:.77rem;padding:5px 9px}.empty{color:var(--text-muted)}.runs{margin-top:15px}.run-date-divider{display:flex;align-items:center;gap:8px;margin:14px 0 4px}.run-date-divider span{font-size:.72rem;font-weight:800;color:var(--accent);letter-spacing:.05em;background:var(--card-bg);white-space:nowrap}.run-date-divider::after{content:"";flex:1;height:1px;background:var(--card-border)}.run-skipped-group{border-top:1px solid var(--card-border);padding:8px 0;margin:0;color:var(--text-muted);font-size:.76rem}.runs p{font-size:.84rem;margin:7px 0}.run-card{border-top:1px solid var(--card-border);padding:10px 0}.run-summary{display:flex;align-items:center;gap:8px;width:100%;padding:6px 2px!important;border:none!important;border-radius:6px;background:transparent!important;color:var(--text-primary)!important;text-align:left;font-size:.82rem;cursor:pointer}.run-summary:hover{background:rgba(255,255,255,.04)!important}.run-chevron{display:inline-block;color:var(--text-muted);transition:transform .15s;flex-shrink:0}.run-card.expanded .run-chevron{transform:rotate(90deg)}.run-detail{padding:6px 4px 4px 22px}.run-detail>p{font-size:.84rem;margin:0 0 8px;color:var(--text-secondary)}.proposals-grid{display:flex;flex-direction:column;gap:8px}.proposal-card{border:1px solid var(--card-border);border-radius:8px;padding:9px 10px;font-size:.78rem}.proposal-primary{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.proposal-name small{color:var(--text-muted)}.proposal-secondary{margin:6px 0 0;color:var(--text-secondary);opacity:.85;font-size:.78rem;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden}.status-detail{display:block;margin-top:4px;color:var(--text-muted)}.guards{display:block;margin-top:4px;color:#ffd597}.action-badge{border-radius:99px;padding:3px 9px;font-weight:700;font-size:.72rem}.action-badge.BUY{background:#4a2626;color:#ffbab4}.action-badge.SELL{background:#213853;color:#b9d7ff}.action-badge.HOLD{background:#30343a;color:#d9dce0}.status-badge{margin-left:auto;border-radius:99px;padding:3px 9px;font-size:.72rem;font-weight:700}.status-badge.success{background:#1f3a2a;color:#9fe2b8}.status-badge.neutral{background:#30343a;color:#d9dce0}.status-badge.warn{background:#4b321c;color:#ffd597}.status-badge.danger{background:#4d211f;color:#ffb9b3}.daily-loss-reset{margin-left:0!important;border-color:#b87931!important;background:#4b321c!important;color:#ffd597!important;font-weight:700}.settings-applied{padding:9px 10px;border:1px solid #32694b;border-radius:8px;background:#183c2a;color:#a9e8c2;font-size:.8rem}.usage-summary{margin:10px 0 0;color:var(--text-muted);font-size:.74rem}.liquidate-all{margin-left:auto;padding:5px 9px!important;font-size:.75rem;border-color:#a34a45!important;background:#4d211f!important;color:#ffb9b3!important;font-weight:700}.liquidate-one{margin-top:4px;padding:3px 6px!important;font-size:.7rem;border-color:#7d4340!important;background:#3c1f1e!important;color:#f0aca6!important}.liquidation-result{margin:8px 0 0;padding:8px 10px;border:1px solid #32694b;border-radius:8px;background:#183c2a;color:#a9e8c2;font-size:.76rem;word-break:break-word}.liquidation-result.failed{border-color:#7a3a3a;background:#3d1f1f;color:#ffb4b4}@media (max-width:640px){.strategy-panel{padding:14px}.panel-card{padding:12px}.panel-card-head{align-items:flex-start}.panel-card-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));width:100%}.panel-card-actions button{width:100%}.panel-card-actions .reassess-now{grid-column:1 / -1}.broker-holdings-title{flex-direction:column;align-items:stretch}.liquidate-all{margin-left:0;width:100%}}
</style>
