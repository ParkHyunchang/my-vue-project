<template>
  <section class="us-auto">
    <header class="hero">
      <div><p>KIWOOM US OPEN API</p><h3>🇺🇸 미국주식 자동매매</h3><small>거래대금 상위 종목을 규칙으로 선별하고 소액만 주문합니다.</small></div>
      <b>실전 계좌</b>
    </header>

    <div class="usd-notice">
      <strong>매수 자금: 미리 환전한 D+0 USD 외화예수금만</strong>
      <span>원화 주문 가능액과 자동환전은 사용하지 않습니다. 화면의 USD 잔액보다 주문 한도가 항상 작거나 같습니다.</span>
    </div>
    <p
      v-if="error"
      class="error"
    >
      {{ error }}
    </p>

    <section class="controls">
      <div>
        <strong>{{ status.autoTrading ? '자동매매 실행 중' : '자동매매 중지' }}</strong>
        <small>{{ status.marketOpen ? '미국 정규장 운영 중' : '미국 정규장 밖' }} · 주문전송 {{ status.orderEnabled ? '허용' : '잠금' }}</small>
      </div>
      <div class="buttons">
        <button
          :disabled="pending"
          :class="{ danger: status.autoTrading }"
          @click="toggle"
        >
          {{ status.autoTrading ? '자동매매 중지' : '자동매매 시작' }}
        </button>
        <button
          :disabled="pending || !status.configured"
          @click="runDecision"
        >
          후보 지금 확인
        </button>
        <button
          :disabled="pending || !status.configured"
          @click="refreshAll"
        >
          계좌·체결 동기화
        </button>
      </div>
    </section>

    <section class="summary">
      <article><small>사용 가능 USD</small><strong>${{ money(summary.cash?.availableUsd) }}</strong><span>D+0 외화예수금</span></article>
      <article><small>미국주식 평가액</small><strong>${{ money(summary.investedUsd) }}</strong><span>{{ summary.positionCount || 0 }}종목</span></article>
      <article><small>USD 기준 총자산</small><strong>${{ money(summary.totalAssetUsd) }}</strong><span>원화 주문 가능액 제외</span></article>
    </section>

    <section class="rules card">
      <header>
        <strong>적용 중인 7개 조건</strong><button @click="showSettings = !showSettings">
          {{ showSettings ? '접기' : '한도 조정' }}
        </button>
      </header>
      <ol>
        <li>미국 정규장 진입시간(10:00 ET 이후)</li>
        <li>거래대금 상위 50위 유동성 종목</li>
        <li>당일 등락률 {{ settings.minChangePercent }}~{{ settings.maxChangePercent }}%</li>
        <li>전일 대비 거래량 {{ settings.minVolumeRatio }}배 이상</li>
        <li>D+0 USD 예수금·건당 ${{ money(settings.maxOrderUsd) }} 이내</li>
        <li>최대 {{ settings.maxPositions }}종목·일 {{ settings.dailyMaxBuys }}회·재진입 {{ settings.symbolCooldownDays }}일 제한</li>
        <li>손절 -{{ settings.stopLossPercent }}%·익절 +{{ settings.takeProfitPercent }}/{{ settings.takeProfitPercent2 }}%·일손실 -{{ settings.dailyLossLimitPercent }}%</li>
      </ol>
      <form
        v-if="showSettings"
        class="settings"
        @submit.prevent="saveSettings"
      >
        <label>건당 USD<input
          v-model.number="settings.maxOrderUsd"
          type="number"
          min="1"
          step="1"
        ></label>
        <label>총 배정 USD<input
          v-model.number="settings.maxAllocatedUsd"
          type="number"
          min="1"
          step="1"
        ></label>
        <label>최대 종목<input
          v-model.number="settings.maxPositions"
          type="number"
          min="1"
          max="20"
        ></label>
        <label>일 매수횟수<input
          v-model.number="settings.dailyMaxBuys"
          type="number"
          min="1"
          max="20"
        ></label>
        <label>손절 %<input
          v-model.number="settings.stopLossPercent"
          type="number"
          min="0.1"
          step="0.1"
        ></label>
        <label>1차 익절 %<input
          v-model.number="settings.takeProfitPercent"
          type="number"
          min="0.1"
          step="0.1"
        ></label>
        <label>2차 익절 %<input
          v-model.number="settings.takeProfitPercent2"
          type="number"
          min="0.1"
          step="0.1"
        ></label>
        <button
          type="submit"
          :disabled="pending"
        >
          설정 저장
        </button>
      </form>
    </section>

    <div class="grids">
      <section class="card table-card">
        <header><strong>최근 후보</strong><span>{{ candidates.length }}개</span></header>
        <div class="table-wrap">
          <table>
            <thead><tr><th>종목</th><th>현재가</th><th>등락</th><th>거래량비</th></tr></thead><tbody>
              <tr
                v-for="item in candidates"
                :key="item.symbol"
              >
                <td><b>{{ item.symbol }}</b><small>{{ item.name }}</small></td><td>${{ money(item.price) }}</td><td class="up">
                  +{{ Number(item.changePercent).toFixed(2) }}%
                </td><td>{{ Number(item.volumeRatio).toFixed(2) }}배</td>
              </tr>
              <tr v-if="!candidates.length">
                <td
                  colspan="4"
                  class="empty"
                >
                  아직 조건을 모두 통과한 후보가 없습니다.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="card table-card">
        <header><strong>미국주식 보유</strong><span>{{ holdings.length }}개</span></header>
        <div class="table-wrap">
          <table>
            <thead><tr><th>종목</th><th>구분</th><th>수량</th><th>현재가</th><th>수익률</th></tr></thead><tbody>
              <tr
                v-for="item in holdings"
                :key="`${item.exchange}-${item.symbol}`"
              >
                <td><b>{{ item.symbol }}</b><small>{{ item.stockName }}</small></td><td>{{ item.managedByAutoTrade ? '자동관리' : '장기/수동' }}</td><td>{{ item.quantity }}</td><td>${{ money(item.currentPrice) }}</td><td :class="Number(item.profitLossPercent) >= 0 ? 'up' : 'down'">
                  {{ signed(item.profitLossPercent) }}%
                </td>
              </tr>
              <tr v-if="!holdings.length">
                <td
                  colspan="5"
                  class="empty"
                >
                  보유 중인 미국주식이 없습니다.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <section class="card logs">
      <header>
        <strong>후보 · 매수 · 매도 로그</strong><button @click="logs = []">
          화면 지우기
        </button>
      </header>
      <div
        ref="logBox"
        class="terminal"
      >
        <p
          v-for="item in logs"
          :key="item.id"
          :class="tone(item.eventType || item.type)"
        >
          <time>{{ logTime(item.createdAt) }}</time><b>[{{ label(item.eventType || item.type) }}]</b> {{ item.message }}
        </p>
        <p
          v-if="!logs.length"
          class="empty"
        >
          후보 산출, 주문 접수, 체결 결과가 여기에 기록됩니다.
        </p>
      </div>
    </section>
  </section>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import axios from '@/axios'

const BASE = '/api/kiwoom/us/auto-trade'
const status = ref({ configured: false, autoTrading: false, orderEnabled: false, marketOpen: false })
const summary = ref({ cash: { availableUsd: 0 }, investedUsd: 0, totalAssetUsd: 0, positionCount: 0 })
const settings = ref({ minChangePercent: 1, maxChangePercent: 4, minVolumeRatio: 1.5, maxOrderUsd: 200, maxAllocatedUsd: 400, maxPositions: 2, dailyMaxBuys: 1, symbolCooldownDays: 5, stopLossPercent: 2.5, takeProfitPercent: 4, takeProfitPercent2: 7, dailyLossLimitPercent: 2 })
const candidates = ref([]), holdings = ref([]), logs = ref([])
const pending = ref(false), error = ref(''), showSettings = ref(false), logBox = ref(null)
let source
const money = value => Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const signed = value => `${Number(value || 0) >= 0 ? '+' : ''}${Number(value || 0).toFixed(2)}`
const logTime = value => value ? new Date(value).toLocaleString('ko-KR', { hour12: false }) : new Date().toLocaleTimeString('ko-KR', { hour12: false })
const label = type => ({ CANDIDATE: '후보', BUY_ORDER: '매수주문', BUY_FILLED: '매수체결', SELL_ORDER: '매도주문', SELL_FILLED: '매도체결', ERROR: '오류', START: '시작', STOP: '중지' }[type] || type || '시스템')
const tone = type => type?.includes('BUY') ? 'buy' : type?.includes('SELL') ? 'sell' : type === 'CANDIDATE' ? 'candidate' : type === 'ERROR' ? 'error-line' : 'system'
function pushLog(item) { logs.value.push({ id: `${Date.now()}-${Math.random()}`, ...item }); if (logs.value.length > 300) logs.value.shift(); nextTick(() => { if (logBox.value) logBox.value.scrollTop = logBox.value.scrollHeight }) }
async function loadAll(sync = false) {
  const statusRes = await axios.get(`${BASE}/status`); status.value = statusRes.data
  const [settingsRes, auditRes, candidateRes, holdingRes] = await Promise.all([axios.get(`${BASE}/settings`), axios.get(`${BASE}/audit`), axios.get(`${BASE}/candidates`), axios.get(`${BASE}/holdings`)])
  settings.value = settingsRes.data; logs.value = [...auditRes.data].reverse(); candidates.value = candidateRes.data; holdings.value = holdingRes.data
  if (status.value.configured) {
    const accountResponse = await (sync ? axios.post(`${BASE}/sync`) : axios.get(`${BASE}/summary`))
    summary.value = accountResponse.data.snapshot || accountResponse.data
  }
}
async function action(fn) { pending.value = true; error.value = ''; try { await fn() } catch (e) { error.value = e.response?.data?.message || e.message || '요청에 실패했습니다.' } finally { pending.value = false } }
async function toggle() { const enabled = !status.value.autoTrading; if (!window.confirm(enabled ? '실계좌 미국주식 자동매매를 시작할까요? 매수에는 D+0 USD 예수금만 사용합니다.' : '신규 자동주문을 중지할까요? 이미 접수된 주문은 키움에서 확인하세요.')) return; await action(async () => { await axios.post(`${BASE}/control`, { enabled }); await loadAll() }) }
async function runDecision() { await action(async () => { const { data } = await axios.post(`${BASE}/decide`); pushLog({ type: 'SYSTEM', message: data.message, createdAt: new Date().toISOString() }); await loadAll() }) }
async function refreshAll() { await action(async () => loadAll(true)) }
async function saveSettings() { await action(async () => { settings.value = (await axios.patch(`${BASE}/settings`, settings.value)).data; showSettings.value = false; pushLog({ type: 'SYSTEM', message: '미국주식 자동매매 한도를 저장했습니다.', createdAt: new Date().toISOString() }) }) }
function connect() { source = new EventSource(`${process.env.VUE_APP_API_URL || ''}${BASE}/events`, { withCredentials: true }); source.addEventListener('kiwoom-us', event => pushLog(JSON.parse(event.data))) }
onMounted(() => action(async () => { await loadAll(); connect() }))
onBeforeUnmount(() => source?.close())
</script>

<style scoped>
.us-auto{color:var(--text-primary)}.hero,.controls,.card,.summary article{border:1px solid var(--card-border);border-radius:16px;background:var(--card-bg)}.hero,.controls{display:flex;align-items:center;justify-content:space-between;padding:20px;margin-bottom:14px}.hero p{margin:0;color:#68a4ff;font-size:.7rem;font-weight:800;letter-spacing:.14em}.hero h3{margin:6px 0}.hero small,.controls small,.summary span,td small{display:block;color:var(--text-muted)}.hero b{padding:6px 10px;border-radius:99px;background:#43201e;color:#ffb0a5;font-size:.75rem}.usd-notice{display:flex;flex-direction:column;gap:4px;margin-bottom:14px;padding:14px 16px;border:1px solid #32694f;border-radius:12px;background:#19382b;color:#b9f5d8}.usd-notice span{font-size:.78rem}.error{padding:12px;border-radius:10px;background:#472424;color:#ffb4b4}.buttons{display:flex;gap:8px}.buttons button,.card button,.settings button{padding:8px 11px;border:1px solid var(--card-border-strong);border-radius:9px;background:transparent;color:var(--text-secondary);cursor:pointer}.buttons button:first-child{background:var(--accent);color:#18140b;font-weight:700}.buttons button.danger{background:#762f35;color:#fff}.buttons button:disabled{opacity:.45}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px}.summary article{padding:17px}.summary small{color:var(--text-muted)}.summary strong{display:block;margin:7px 0;font-size:1.25rem}.card{margin-bottom:14px;overflow:hidden}.card>header{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;border-bottom:1px solid var(--card-border)}.rules ol{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 28px;margin:15px 20px 18px;padding-left:20px;color:var(--text-secondary);font-size:.8rem}.settings{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:0 18px 18px}.settings label{color:var(--text-muted);font-size:.72rem}.settings input{box-sizing:border-box;width:100%;margin-top:4px;padding:8px;border:1px solid var(--card-border);border-radius:8px;background:var(--input-bg,#171b20);color:var(--text-primary)}.grids{display:grid;grid-template-columns:1fr 1fr;gap:14px}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;font-size:.78rem}th,td{padding:10px 12px;border-bottom:1px solid var(--card-border);text-align:right;white-space:nowrap}th:first-child,td:first-child{text-align:left}td small{max-width:130px;overflow:hidden;text-overflow:ellipsis}.up,.buy{color:#ef7777}.down,.sell{color:#72a7ff}.empty{padding:25px!important;color:var(--text-muted)!important;text-align:center!important}.terminal{height:280px;overflow:auto;padding:13px 16px;background:#0a0f0d;font:12px/1.65 ui-monospace,Consolas,monospace}.terminal p{margin:0;word-break:break-word}.terminal time{margin-right:9px;color:#78847e}.terminal b{margin-right:5px}.terminal .candidate{color:#e7cf78}.terminal .system{color:#77dda0}.terminal .error-line{color:#f08d8d}@media(max-width:800px){.hero,.controls{align-items:flex-start;flex-direction:column;gap:12px}.buttons{width:100%;flex-direction:column}.summary,.grids{grid-template-columns:1fr}.rules ol{grid-template-columns:1fr}.settings{grid-template-columns:repeat(2,1fr)}}
</style>
