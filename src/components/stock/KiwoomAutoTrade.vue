<template>
  <section class="auto-trade-panel">
    <header class="panel-header">
      <div><p>KIWOOM OPEN API</p><h3>🤖 AI 자동매매</h3><small>실계좌 주문 제어 및 실시간 체결 모니터</small></div><b class="live">실전 투자</b>
    </header>
    <p
      v-if="errorMessage"
      class="notice error"
    >
      {{ errorMessage }}
    </p>
    <p
      v-else-if="!status.configured"
      class="notice"
    >
      서버 환경 변수에 <code>KIWOOM_APP_KEY</code>, <code>KIWOOM_SECRET_KEY</code>를 설정하면 연결할 수 있습니다.
    </p>
    <div class="control-card">
      <div class="connection">
        <i :class="status.connected ? 'online' : ''" /><span><strong>{{ status.connected ? '키움 API 연결됨' : '키움 API 연결 대기' }}</strong><small>{{ status.tokenValid ? 'Access Token 정상' : 'Access Token 미발급 또는 만료' }}</small></span>
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
          API Key 갱신
        </button>
      </div>
    </div>
    <p
      v-if="!status.marketOpen"
      class="market-notice"
    >
      <strong>정규장 외 시세 표시 중</strong>{{ status.marketMessage }}
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
          <small>주문가능금액</small><strong>{{ formatWon(account.orderAvailable ?? account.deposit) }}</strong>
          <span class="summary-value-detail">지금 바로 주문 가능</span>
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
    <KiwoomStrategyPanel
      :configured="status.configured"
      :auto-trading="status.autoTrading"
      :price-ticks="priceTicks"
    />
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
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import axios from '@/axios'
import KiwoomStrategyPanel from '@/components/stock/KiwoomStrategyPanel.vue'

// 토큰·계좌번호는 프론트에 저장하지 않습니다. 서버가 httpOnly 인증과 키움 토큰을 모두 관리합니다.
const status = ref({ configured: false, connected: false, tokenValid: false, autoTrading: false, orderEnabled: false, marketOpen: false, marketMessage: '', consecutiveApiFailures: 0 })
const account = ref({ totalAsset: null, totalAssetSource: '', totalAssetChange: null, totalAssetChangePercent: null, deposit: 0, d1Deposit: 0, d2Deposit: 0, orderAvailable: null, profitLoss: 0, stockProfitRate: 0, totalEvaluation: 0 })
const logs = ref([]), pending = ref(false), errorMessage = ref(''), logElement = ref(null)
const priceTicks = ref({})
let eventSource
const totalAsset = computed(() => account.value.totalAsset ?? (Number(account.value.deposit || 0) + Number(account.value.totalEvaluation || 0)))
const formatWon = (value) => `${Number(value || 0).toLocaleString('ko-KR')}원`
const formatSignedWon = (value) => `${Number(value) > 0 ? '+' : ''}${formatWon(value)}`
const formatPercent = (value) => `${Number(value) >= 0 ? '+' : ''}${Number(value || 0).toFixed(2)}%`
const changeTone = (value) => Number(value) > 0 ? 'profit' : Number(value) < 0 ? 'loss' : ''
// 시작/중지 확인 문구와 버튼 아래 설명을 하나로 유지해 문구가 서로 어긋나지 않도록 한다.
const TOGGLE_ON_HINT = '자동주문을 시작할까요? 현재 보유종목의 익절·손절·최대 보유기간을 다시 계산하고 장중이면 즉시 적용합니다.'
const TOGGLE_OFF_HINT = '자동주문을 완전히 중지할까요? 신규 주문을 멈추고 시스템이 전송한 미체결 매수·매도 주문도 취소합니다.'
const toggleHint = computed(() => status.value.autoTrading ? TOGGLE_OFF_HINT : TOGGLE_ON_HINT)
function pushLog(type, message) { logs.value.push({ id: `${Date.now()}-${Math.random()}`, type, message, time: new Date().toLocaleTimeString('ko-KR', { hour12: false }) }); if (logs.value.length > 300) logs.value.shift(); nextTick(() => { if (logElement.value) logElement.value.scrollTop = logElement.value.scrollHeight }) }
async function loadStatus() { status.value = (await axios.get('/api/kiwoom/auto-trade/status')).data }
async function loadSummary() { if (!status.value.configured) return; try { account.value = (await axios.get('/api/kiwoom/auto-trade/summary')).data } catch { /* 토큰이 없을 땐 상태 UI만 표시 */ } }
async function toggleAutoTrade() { const enabling = !status.value.autoTrading; const question = enabling ? TOGGLE_ON_HINT : TOGGLE_OFF_HINT; if (!window.confirm(question)) return; pending.value = true; errorMessage.value = ''; try { const { data } = await axios.post('/api/kiwoom/auto-trade/control', { enabled: enabling }); status.value.autoTrading = data.autoTrading; if (data.autoTrading) pushLog('system', '자동주문을 시작하고 보유종목 청산 기준을 다시 계산했습니다.'); else { const failed = data.orderCancellationFailed || 0; pushLog(failed ? 'error' : 'system', `자동주문을 완전히 중지했습니다. 미체결 자동주문 취소 요청 ${data.orderCancellationRequested || 0}건${failed ? `, 취소 실패 ${failed}건은 키움 주문을 확인하세요.` : ''}`) } } catch (e) { errorMessage.value = e.response?.data?.message || '자동주문 상태 변경에 실패했습니다.' } finally { pending.value = false; await loadStatus() } }
async function refreshToken() { pending.value = true; errorMessage.value = ''; try { await axios.post('/api/kiwoom/auto-trade/token/refresh'); pushLog('system', '키움 Access Token을 갱신했습니다.'); await loadSummary() } catch (e) { errorMessage.value = e.response?.data?.message || '토큰 갱신에 실패했습니다.' } finally { pending.value = false; await loadStatus() } }
function connectEvents() { eventSource = new EventSource(`${process.env.VUE_APP_API_URL || ''}/api/kiwoom/auto-trade/events`, { withCredentials: true }); eventSource.addEventListener('kiwoom', e => handleRealtimeEvent(JSON.parse(e.data))); eventSource.onerror = () => pushLog('error', '실시간 로그 연결이 재시도 중입니다.') }
function handleRealtimeEvent(data) {
  const price = Number(data?.price)
  if (data?.type === 'price' && data.stockCode && Number.isFinite(price) && price > 0) {
    priceTicks.value = { ...priceTicks.value, [data.stockCode]: { price, at: data.at } }
    return
  }
  pushLog(data?.type || 'market', data?.message || JSON.stringify(data))
}
onMounted(async () => { try { await loadStatus(); await loadSummary(); connectEvents() } catch { errorMessage.value = '자동매매 API 상태를 불러오지 못했습니다.' } })
onBeforeUnmount(() => eventSource?.close())
</script>

<style scoped>
.asset-change{margin:0 0 4px!important;font-size:.8rem!important;font-weight:700}.summary-value-detail{display:block;margin-top:5px;color:var(--text-muted);font-size:.7rem;line-height:1.4}.summary-value-detail.profit,.asset-change.profit{color:#e75e5e}.summary-value-detail.loss,.asset-change.loss{color:#6399f1}.asset-summary .summary-details{grid-template-columns:repeat(3,minmax(0,1fr))}@media(max-width:700px){.asset-summary .summary-details{grid-template-columns:repeat(2,minmax(0,1fr))}}
.market-notice{margin:0 0 14px;padding:10px 13px;border:1px solid #6b5a27;border-radius:10px;background:#342d1b;color:#dfcf91;font-size:.78rem;line-height:1.55}.market-notice strong{margin-right:8px;color:#ffe08a}
.asset-summary{display:grid;grid-template-columns:minmax(220px,1.1fr) 2fr;gap:14px;margin-bottom:14px}.total-asset-card,.summary-details article{background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px}.total-asset-card{padding:19px;background:linear-gradient(135deg,var(--card-bg),#293127)}.total-asset-card small,.summary-details small{color:var(--text-muted)}.total-asset-card strong{display:block;margin:8px 0 5px;font-size:1.5rem;letter-spacing:-.03em}.total-asset-card p{margin:0;color:var(--text-muted);font-size:.72rem}.summary-details{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.summary-details article{padding:14px}.summary-details strong{display:block;margin-top:6px;font-size:1rem}@media(max-width:700px){.asset-summary{grid-template-columns:1fr}.summary-details{grid-template-columns:repeat(2,minmax(0,1fr))}}
.auto-trade-panel{color:var(--text-primary)}.panel-header,.control-card,.log-card,.summary article{background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px}.panel-header,.control-card{display:flex;justify-content:space-between;align-items:center;padding:20px;margin-bottom:14px}.panel-header p{margin:0;color:var(--accent);font-size:.7rem;font-weight:800;letter-spacing:.14em}.panel-header h3{margin:6px 0}.panel-header small,.connection small{color:var(--text-muted)}.panel-header b{font-size:.75rem;padding:6px 10px;border-radius:99px}.panel-header b.live{color:#ffb0a5;background:#43201e}.notice{padding:11px 14px;border-radius:10px;background:#3a3324;color:var(--text-secondary)}.error{background:#472424;color:#ffb4b4}.connection{display:flex;gap:10px;align-items:center}.connection i{width:10px;height:10px;border-radius:50%;background:#7c8390}.connection i.online{background:#48d597;box-shadow:0 0 10px #48d597}.connection strong,.connection small{display:block}.actions{display:flex;gap:8px;align-items:flex-start}.actions button,.log-card button{cursor:pointer;border:1px solid var(--card-border-strong);background:transparent;color:var(--text-secondary);padding:8px 11px;border-radius:9px}.actions button.running{color:#9ff0bd;border-color:#48d597}.actions button.primary{background:var(--accent);border-color:var(--accent);color:#1a1508;font-weight:700}.actions button:disabled{opacity:.5;cursor:not-allowed}.toggle-wrap{display:flex;flex-direction:column;gap:5px}.toggle-hint{max-width:280px;color:var(--text-muted);font-size:.68rem;line-height:1.4}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:14px}.summary article{padding:17px}.summary small{color:var(--text-muted)}.summary strong{display:block;margin-top:8px;font-size:1.1rem}.profit{color:#e75e5e}.loss{color:#6399f1}.log-card{overflow:hidden}.log-card header{padding:13px 16px;border-bottom:1px solid var(--card-border);font-size:.82rem;font-weight:700}.log-card header span{color:#48d597}.log-card header button{float:right;padding:3px 7px;font-size:.7rem}.terminal{height:280px;overflow:auto;padding:13px 16px;background:#0a0f0d;font:12px/1.65 ui-monospace,Consolas,monospace}.terminal p{margin:0;word-break:break-word}.terminal time{color:#77827c;margin-right:10px}.terminal .system{color:#74dd9c}.terminal .error{color:#f48d8d;background:transparent}.empty{color:#65736b}@media(max-width:700px){.panel-header,.control-card{align-items:flex-start;flex-direction:column}.summary{grid-template-columns:1fr}.actions{width:100%;flex-direction:column}.actions button,.toggle-wrap{width:100%}.toggle-hint{max-width:none}}
</style>
