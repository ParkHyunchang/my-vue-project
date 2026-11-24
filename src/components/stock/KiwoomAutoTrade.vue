<template>
  <section class="auto-trade-panel">
    <header class="panel-header">
      <div><p>KIWOOM OPEN API</p><h3>국내주식 자동매매</h3><small>실계좌 주문 제어 및 실시간 체결 모니터</small></div><b class="live">실전 투자</b>
    </header>
    <p
      v-if="errorMessage"
      class="notice error"
    >
      {{ errorMessage }}
    </p>
    <p
      v-else-if="statusLoaded && !status.configured"
      class="notice"
    >
      서버 환경 변수에 <code>KIWOOM_APP_KEY</code>, <code>KIWOOM_SECRET_KEY</code>를 설정하면 연결할 수 있습니다.
    </p>
    <dl
      class="operation-overview"
      aria-label="자동매매 운영 상태"
    >
      <div><dt>자동주문</dt><dd>{{ !statusKnown || !status.configured ? '연결 확인 필요' : status.autoTrading ? '운용 중' : '중지 상태' }}</dd></div>
      <div><dt>주문 전송</dt><dd>{{ !statusKnown || !status.configured ? '확인 필요' : status.orderEnabled ? '허용' : '잠금' }}</dd></div>
      <div><dt>거래 시간</dt><dd>{{ !statusKnown || !status.configured ? '확인 필요' : status.marketOpen ? '정규장' : '정규장 외' }}</dd></div>
    </dl>
    <h4 class="operation-heading">
      운영 제어
    </h4>
    <div class="control-card">
      <div class="connection">
        <i :class="statusKnown && status.connected ? 'online' : ''" /><span><strong>{{ !statusKnown ? '연결 상태 확인 필요' : status.connected ? '키움 API 연결됨' : '키움 API 연결 대기' }}</strong><small>{{ !statusKnown ? '최근 상태를 다시 조회해 주세요' : status.tokenValid ? 'Access Token 정상' : 'Access Token 미발급 또는 만료' }}</small></span>
      </div><div class="actions">
        <div class="toggle-wrap">
          <button
            :class="{ running: status.autoTrading, primary: !status.autoTrading }"
            :disabled="pending"
            :title="toggleHint"
            @click="toggleAutoTrade"
          >
            {{ status.autoTrading ? '● 자동주문 완전 중지' : '○ 자동주문 시작' }}
          </button>
          <small class="toggle-hint">{{ toggleHint }}</small>
        </div><button
          :disabled="pending || !status.configured"
          title="키움 Access Token을 새로 발급받습니다."
          @click="refreshToken"
        >
          접속 토큰 갱신
        </button>
      </div>
    </div>
    <p
      class="operation-freshness"
      role="status"
    >
      운영 상태 마지막 확인: {{ timeLabel(statusCheckedAt) }} · {{ streamConnected ? '실시간 연결' : '실시간 연결 대기 · 30초마다 재조회' }}
      <button
        type="button"
        class="read-refresh"
        @click="refreshView(true)"
      >
        상태 다시 조회
      </button>
    </p>
    <p
      v-if="refreshError"
      class="notice error"
    >
      {{ refreshError }}
    </p>
    <p
      v-if="controlNotice"
      class="notice"
      role="status"
    >
      {{ controlNotice }}
    </p>
    <p
      v-if="statusKnown && !status.marketOpen"
      class="market-notice"
    >
      <strong>정규장 외 시세 표시 중</strong>{{ status.marketMessage }}
    </p>
    <p
      class="operation-freshness"
      role="status"
    >
      계좌 {{ accountError ? '조회 실패 · 이전 조회값은 참고용' : accountLoaded ? '조회 응답 확인' : '확인 전' }} · 마지막 확인: {{ timeLabel(accountCheckedAt) }}
      <span>— 표시는 미확인 금액이며 0원과 다릅니다.</span>
    </p>
    <section
      class="asset-summary"
      aria-label="계좌 자산 요약"
    >
      <article class="total-asset-card">
        <small>추정예탁자산</small>
        <strong>{{ formatWon(totalAsset) }}</strong>
        <p
          v-if="account.totalAssetChange !== null && account.totalAssetChange !== undefined"
          :class="['asset-change', changeTone(account.totalAssetChange)]"
        >
          전일 마감 대비 {{ formatSignedWon(account.totalAssetChange) }} ({{ formatPercent(account.totalAssetChangePercent) }})
        </p>
        <p>{{ account.totalAssetSource || '예수금과 보유주식 평가액 기준' }}</p>
      </article>
      <div class="summary-details">
        <article>
          <small>주문가능금액</small><strong>{{ formatWon(account.orderAvailable) }}</strong>
          <span class="summary-value-detail">증권사 제공 주문가능금액 · 미제공 시 확인 필요</span>
        </article>
        <article>
          <small>예수금</small><strong>{{ formatWon(account.deposit) }}</strong>
          <span class="summary-value-detail">D+1 {{ formatWon(account.d1Deposit) }} · D+2 {{ formatWon(account.d2Deposit) }}</span>
        </article>
        <article>
          <small>주식 평가금액</small><strong>{{ formatWon(account.totalEvaluation) }}</strong>
          <span :class="['summary-value-detail', changeTone(account.profitLoss)]">평가손익 {{ formatSignedWon(account.profitLoss) }} ({{ formatPercent(account.stockProfitRate) }})</span>
        </article>
      </div>
    </section>
    <section
      class="recent-operations"
      aria-label="최근 운영 이벤트"
    >
      <h4>최근 운영 이벤트</h4>
      <p
        v-for="log in logs.slice(-3).reverse()"
        :key="log.id"
      >
        <time>{{ log.time }}</time> {{ log.message }}
      </p>
      <p v-if="!logs.length">
        확인된 운영 이벤트가 없습니다. 마지막 상태 확인 시각을 함께 확인하세요.
      </p>
    </section>
    <KiwoomStrategyPanel
      :configured="status.configured"
      :status-known="statusKnown"
      :auto-trading="status.autoTrading"
      :price-ticks="priceTicks"
      :refresh-version="refreshVersion"
    />
    <details class="operation-details">
      <summary>실시간 시세 · 체결 로그 펼치기</summary>
      <section class="log-card">
        <header>
          <span>●</span> 실시간 시세 · 주문 체결 로그 <button @click="logs = []">
            지우기
          </button>
        </header><div
          ref="logElement"
          class="terminal"
        >
          <p
            v-if="!logs.length"
            class="empty"
          >
            연결 이벤트 및 자동 주문 체결 내역이 여기에 표시됩니다.
          </p><p
            v-for="log in logs"
            :key="log.id"
            :class="log.type"
          >
            <time>{{ log.time }}</time>{{ log.message }}
          </p>
        </div>
      </section>
    </details>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import axios from '@/axios'
import { apiErrorMessage } from '@/utils/apiError'
import KiwoomStrategyPanel from '@/components/stock/KiwoomStrategyPanel.vue'

// 토큰·계좌번호는 프론트에 저장하지 않습니다. 서버가 httpOnly 인증과 키움 토큰을 모두 관리합니다.
const status = ref({ configured: false, connected: false, tokenValid: false, autoTrading: false, orderEnabled: false, marketOpen: false, marketMessage: '', consecutiveApiFailures: 0 })
const account = ref({ totalAsset: null, totalAssetSource: '', totalAssetChange: null, totalAssetChangePercent: null, deposit: null, d1Deposit: null, d2Deposit: null, orderAvailable: null, profitLoss: null, stockProfitRate: null, totalEvaluation: null })
const logs = ref([]), pending = ref(false), errorMessage = ref(''), logElement = ref(null)
const priceTicks = ref({})
const refreshVersion = ref(0), controlNotice = ref('')
const statusLoaded = ref(false), statusError = ref(''), statusCheckedAt = ref(null)
const accountLoaded = ref(false), accountError = ref(''), accountCheckedAt = ref(null), streamConnected = ref(false)
const statusKnown = computed(() => statusLoaded.value && !statusError.value)
const refreshError = computed(() => [statusError.value, accountError.value].filter(Boolean).join(' · '))
const timeLabel = value => value ? new Date(value).toLocaleTimeString('ko-KR', { hour12: false }) : '확인 전'
const knownNumber = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
let eventSource, refreshTimer, eventTimer, refreshing, disposed = false
const totalAsset = computed(() => account.value.totalAsset)
const formatWon = value => knownNumber(value) ? `${Number(value).toLocaleString('ko-KR')}원` : '—'
const formatSignedWon = value => knownNumber(value) ? `${Number(value) > 0 ? '+' : ''}${formatWon(value)}` : '—'
const formatPercent = value => knownNumber(value) ? `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(2)}%` : '—'
const changeTone = (value) => Number(value) > 0 ? 'profit' : Number(value) < 0 ? 'loss' : ''
// 시작/중지 확인 문구와 버튼 아래 설명을 하나로 유지해 문구가 서로 어긋나지 않도록 한다.
const TOGGLE_ON_HINT = '자동주문을 시작할까요? 전략 설정의 자동 전송과 손절·익절 루프도 함께 켜고, 현재 보유종목의 청산 기준을 다시 계산합니다.'
const TOGGLE_OFF_HINT = '자동주문을 완전히 중지할까요? 신규 주문을 멈추고 시스템이 전송한 미체결 매수·매도 주문도 취소합니다.'
const toggleHint = computed(() => status.value.autoTrading ? TOGGLE_OFF_HINT : TOGGLE_ON_HINT)
function pushLog(type, message) { logs.value.push({ id: `${Date.now()}-${Math.random()}`, type, message, time: new Date().toLocaleTimeString('ko-KR', { hour12: false }) }); if (logs.value.length > 300) logs.value.shift(); nextTick(() => { if (logElement.value) logElement.value.scrollTop = logElement.value.scrollHeight }) }
async function refreshView(force = false) {
  if (refreshing) { await refreshing; if (!force || disposed) return }
  if (disposed) return
  refreshing = (async () => {
    try {
      const { data } = await axios.get('/api/kiwoom/auto-trade/status')
      if (disposed) return
      status.value = data
      statusLoaded.value = true; statusError.value = ''; statusCheckedAt.value = Date.now()
      refreshVersion.value++
      if (data.configured) {
        try {
          const response = await axios.get('/api/kiwoom/auto-trade/summary')
          if (disposed) return
          account.value = response.data
          accountLoaded.value = true; accountError.value = ''; accountCheckedAt.value = response.data.capturedAt || Date.now()
        } catch (e) { if (!disposed) accountError.value = apiErrorMessage(e, '계좌 조회에 실패했습니다.') }
      } else { accountError.value = '계좌 연결을 확인해 주세요.' }
    } catch (e) { if (!disposed) statusError.value = apiErrorMessage(e, '운영 상태 조회에 실패했습니다.') }
  })()
  try { await refreshing } finally { refreshing = null }
}
async function toggleAutoTrade() {
  if (pending.value) return
  const enabling = !status.value.autoTrading
  if (!window.confirm(enabling ? TOGGLE_ON_HINT : TOGGLE_OFF_HINT)) return
  pending.value = true; errorMessage.value = ''; controlNotice.value = ''
  try {
    const { data } = await axios.post('/api/kiwoom/auto-trade/control', { enabled: enabling })
    status.value.autoTrading = data.autoTrading
    if (data.autoTrading) controlNotice.value = data.exitManagementReady === false
      ? '자동주문은 켜졌지만 보유종목 청산 관리 준비가 완료되지 않았습니다. 운영 상태와 로그를 확인하세요.'
      : '자동주문을 시작하고 보유종목 청산 기준을 다시 계산했습니다.'
    else controlNotice.value = `자동주문을 중지했습니다. 미체결 자동주문 취소 요청 ${data.orderCancellationRequested || 0}건${data.orderCancellationFailed ? `, 취소 실패 ${data.orderCancellationFailed}건은 키움 주문을 확인하세요.` : '. 취소 완료는 주문 상태 동기화로 확인하세요.'}`
    pushLog(data.orderCancellationFailed || data.exitManagementReady === false ? 'error' : 'system', controlNotice.value)
  } catch (e) { errorMessage.value = e.response?.data?.message || '자동주문 상태 변경에 실패했습니다.' }
  finally { await refreshView(true); pending.value = false }
}
async function refreshToken() { if (pending.value) return; pending.value = true; errorMessage.value = ''; try { await axios.post('/api/kiwoom/auto-trade/token/refresh'); pushLog('system', '키움 Access Token을 갱신했습니다.') } catch (e) { errorMessage.value = e.response?.data?.message || '토큰 갱신에 실패했습니다.' } finally { await refreshView(true); pending.value = false } }
function connectEvents() { eventSource = new EventSource(`${process.env.VUE_APP_API_URL || ''}/api/kiwoom/auto-trade/events`, { withCredentials: true }); eventSource.addEventListener('kiwoom', e => { if (disposed) return; try { handleRealtimeEvent(JSON.parse(e.data)) } catch { /* ignore malformed event */ } }); eventSource.onopen = () => { streamConnected.value = true; refreshView() }; eventSource.onerror = () => { streamConnected.value = false; if (!disposed) pushLog('error', '실시간 로그 연결이 재시도 중입니다.') } }
function handleRealtimeEvent(data) {
  const price = Number(data?.price)
  if (data?.type === 'price' && data.stockCode && Number.isFinite(price) && price > 0) {
    priceTicks.value = { ...priceTicks.value, [data.stockCode]: { price, at: data.at } }
    return
  }
  pushLog(data?.type || 'market', data?.message || JSON.stringify(data))
  if (!eventTimer) eventTimer = setTimeout(() => { eventTimer = null; refreshView() }, 1500)
}
onMounted(async () => { await refreshView(); if (disposed) return; connectEvents(); refreshTimer = setInterval(() => refreshView(), 30000) })
onBeforeUnmount(() => { disposed = true; clearTimeout(eventTimer); clearInterval(refreshTimer); eventSource?.close() })
</script>

<style scoped>
.asset-change{margin:0 0 4px!important;font-size:.8rem!important;font-weight:700}.summary-value-detail{display:block;margin-top:5px;color:var(--text-muted);font-size:.7rem;line-height:1.4}.summary-value-detail.profit,.asset-change.profit{color:#e75e5e}.summary-value-detail.loss,.asset-change.loss{color:#6399f1}.asset-summary .summary-details{grid-template-columns:repeat(3,minmax(0,1fr))}@media(max-width:700px){.asset-summary .summary-details{grid-template-columns:repeat(2,minmax(0,1fr))}}
.market-notice{margin:0 0 14px;padding:10px 13px;border:1px solid #6b5a27;border-radius:var(--radius-control);background:#342d1b;color:#dfcf91;font-size:.78rem;line-height:1.55}.market-notice strong{margin-right:8px;color:#ffe08a}
.asset-summary{display:grid;grid-template-columns:minmax(220px,1.1fr) 2fr;gap:14px;margin-bottom:14px}.total-asset-card,.summary-details article{background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius-card)}.total-asset-card{padding:19px;background:linear-gradient(135deg,var(--card-bg),#293127)}.total-asset-card small,.summary-details small{color:var(--text-muted)}.total-asset-card strong{display:block;margin:8px 0 5px;font-size:1.5rem;letter-spacing:-.03em}.total-asset-card p{margin:0;color:var(--text-muted);font-size:.72rem}.summary-details{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.summary-details article{padding:14px}.summary-details strong{display:block;margin-top:6px;font-size:1rem}@media(max-width:700px){.asset-summary{grid-template-columns:1fr}.summary-details{grid-template-columns:repeat(2,minmax(0,1fr))}}
.auto-trade-panel{color:var(--text-primary)}.panel-header,.control-card,.log-card,.summary article{background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius-card)}.panel-header,.control-card{display:flex;justify-content:space-between;align-items:center;padding:20px;margin-bottom:14px}.panel-header p{margin:0;color:var(--accent);font-size:.7rem;font-weight:800;letter-spacing:.14em}.panel-header h3{margin:6px 0}.panel-header small,.connection small{color:var(--text-muted)}.panel-header b{font-size:.75rem;padding:6px 10px;border-radius:99px}.panel-header b.live{color:#ffb0a5;background:#43201e}.notice{padding:11px 14px;border-radius:var(--radius-control);background:#3a3324;color:var(--text-secondary)}.error{background:#472424;color:#ffb4b4}.connection{display:flex;gap:10px;align-items:center}.connection i{width:10px;height:10px;border-radius:50%;background:#7c8390}.connection i.online{background:#48d597;box-shadow:0 0 10px #48d597}.connection strong,.connection small{display:block}.actions{display:flex;gap:8px;align-items:flex-start}.actions button,.log-card button{cursor:pointer;border:1px solid var(--card-border-strong);background:transparent;color:var(--text-secondary);padding:8px 11px;border-radius:var(--radius-control)}.actions button.running{color:#9ff0bd;border-color:#48d597}.actions button.primary{background:var(--accent);border-color:var(--accent);color:var(--text-on-accent);font-weight:700}.actions button:disabled{opacity:.5;cursor:not-allowed}.toggle-wrap{display:flex;flex-direction:column;gap:5px}.toggle-hint{max-width:280px;color:var(--text-muted);font-size:.68rem;line-height:1.4}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:14px}.summary article{padding:17px}.summary small{color:var(--text-muted)}.summary strong{display:block;margin-top:8px;font-size:1.1rem}.profit{color:#e75e5e}.loss{color:#6399f1}.log-card{overflow:hidden}.log-card header{padding:13px 16px;border-bottom:1px solid var(--card-border);font-size:.82rem;font-weight:700}.log-card header span{color:#48d597}.log-card header button{float:right;padding:3px 7px;font-size:.7rem}.terminal{height:280px;overflow:auto;padding:13px 16px;background:var(--input-bg);font:12px/1.65 ui-monospace,Consolas,monospace}.terminal p{margin:0;word-break:break-word}.terminal time{color:var(--text-muted);margin-right:10px}.terminal .system{color:#74dd9c}.terminal .error{color:#f48d8d;background:transparent}.empty{color:var(--text-muted)}@media(max-width:700px){.panel-header,.control-card{align-items:flex-start;flex-direction:column}.summary{grid-template-columns:1fr}.actions{width:100%;flex-direction:column}.actions button,.toggle-wrap{width:100%}.toggle-hint{max-width:none}}

/* Shared finance control sizing; operational state colors are intentionally retained. */
button, summary { min-height: var(--control-height); }
button { border-radius: var(--radius-control); }
input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), select { min-height: var(--control-height); border-radius: var(--radius-control); }
.panel-header, .control-card { gap: 16px; }
.panel-header h3 { font-weight: 700; letter-spacing: -.025em; }
.terminal { border-radius: 0 0 var(--radius-card) var(--radius-card); }
</style>

<style scoped>
.operation-overview { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin: 18px 0; }
.operation-overview > div { padding: 16px; border: 1px solid var(--card-border); background: var(--card-bg); border-radius: 12px; }
.operation-overview dt { color: var(--text-muted); font-size: 12px; }
.operation-overview dd { margin: 8px 0 0; color: var(--text-primary); font-weight: 700; }
.operation-heading { margin: 20px 0 12px; color: var(--text-primary); }
.operation-details { margin-top: 20px; }
.operation-details > summary { padding: 14px 0; min-height: 44px; color: var(--text-secondary); cursor: pointer; }
.operation-details > summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
@media(max-width: 600px) { .operation-overview { gap: 6px; } .operation-overview > div { padding: 12px 8px; } .operation-overview dd { font-size: 13px; } .actions { width: 100%; flex-wrap: wrap; } .actions button { min-height: 44px; } }
</style>

<style scoped>
.operation-freshness, .sync-effects, .recent-operations p { color: var(--text-secondary); font-size: 13px; line-height: 1.7; overflow-wrap: anywhere; }
.operation-freshness span { display: block; }
.read-refresh { min-height: 44px; margin-left: 8px; padding: 8px 12px; color: var(--text-primary); background: var(--surface); border: 1px solid var(--card-border); border-radius: var(--radius-control); }
.recent-operations { padding: 16px; margin: 16px 0; border: 1px solid var(--card-border); border-radius: var(--radius-card); background: var(--surface); }
.recent-operations h4 { color: var(--text-primary); font-size: 15px; }
.recent-operations time { color: var(--text-muted); margin-right: 8px; }
</style>
