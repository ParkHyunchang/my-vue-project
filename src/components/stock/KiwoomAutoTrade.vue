<template>
  <section class="auto-trade-panel">
    <header class="panel-header">
      <div><p>KIWOOM OPEN API</p><h3>🤖 AI 자동매매</h3><small>모의·실전 환경을 분리한 주문 제어 및 실시간 체결 모니터</small></div><b :class="status.mode">{{ status.mode === 'live' ? '실전 투자' : '모의 투자' }}</b>
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
        <button
          :class="{ running: status.autoTrading }"
          :disabled="pending"
          @click="toggleAutoTrade"
        >
          {{ status.autoTrading ? '● 자동매매 정지' : '○ 자동매매 시작' }}
        </button><button
          :disabled="pending || !status.configured"
          @click="refreshToken"
        >
          API Key 갱신
        </button>
      </div>
    </div>
    <div class="summary">
      <article
        v-for="item in summaryCards"
        :key="item.label"
      >
        <small>{{ item.label }}</small><strong :class="item.tone">{{ formatWon(item.value) }}</strong>
      </article>
    </div>
    <KiwoomStrategyPanel :configured="status.configured" />
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
const status = ref({ configured: false, connected: false, tokenValid: false, autoTrading: false, mode: 'mock' })
const account = ref({ deposit: 0, profitLoss: 0, totalEvaluation: 0 })
const logs = ref([]), pending = ref(false), errorMessage = ref(''), logElement = ref(null)
let eventSource
const summaryCards = computed(() => [{ label: '예수금', value: account.value.deposit }, { label: '평가손익', value: account.value.profitLoss, tone: account.value.profitLoss >= 0 ? 'profit' : 'loss' }, { label: '총 평가금액', value: account.value.totalEvaluation }])
const formatWon = (value) => `${Number(value || 0).toLocaleString('ko-KR')}원`
function pushLog(type, message) { logs.value.push({ id: `${Date.now()}-${Math.random()}`, type, message, time: new Date().toLocaleTimeString('ko-KR', { hour12: false }) }); if (logs.value.length > 300) logs.value.shift(); nextTick(() => { if (logElement.value) logElement.value.scrollTop = logElement.value.scrollHeight }) }
async function loadStatus() { status.value = (await axios.get('/api/kiwoom/auto-trade/status')).data }
async function loadSummary() { if (!status.value.configured) return; try { account.value = (await axios.get('/api/kiwoom/auto-trade/summary')).data } catch { /* 토큰이 없을 땐 상태 UI만 표시 */ } }
async function toggleAutoTrade() { pending.value = true; errorMessage.value = ''; try { const { data } = await axios.post('/api/kiwoom/auto-trade/control', { enabled: !status.value.autoTrading }); status.value.autoTrading = data.autoTrading; pushLog('system', data.autoTrading ? '자동매매 엔진을 시작했습니다.' : '자동매매 엔진을 정지했습니다.') } catch (e) { errorMessage.value = e.response?.data?.message || '자동매매 상태 변경에 실패했습니다.' } finally { pending.value = false; await loadStatus() } }
async function refreshToken() { pending.value = true; errorMessage.value = ''; try { await axios.post('/api/kiwoom/auto-trade/token/refresh'); pushLog('system', '키움 Access Token을 갱신했습니다.'); await loadSummary() } catch (e) { errorMessage.value = e.response?.data?.message || '토큰 갱신에 실패했습니다.' } finally { pending.value = false; await loadStatus() } }
function connectEvents() { eventSource = new EventSource(`${process.env.VUE_APP_API_URL || ''}/api/kiwoom/auto-trade/events`, { withCredentials: true }); eventSource.addEventListener('kiwoom', e => { const data = JSON.parse(e.data); pushLog(data.type || 'market', data.message || JSON.stringify(data)) }); eventSource.onerror = () => pushLog('error', '실시간 로그 연결이 재시도 중입니다.') }
onMounted(async () => { try { await loadStatus(); await loadSummary(); connectEvents() } catch { errorMessage.value = '자동매매 API 상태를 불러오지 못했습니다.' } })
onBeforeUnmount(() => eventSource?.close())
</script>

<style scoped>
.auto-trade-panel{color:var(--text-primary)}.panel-header,.control-card,.log-card,.summary article{background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px}.panel-header,.control-card{display:flex;justify-content:space-between;align-items:center;padding:20px;margin-bottom:14px}.panel-header p{margin:0;color:var(--accent);font-size:.7rem;font-weight:800;letter-spacing:.14em}.panel-header h3{margin:6px 0}.panel-header small,.connection small{color:var(--text-muted)}.panel-header b{font-size:.75rem;padding:6px 10px;border-radius:99px}.panel-header b.mock{color:#8ce4ae;background:#193b2a}.panel-header b.live{color:#ffb0a5;background:#43201e}.notice{padding:11px 14px;border-radius:10px;background:#3a3324;color:var(--text-secondary)}.error{background:#472424;color:#ffb4b4}.connection{display:flex;gap:10px;align-items:center}.connection i{width:10px;height:10px;border-radius:50%;background:#7c8390}.connection i.online{background:#48d597;box-shadow:0 0 10px #48d597}.connection strong,.connection small{display:block}.actions{display:flex;gap:8px}.actions button,.log-card button{cursor:pointer;border:1px solid var(--card-border-strong);background:transparent;color:var(--text-secondary);padding:8px 11px;border-radius:9px}.actions button.running{color:#9ff0bd;border-color:#48d597}.actions button:disabled{opacity:.5;cursor:not-allowed}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:14px}.summary article{padding:17px}.summary small{color:var(--text-muted)}.summary strong{display:block;margin-top:8px;font-size:1.1rem}.profit{color:#e75e5e}.loss{color:#6399f1}.log-card{overflow:hidden}.log-card header{padding:13px 16px;border-bottom:1px solid var(--card-border);font-size:.82rem;font-weight:700}.log-card header span{color:#48d597}.log-card header button{float:right;padding:3px 7px;font-size:.7rem}.terminal{height:280px;overflow:auto;padding:13px 16px;background:#0a0f0d;font:12px/1.65 ui-monospace,Consolas,monospace}.terminal p{margin:0;word-break:break-word}.terminal time{color:#77827c;margin-right:10px}.terminal .system{color:#74dd9c}.terminal .error{color:#f48d8d;background:transparent}.empty{color:#65736b}@media(max-width:700px){.panel-header,.control-card{align-items:flex-start;flex-direction:column}.summary{grid-template-columns:1fr}.actions{width:100%}.actions button{flex:1}}
</style>
