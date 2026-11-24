<template>
  <section
    class="paper-panel"
    aria-labelledby="paper-title"
  >
    <header class="paper-header">
      <div>
        <span class="paper-label">PAPER ONLY · 가상 자금</span>
        <h2 id="paper-title">
          미국 모의매매
        </h2>
        <p>실제 주문 없이 시세를 관찰하고 가상 거래를 기록합니다.</p>
      </div>
      <span class="paper-badge">실계좌 연결 없음</span>
    </header>

    <p class="paper-notice">
      연구용 SPY 200일 이동평균 전략 · 최대 목표 비중 80% · 수익성 미검증
    </p>
    <div
      v-if="error"
      class="paper-error"
      role="alert"
    >
      <strong>{{ error }}</strong>
      <p v-if="session">
        아래 수치는 마지막으로 확인한 값입니다. 상태를 다시 확인하기 전에는 시작할 수 없습니다.
      </p>
      <button
        type="button"
        :disabled="busy || loading"
        @click="refresh(true)"
      >
        연결 다시 확인
      </button>
    </div>

    <div class="paper-card paper-setup">
      <div class="paper-session-picker">
        <label for="paper-session">운용 기록</label>
        <select
          id="paper-session"
          v-model="selectedId"
          :disabled="busy || loading"
          @change="chooseSession"
        >
          <option value="">
            세션을 선택하세요
          </option>
          <option
            v-for="item in sessions"
            :key="item.id"
            :value="String(item.id)"
          >
            #{{ item.id }} · {{ stateLabel(item.state) }} · {{ money(item.initialCashUsd) }}
          </option>
        </select>
        <p>중지 후 재개해도 가상 잔고·거래·고점 기록을 유지합니다.</p>
      </div>
      <form
        class="paper-create"
        @submit.prevent="createSession"
      >
        <label for="paper-capital">새 세션의 가상 시작 자금 (USD)</label>
        <div class="paper-inline">
          <input
            id="paper-capital"
            v-model="initialCash"
            type="number"
            min="100"
            max="100000000"
            step="0.01"
            required
            :disabled="busy"
          >
          <button
            type="submit"
            :disabled="busy || !connected || !validCash"
          >
            새 가상 세션 만들기
          </button>
        </div>
        <p>기존 기록을 초기화하지 않고 별도 세션을 만듭니다. 실제 입금은 없습니다.</p>
      </form>
    </div>

    <p
      v-if="loading && !session"
      role="status"
    >
      모의매매 상태를 확인하고 있습니다…
    </p>
    <div
      v-else-if="!session && !error"
      class="paper-empty"
    >
      아직 선택한 가상 세션이 없습니다. 시작 자금을 정해 새 세션을 만드세요.
    </div>

    <template v-if="session">
      <div class="paper-card paper-controls">
        <div class="paper-state">
          <span :class="['paper-state-tag', { locked: session.hardLatched }]">{{ stateLabel(session.state) }}</span>
          <span>세션 #{{ session.id }}</span>
          <span>{{ session.schedulerEnabled ? '서버 자동 시세 확인 켜짐' : '서버 자동 시세 확인 꺼짐' }}</span>
        </div>
        <div class="paper-actions">
          <button
            v-if="session.state !== 'RUNNING'"
            type="button"
            class="paper-primary"
            :disabled="!canStart"
            @click="act('start')"
          >
            {{ session.state === 'STOPPED' ? '모의매매 재개' : '모의매매 시작' }}
          </button>
          <button
            v-if="session.state === 'RUNNING'"
            type="button"
            class="paper-stop"
            :disabled="busy"
            @click="act('stop')"
          >
            모의매매 중지
          </button>
          <button
            type="button"
            :disabled="busy || loading"
            @click="act('poll')"
          >
            시세 확인·모의 처리
          </button>
          <button
            type="button"
            :disabled="busy || loading"
            @click="refresh(false)"
          >
            상태 새로고침
          </button>
        </div>
        <p
          v-if="busy"
          role="status"
        >
          요청을 처리하고 있습니다…
        </p>
        <p
          v-if="session.hardLatched"
          class="paper-warning"
          role="status"
        >
          10% 손실 중단 잠금입니다. 이 세션은 재개하거나 고점을 초기화할 수 없습니다. {{ session.liquidationPending ? '유효 시세에서 가상 청산을 기다립니다.' : '' }}
        </p>
        <p v-else>
          중지는 모든 가상 체결을 멈춥니다. {{ session.schedulerEnabled ? '브라우저를 닫아도 모의 서버가 실행 중이면 기록을 이어갑니다.' : '상시 운용하려면 모의 전용 서버의 자동 시세 확인이 필요합니다.' }}
        </p>
      </div>

      <div class="paper-grid">
        <dl class="paper-card">
          <dt>가상 총자산</dt><dd>{{ money(session.equityUsd) }}</dd><small>현금 + SPY 평가액</small>
        </dl>
        <dl class="paper-card">
          <dt>가상 주문 가능 현금</dt><dd>{{ money(session.cashUsd) }}</dd><small>매수 비용 포함 현금의 99% 이내</small>
        </dl>
        <dl class="paper-card">
          <dt>계좌 고점 대비 하락</dt><dd :class="{ negative: Number(session.drawdownPercent) >= 6 }">
            {{ percent(session.drawdownPercent) }}
          </dd><small>차단 기준 10% · 고점 {{ money(session.peakEquityUsd) }}</small>
        </dl>
        <dl class="paper-card">
          <dt>관측 최대낙폭</dt><dd>{{ percent(session.maxDrawdownPercent) }}</dd><small>갭·체결 시차로 실제 낙폭은 10%를 넘을 수 있습니다.</small>
        </dl>
      </div>

      <div class="paper-card paper-feed">
        <div class="paper-section-heading">
          <h3>시세와 대기 사유</h3><span>{{ session.marketOpen ? '미국 정규장' : '정규장 외 · 체결 대기' }}</span>
        </div>
        <p
          class="paper-reason"
          role="status"
        >
          {{ session.message || session.reason || '다음 시세를 기다립니다.' }}
        </p>
        <dl class="paper-feed-grid">
          <div><dt>시세 상태</dt><dd>{{ session.quoteFresh ? '유효 시세' : '미확인 또는 오래된 시세 · 체결 차단' }}</dd></div>
          <div><dt>SPY 가격</dt><dd>{{ money(session.lastPriceUsd) }}</dd></div>
          <div><dt>시세 기준 시각</dt><dd>{{ time(session.quotedAt) }}</dd></div>
          <div><dt>서버 관측 시각</dt><dd>{{ time(session.observedAt) }}</dd></div>
        </dl>
        <p class="paper-muted">
          {{ session.source || '공개 시세' }} · 지연될 수 있습니다. 최신 화면 확인: {{ time(lastReceivedAt) }}
        </p>
        <p class="paper-muted">
          편도 수수료 {{ session.feeBps }}bp + 불리한 슬리피지 {{ session.slippageBps }}bp · 정수 주식 모의 체결
        </p>
      </div>

      <div class="paper-card">
        <h3>S&amp;P 500 대용 지표와 비교</h3>
        <p class="paper-muted">
          {{ session.benchmarkLabel || 'SPY 가격수익률 대용 · 배당 미포함' }} · S&amp;P 500 총수익지수 직접 비교가 아닙니다.
        </p>
        <div class="paper-return-grid">
          <dl>
            <dt>모의 전략 · 비용 반영</dt><dd :class="returnClass(session.strategyReturnPercent)">
              {{ percent(session.strategyReturnPercent, true) }}
            </dd>
          </dl>
          <dl><dt>SPY 가격수익률</dt><dd>{{ percent(session.benchmarkReturnPercent, true) }}</dd></dl>
          <dl>
            <dt>대용 지표 대비 차이</dt><dd :class="returnClass(session.excessReturnPoints)">
              {{ points(session.excessReturnPoints) }}
            </dd>
          </dl>
        </div>
        <figure
          v-if="chart"
          class="paper-chart"
        >
          <svg
            viewBox="0 0 640 180"
            role="img"
            aria-label="최근 기록의 모의 전략과 SPY 가격수익률 추이"
          >
            <line
              x1="12"
              :y1="chart.zero"
              x2="628"
              :y2="chart.zero"
              class="paper-chart-zero"
            />
            <polyline
              :points="chart.strategy"
              class="paper-chart-strategy"
            />
            <polyline
              :points="chart.benchmark"
              class="paper-chart-benchmark"
            />
          </svg>
          <figcaption><span class="strategy-key">━ 모의 전략</span><span class="benchmark-key">┅ SPY 가격</span>최근 {{ session.history.length }}개 평가 기록 · {{ time(chart.first) }} ~ {{ time(chart.last) }}</figcaption>
        </figure>
        <p
          v-else
          class="paper-empty"
        >
          비교 가능한 시세 기록이 두 개 이상 쌓이면 추이를 표시합니다. 기준 시세가 없으면 수익률은 —로 표시됩니다.
        </p>
      </div>

      <div class="paper-card">
        <h3>가상 보유</h3>
        <p v-if="Number(session.quantity) > 0">
          {{ session.symbol }} <strong>{{ session.quantity }}주</strong> · 평가액 {{ money(holdingValue) }}
        </p>
        <p v-else>
          보유 주식 없음 · 가상 현금으로 대기 중
        </p>
      </div>
      <div class="paper-card">
        <h3>최근 가상 체결</h3>
        <div
          v-if="session.fills?.length"
          class="paper-table-scroll"
          tabindex="0"
          aria-label="가상 체결 내역, 좌우 스크롤 가능"
        >
          <table>
            <caption>최근 최대 100건 · 실제 주문이 아닙니다</caption><thead><tr><th>시각</th><th>구분</th><th>종목 / 수량</th><th>체결가</th><th>수수료</th><th>사유</th></tr></thead><tbody>
              <tr
                v-for="fill in session.fills"
                :key="fill.id"
              >
                <td>{{ time(fill.at) }}</td><td>{{ fill.side === 'BUY' ? '가상 매수' : '가상 매도' }}</td><td>{{ fill.symbol }} / {{ fill.quantity }}주</td><td>{{ money(fill.priceUsd) }}</td><td>{{ money(fill.feeUsd) }}</td><td>{{ fill.reason }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p
          v-else
          class="paper-empty"
        >
          가상 체결이 없습니다. 정규장·신선한 시세·매매 신호 조건을 충족해야 기록됩니다.
        </p>
      </div>
      <details class="paper-card paper-events">
        <summary>운용·오류 기록 {{ session.events?.length || 0 }}건</summary>
        <ol v-if="session.events?.length">
          <li
            v-for="(event, index) in session.events"
            :key="`${event.at}-${index}`"
          >
            <time>{{ time(event.at) }}</time><strong>{{ event.type }}</strong><span>{{ event.message }}</span>
          </li>
        </ol>
        <p v-else>
          아직 기록이 없습니다.
        </p>
      </details>
    </template>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { usPaperTradingApi as api } from '@/api/usPaperTradingApi'
import { apiErrorMessage } from '@/utils/apiError'

const sessions = ref([]), session = ref(null), selectedId = ref(''), initialCash = ref('10000')
const loading = ref(false), busy = ref(false), connected = ref(false), error = ref(''), lastReceivedAt = ref(null)
let readController, actionController, sequence = 0, timer, disposed = false
const finite = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
const validCash = computed(() => finite(initialCash.value) && Number(initialCash.value) >= 100 && Number(initialCash.value) <= 100000000)
const canStart = computed(() => !busy.value && !loading.value && connected.value && !error.value && session.value?.paperOnly === true && ['CREATED', 'STOPPED'].includes(session.value?.state) && !session.value?.hardLatched)
const holdingValue = computed(() => finite(session.value?.lastPriceUsd) ? Number(session.value.quantity) * Number(session.value.lastPriceUsd) : null)
const money = value => finite(value) ? Number(value).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'
const percent = (value, signed = false) => finite(value) ? `${signed && Number(value) > 0 ? '+' : ''}${Number(value).toFixed(2)}%` : '—'
const points = value => finite(value) ? `${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(2)}%p` : '—'
const time = value => value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false }) + ' KST' : '—'
const stateLabel = state => ({ CREATED: '시작 전', RUNNING: '모의 운용 중', STOPPED: '중지됨', HARD: '손실 중단 잠금' }[state] || '상태 미확인')
const returnClass = value => finite(value) ? (Number(value) < 0 ? 'negative' : Number(value) > 0 ? 'positive' : '') : ''
const chart = computed(() => {
  const rows = [...(session.value?.history || [])].filter(row => finite(row.strategyReturnPercent) && finite(row.benchmarkReturnPercent)).sort((a, b) => new Date(a.at) - new Date(b.at))
  if (rows.length < 2) return null
  const values = rows.flatMap(row => [Number(row.strategyReturnPercent), Number(row.benchmarkReturnPercent)])
  const low = Math.min(0, ...values), high = Math.max(0, ...values), range = Math.max(high - low, 1)
  const y = value => 162 - (Number(value) - low) / range * 144
  const line = key => rows.map((row, index) => `${12 + index / (rows.length - 1) * 616},${y(row[key])}`).join(' ')
  return { strategy: line('strategyReturnPercent'), benchmark: line('benchmarkReturnPercent'), zero: y(0), first: rows[0].at, last: rows[rows.length - 1].at }
})

function acceptStatus(data) {
  if (!data || data.paperOnly !== true || data.id == null) throw new Error('모의 전용 응답을 확인할 수 없습니다.')
  session.value = data
  selectedId.value = String(data.id)
  const index = sessions.value.findIndex(item => String(item.id) === String(data.id))
  if (index < 0) sessions.value.unshift(data)
  else sessions.value.splice(index, 1, data)
  connected.value = true
  error.value = ''
  lastReceivedAt.value = new Date().toISOString()
}
function showError(err) {
  connected.value = false
  error.value = err?.response?.status === 404
    ? '모의매매 전용 서버가 준비되지 않았거나 선택한 세션을 찾을 수 없습니다.'
    : apiErrorMessage(err, '모의매매 요청을 완료하지 못했습니다.')
}
function cancelRead() { sequence++; readController?.abort(); readController = null; loading.value = false }
async function refresh(includeList = false) {
  if (disposed || busy.value || loading.value) return
  const current = ++sequence
  const controller = new AbortController(); readController = controller; loading.value = true
  try {
    if (includeList || !selectedId.value) {
      const { data } = await api.list(controller.signal)
      if (disposed || current !== sequence) return
      if (!Array.isArray(data) || data.some(item => item.paperOnly !== true)) throw new Error('모의 세션 목록 응답이 올바르지 않습니다.')
      sessions.value = data
      if (!selectedId.value && data.length) selectedId.value = String(data[0].id)
      connected.value = true; error.value = ''; lastReceivedAt.value = new Date().toISOString()
    }
    if (selectedId.value) {
      const { data } = await api.get(selectedId.value, controller.signal)
      if (!disposed && current === sequence) acceptStatus(data)
    }
  } catch (err) {
    if (!disposed && current === sequence && !controller.signal.aborted) showError(err)
  } finally {
    if (current === sequence) { loading.value = false; readController = null }
  }
}
function chooseSession() { cancelRead(); session.value = null; connected.value = false; refresh(false) }
async function mutate(operation) {
  if (disposed || busy.value) return
  cancelRead(); busy.value = true
  const controller = new AbortController(); actionController = controller
  try {
    const { data } = await operation(controller.signal)
    if (!disposed) acceptStatus(data)
  } catch (err) {
    if (!disposed && !controller.signal.aborted) showError(err)
  } finally { if (!disposed) busy.value = false; actionController = null }
}
function createSession() {
  if (!validCash.value || !connected.value) return
  return mutate(signal => api.create(Number(initialCash.value), signal))
}
async function act(kind) {
  if (!session.value || (kind === 'start' && !canStart.value)) return
  const id = session.value.id
  if (kind === 'start') {
    await refresh(false)
    if (!canStart.value || session.value?.id !== id) return
  }
  return mutate(signal => api[kind](id, signal))
}
onMounted(() => { refresh(true); timer = setInterval(() => refresh(false), 10000) })
onBeforeUnmount(() => { disposed = true; clearInterval(timer); cancelRead(); actionController?.abort() })
</script>

<style scoped>
.paper-panel { color: var(--text-primary); min-width: 0; display: grid; gap: 18px; }
.paper-header, .paper-section-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.paper-header h2 { margin: 6px 0 10px; font-size: 28px; }.paper-header p, .paper-muted, .paper-setup p, .paper-controls > p { color: var(--text-secondary); line-height: 1.65; font-size: 13px; }
.paper-label { color: var(--accent); font-size: 12px; letter-spacing: .1em; font-weight: 700; }.paper-badge { border: 1px solid var(--card-border-strong); border-radius: 20px; padding: 8px 14px; color: var(--accent-light); background: var(--accent-dim); }
.paper-notice { background: var(--surface-2); padding: 12px 16px; border-left: 3px solid var(--accent); font-size: 13px; line-height: 1.7; margin: 0; }
.paper-card { background: var(--surface); border: 1px solid var(--card-border-strong); border-radius:var(--radius-card); padding: 20px; margin: 0; min-width: 0; }
.paper-card h3 { margin: 0 0 12px; font-size: 17px; }.paper-card p { margin: 10px 0 0; }.paper-setup { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.paper-panel label { display: block; margin-bottom: 9px; font-size: 13px; font-weight: 700; }.paper-inline, .paper-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.paper-panel input, .paper-panel select, .paper-panel button { font: inherit; border: 1px solid var(--input-border); border-radius: 7px; min-height:var(--control-height); padding: 9px 12px; color: var(--text-primary); background: var(--surface-2); }
.paper-panel input { width: 155px; max-width: 100%; }.paper-panel select { width: 100%; }.paper-panel button { cursor: pointer; font-size: 13px; font-weight: 700; }.paper-panel button:disabled { opacity: .45; cursor: not-allowed; }
.paper-panel :focus-visible { outline: 2px solid var(--accent-light); outline-offset: 3px; }.paper-panel .paper-primary { background: var(--accent); color: var(--text-on-accent); }.paper-panel .paper-stop { border-color: #ef9a9a; color: #ffb6b6; }
.paper-state { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; color: var(--text-secondary); font-size: 13px; }.paper-state-tag { color: #b1e2ce; background: #18392e; padding: 6px 10px; border-radius: 6px; }.paper-state-tag.locked { color: #ffc1b8; background: #472623; }
.paper-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }.paper-grid dt, .paper-return-grid dt, .paper-feed-grid dt { font-size: 12px; color: var(--text-secondary); margin-bottom: 9px; }.paper-grid dd, .paper-return-grid dd { margin: 0; font-size: 24px; font-weight: 700; overflow-wrap: anywhere; }.paper-grid small { display: block; font-size: 11px; color: var(--text-secondary); margin-top: 9px; line-height: 1.6; }
.paper-feed-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 18px 0; }.paper-feed-grid dd { margin: 0; font-size: 13px; overflow-wrap: anywhere; }.paper-reason { line-height: 1.7; }.paper-return-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }.paper-return-grid dl { margin: 20px 0 8px; }
.paper-error { background: #402421; border: 1px solid #925c53; border-radius:var(--radius-control); padding: 18px; color: #ffe1da; line-height: 1.6; }.paper-warning, .negative { color: #ffb5ad !important; }.positive { color: #a8dfcd; }.paper-empty { color: var(--text-secondary); padding: 18px 0; line-height: 1.7; font-size: 13px; }
.paper-chart { margin: 20px 0 0; }.paper-chart svg { display: block; width: 100%; height: auto; background: var(--surface-2); border-radius:var(--radius-control); }.paper-chart-zero { stroke: var(--text-muted); opacity: .4; }.paper-chart-strategy, .paper-chart-benchmark { fill: none; stroke-width: 2.5; vector-effect: non-scaling-stroke; }.paper-chart-strategy { stroke: var(--accent-light); }.paper-chart-benchmark { stroke: #8eb8ee; stroke-dasharray: 5 4; }.paper-chart figcaption { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px; font-size: 11px; color: var(--text-secondary); line-height: 1.7; }.strategy-key { color: var(--accent-light); }.benchmark-key { color: #8eb8ee; }
.paper-table-scroll { overflow-x: auto; }.paper-panel table { border-collapse: collapse; width: 100%; min-width: 660px; font-size: 12px; }.paper-panel caption { text-align: left; padding: 0 0 12px; color: var(--text-secondary); }.paper-panel th, .paper-panel td { text-align: left; padding: 12px 9px; border-bottom: 1px solid var(--card-border); }.paper-panel th { color: var(--text-secondary); white-space: nowrap; }.paper-panel td:last-child { max-width: 220px; overflow-wrap: anywhere; }.paper-events summary { cursor: pointer; padding: 4px 0; }.paper-events ol { padding-left: 20px; }.paper-events li { padding: 12px 0; border-bottom: 1px solid var(--card-border); font-size: 12px; line-height: 1.8; }.paper-events li time, .paper-events li strong { display: block; color: var(--text-secondary); }
@media(max-width: 900px) { .paper-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }.paper-setup { grid-template-columns: 1fr; } }
@media(max-width: 520px) { .paper-card { padding: 16px; }.paper-header h2 { font-size: 24px; }.paper-grid { gap: 9px; }.paper-grid .paper-card { padding: 13px; }.paper-grid dd { font-size: 20px; }.paper-return-grid { grid-template-columns: 1fr; gap: 0; }.paper-return-grid dl { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 12px 0; }.paper-return-grid dt { margin: 0; }.paper-return-grid dd { font-size: 21px; }.paper-feed-grid { grid-template-columns: 1fr; }.paper-actions button { flex: 1 1 140px; }.paper-inline { align-items: stretch; }.paper-inline input { flex: 1 1 130px; width: 100%; }.paper-inline button { flex: 1 1 180px; } }

/* Shared finance control sizing; operational state colors are intentionally retained. */
button, summary { min-height: var(--control-height); }
button { border-radius: var(--radius-control); }
input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), select { min-height: var(--control-height); border-radius: var(--radius-control); }
</style>
