<template>
  <section class="strategy-panel">
    <div class="operations">
      <div class="operations-status">
        <span :class="{ stopped: operations.emergencyStopped }">{{ operations.emergencyStopped ? '긴급 중지 활성' : '운영 상태 정상' }}</span>
        <small>자동매매 제어</small>
      </div>
      <div class="operation-actions">
        <button
          class="reassess-now"
          :disabled="pending || operations.emergencyStopped"
          @click="decideNow"
        >
          지금 재판단
        </button>
        <button
          class="sync-orders"
          :disabled="pending"
          @click="syncOrders"
        >
          주문 상태 동기화
        </button>
        <button
          v-if="!operations.emergencyStopped"
          class="emergency-action"
          :disabled="pending"
          @click="emergencyStop"
        >
          긴급 중지
        </button>
        <button
          v-else
          class="resume-action"
          :disabled="pending"
          @click="emergencyResume"
        >
          긴급 중지 해제
        </button>
      </div>
    </div>
    <header>
      <div><small>KIWOOM STRATEGY</small><h3>AI 전략 제안 <em>{{ config.orderEnabled ? 'ORDER ENABLED' : 'ORDER DISABLED' }}</em></h3></div><div class="header-actions">
        <button
          :disabled="pending"
          @click="showSettings = true"
        >
          전략 설정
        </button>
      </div>
    </header>
    <div
      v-if="operations.risk"
      class="risk-strip"
    >
      <span
        v-if="operations.risk.triggered"
        class="risk-triggered"
      >일일 손실 한도 발동 · 신규 매수 차단</span><span v-else-if="operations.risk.dailyLossLimitAmount > 0">일일 손실 {{ Number(operations.risk.drawdown).toLocaleString() }}원 / 한도 {{ Number(operations.risk.dailyLossLimitAmount).toLocaleString() }}원</span><span v-else>일일 손실 한도 미설정</span><span :class="['risk-loop', { on: operations.risk.riskLoopEnabled }]">손절·익절 루프 {{ operations.risk.riskLoopEnabled ? 'ON' : 'OFF' }}</span><small v-if="operations.risk.lastScanAt">마지막 스캔 {{ date(operations.risk.lastScanAt) }}</small>
    </div>
    <p class="notice">
      {{ config.autoExecute ? `완전 자동매매 활성: 예약 판단에서 신뢰도 ${config.autoExecuteMinConfidence}% 이상인 제안을 안전 검사 후 자동 전송합니다.` : '자동 주문 전송이 꺼져 있습니다. 전략 설정에서 켜야 완전 자동매매가 시작됩니다.' }}
    </p>
    <section class="broker-holdings">
      <div class="broker-holdings-title">
        <b>키움 실계좌 보유현황</b><small>자동매매 기준 · {{ brokerHoldings.length ? `마지막 동기화 ${date(brokerHoldings[0].syncedAt)}` : '아직 동기화된 보유종목 없음' }}</small>
      </div>
      <div
        v-if="brokerHoldings.length"
        class="broker-holding-list"
      >
        <span
          v-for="holding in brokerHoldings"
          :key="holding.stockCode"
          class="broker-holding"
        ><b>{{ holding.stockName }} · {{ holding.stockCode }}</b><small>보유 {{ Number(holding.quantity).toLocaleString() }}주 / 매도가능 {{ Number(holding.sellableQuantity).toLocaleString() }}주</small><small>평단 {{ Number(holding.averagePrice).toLocaleString() }}원</small></span>
      </div>
    </section>
    <p
      v-if="error"
      class="error"
    >
      {{ error }}
    </p>
    <p class="usage-summary">
      오늘 AI 호출 {{ todayUsage.calls }}회 · 추정 입력 {{ todayUsage.input.toLocaleString() }} / 출력 {{ todayUsage.output.toLocaleString() }} 토큰
    </p>
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
          <article v-else>
            <div class="run-meta">
              <b>{{ item.run.status }}</b><small>{{ date(item.run.createdAt) }} · {{ item.run.triggeredBy }}</small>
            </div><p>{{ item.run.marketView || item.run.errorMessage || '생성된 제안이 없습니다.' }}</p><div class="proposals">
              <div
                v-for="proposal in item.run.proposals"
                :key="proposal.id"
                :class="['proposal', proposal.action]"
              >
                <b>{{ proposal.action }}</b><span>{{ proposal.stockName }} ({{ proposal.stockCode }})</span><span v-if="proposal.quantity">{{ proposal.quantity.toLocaleString() }}주</span><span v-if="proposal.limitPrice">{{ proposal.limitPrice.toLocaleString() }}원</span><small>{{ proposal.confidence }}% · {{ proposal.reason }}</small><small
                  v-if="proposal.guardFlags"
                  class="guards"
                >안전 경고: {{ guardText(proposal.guardFlags) }}</small><small>상태: {{ proposal.status }}</small><small v-if="proposal.status === 'ORDERED'">주문 전송됨</small><small v-if="proposal.status === 'CANCEL_REQUESTED'">취소 요청됨 · 주문 상태 동기화 대기 중</small><small v-if="proposal.status === 'CANCELED'">주문 취소됨</small><small v-if="proposal.status === 'REJECTED'">거절됨 · {{ proposal.rejectionReason }}</small><small v-if="proposal.status === 'ORDER_FAILED'">전송 실패: {{ proposal.errorMessage }}</small>
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
import axios from '@/axios'
import KiwoomStrategySettingsModal from '@/components/stock/KiwoomStrategySettingsModal.vue'
import { useStockFormatters } from '@/composables/useStockFormatters'
defineProps({ configured: Boolean })
const { formatChangePct, changeClass } = useStockFormatters()
const candidates = ref([]), runs = ref([]), brokerHoldings = ref([])
const config = ref({ orderEnabled: false, autoExecute: false, autoExecuteMinConfidence: 85 }), operations = ref({ emergencyStopped: false }), pending = ref(false), loading = ref(false), error = ref(''), showSettings = ref(false)
const date = (value) => value ? new Date(value).toLocaleString('ko-KR', { hour12: false }) : ''
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
const GUARD_LABELS = { MAX_ORDER_AMOUNT: '주문한도 초과', DAILY_LIMIT: '일일 제안 한도', SYMBOL_COOLDOWN: '재제안 쿨다운', MARKET_CLOSED: '장외 시간', INSUFFICIENT_DEPOSIT: '예수금 부족', MAX_BUY_BUDGET: '매수 비율 한도 초과', DAILY_LOSS_LIMIT: '일일 손실 한도' }
const guardText = (flags) => (flags || '').split(',').filter(Boolean).map((f) => GUARD_LABELS[f] || f).join(', ')
async function load () { loading.value = true; try { const [universe, history, strategyConfig, holdings] = await Promise.all([axios.get('/api/kiwoom/strategy/universe'), axios.get('/api/kiwoom/strategy/runs?limit=50'), axios.get('/api/kiwoom/strategy/config'), axios.get('/api/kiwoom/auto-trade/holdings')]); candidates.value = universe.data; runs.value = history.data; config.value = strategyConfig.data; brokerHoldings.value = holdings.data } catch (e) { error.value = e.response?.data?.message || '전략 데이터를 불러오지 못했습니다.' } finally { loading.value = false } }
async function loadOperations () { try { operations.value = (await axios.get('/api/kiwoom/strategy/health')).data } catch { /* 운영 상태 조회 실패는 기존 전략 기능을 막지 않는다. */ } }
async function emergencyStop () { if (!window.confirm('자동 판단과 주문 전송을 긴급 중지할까요?')) return; pending.value = true; try { await axios.post('/api/kiwoom/auto-trade/emergency-stop'); await loadOperations() } catch (e) { error.value = e.response?.data?.message || '긴급 중지에 실패했습니다.' } finally { pending.value = false } }
async function emergencyResume () { if (!window.confirm('긴급 중지를 해제할까요? 자동 판단은 별도로 다시 시작해야 합니다.')) return; pending.value = true; try { await axios.post('/api/kiwoom/auto-trade/emergency-resume'); await loadOperations() } catch (e) { error.value = e.response?.data?.message || '긴급 중지 해제에 실패했습니다.' } finally { pending.value = false } }
async function decideNow () { if (!window.confirm('현재 시세와 보유 종목으로 즉시 재판단할까요? 자동매매가 활성화되어 있으면 안전 검사를 통과한 주문은 자동 전송됩니다.')) return; pending.value = true; error.value = ''; try { await axios.post('/api/kiwoom/strategy/decide'); await Promise.all([load(), loadOperations()]) } catch (e) { error.value = e.response?.data?.message || '즉시 재판단에 실패했습니다.' } finally { pending.value = false } }
async function syncOrders () { pending.value = true; error.value = ''; try { const { data } = await axios.post('/api/kiwoom/strategy/orders/sync'); if (data.updated > 0) await load(); else error.value = data.message } catch (e) { error.value = e.response?.data?.message || '주문 상태 동기화에 실패했습니다.' } finally { pending.value = false } }
async function onSettingsSaved () { showSettings.value = false; await load(); await loadOperations() }
onMounted(async () => { await load(); await loadOperations() })
</script>

<style scoped>
.strategy-panel{margin:14px 0;color:var(--text-primary);background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;padding:18px}.operations{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;padding:10px 12px;border:1px solid var(--card-border);border-radius:10px;background:rgba(255,255,255,.02)}.operations-status{display:flex;align-items:baseline;gap:8px;min-width:0}.operations-status span{font-weight:700}.operations-status span.stopped{color:#ff9c9c}.operations-status small{color:var(--text-muted);font-size:.75rem}.operation-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:7px}.header-actions{display:flex;gap:6px;flex-shrink:0}.risk-strip{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:8px 0;padding:8px 10px;border:1px solid var(--card-border);border-radius:10px;font-size:.78rem}.risk-strip small{color:var(--text-muted)}.risk-strip button{margin-left:auto;padding:4px 8px;font-size:.75rem}.risk-triggered{background:#5a2323;color:#ffb4b4;border-radius:99px;padding:4px 9px;font-weight:700}.risk-loop{background:#30343a;color:#d9dce0;border-radius:99px;padding:4px 9px}.risk-loop.on{background:#1f3a2a;color:#9fe2b8}.strategy-panel header{display:flex;align-items:center;justify-content:space-between}.strategy-panel h3{margin:4px 0}.strategy-panel header small{color:var(--accent);font-weight:800;letter-spacing:.1em}.strategy-panel em{font-style:normal;color:#e9b664;font-size:.7rem;margin-left:6px}.strategy-panel button{cursor:pointer;border:1px solid var(--card-border-strong);border-radius:8px;padding:7px 10px;background:transparent;color:var(--text-primary)}.strategy-panel button:disabled{opacity:.5;cursor:not-allowed}.reassess-now{border-color:#7760cc!important;background:#5a48ae!important;color:#fff!important;font-weight:700}.emergency-action{border-color:#8b4848!important;color:#ffb0b0!important}.resume-action{border-color:#417a68!important;color:#9fe2b8!important}.notice,.error{padding:10px;border-radius:8px;font-size:.82rem}.notice{background:#3c3424;color:#f2ce8b}.error{background:#482424;color:#ffb4b4}.broker-holdings{margin:12px 0;padding:10px;border:1px solid #31516f;border-radius:10px;background:#1b2938}.broker-holdings-title{display:flex;justify-content:space-between;gap:8px;font-size:.78rem}.broker-holdings-title small{color:#9ab5cd}.broker-holding-list{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px}.broker-holding{display:flex;flex-direction:column;gap:2px;padding:7px 8px;border-radius:7px;background:#243d55;font-size:.74rem}.broker-holding small{color:#c4d7e8}.candidate-list{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0}.candidate-chip{display:inline-flex;align-items:center;gap:5px;background:#1f2924;border-radius:99px;font-size:.77rem;padding:5px 9px}.empty{color:var(--text-muted)}.runs{margin-top:15px}.run-date-divider{display:flex;align-items:center;gap:8px;margin:14px 0 4px}.run-date-divider span{font-size:.72rem;font-weight:800;color:var(--accent);letter-spacing:.05em;background:var(--card-bg);white-space:nowrap}.run-date-divider::after{content:"";flex:1;height:1px;background:var(--card-border)}.runs article{border-top:1px solid var(--card-border);padding:12px 0}.run-skipped-group{border-top:1px solid var(--card-border);padding:8px 0;margin:0;color:var(--text-muted);font-size:.76rem}.run-meta{display:flex;gap:8px;align-items:center}.run-meta b{font-size:.7rem;background:#303a34;padding:3px 6px;border-radius:5px}.run-meta small{color:var(--text-muted)}.runs p{font-size:.84rem;margin:7px 0}.proposals{display:flex;flex-wrap:wrap;gap:7px}.proposal{border-radius:8px;padding:7px;font-size:.76rem;display:flex;gap:5px;flex-wrap:wrap}.proposal small{width:100%;opacity:.8}.proposal.BUY{background:#4a2626;color:#ffbab4}.proposal.SELL{background:#213853;color:#b9d7ff}.proposal.HOLD{background:#30343a;color:#d9dce0}.workflow-actions{display:flex;gap:5px;width:100%;margin-top:4px}.workflow-actions button{padding:4px 6px;font-size:.75rem}@media (max-width:640px){.strategy-panel{padding:14px}.operations{align-items:stretch;flex-direction:column}.operations-status{justify-content:space-between}.operation-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));width:100%}.operation-actions button{width:100%}.operation-actions .reassess-now{grid-column:1 / -1}.strategy-panel header{align-items:flex-start;gap:10px}.broker-holdings-title{align-items:flex-start;flex-direction:column}.broker-holding{flex:1;min-width:132px}}
</style>

<!-- .change-badge 색상 클래스는 전역 stock.css에 정의됨 (Top10Panel.vue와 동일 패턴) -->
<style src="@/assets/css/stock.css" scoped></style>
