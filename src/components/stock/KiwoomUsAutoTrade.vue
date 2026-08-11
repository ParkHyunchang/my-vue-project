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

    <section class="market-hours card">
      <header>
        <strong>미국장 자동매매 운영시간</strong><span :class="status.marketOpen ? 'open' : 'closed'">
          {{ status.marketOpen ? '정규장 운영 중' : '장 운영시간 아님' }}
        </span>
      </header>
      <div>
        <p><b>현재 적용:</b> {{ status.marketSeason }} · 정규장 {{ status.regularSessionKst }} (한국시간)</p>
        <p><b>신규매수:</b> {{ status.entrySessionKst }} · 개장 직후 30분과 마감 전 1시간은 진입하지 않습니다.</p>
        <p><b>매도·체결:</b> 정규장 전체에서만 감시·동기화하며 프리마켓과 애프터마켓에는 주문하지 않습니다.</p>
        <p><b>달력:</b> 2026~2028년 NYSE 휴장일과 조기폐장을 반영하고, 이후 연도는 일정 등록 전까지 주문을 차단합니다.</p>
      </div>
    </section>

    <section class="summary">
      <article><small>사용 가능 USD</small><strong>${{ money(summary.cash?.availableUsd) }}</strong><span>D+0 외화예수금</span></article>
      <article><small>한 번 살 수 있는 금액</small><strong>${{ money(estimatedOrderUsd) }}</strong><span>현재 USD의 {{ settings.maxOrderPercent }}%</span></article>
      <article><small>자동매매로 보유 중</small><strong>{{ summary.managedPositionCount || 0 }}종목</strong><span>평가액 ${{ money(summary.managedEvaluationUsd) }}</span></article>
      <article><small>미국주식 평가액</small><strong>${{ money(summary.stockEvaluationUsd) }}</strong><span>전체 {{ summary.positionCount || 0 }}종목 · 자동 {{ summary.managedPositionCount || 0 }}종목</span></article>
    </section>

    <section class="rules card">
      <header>
        <strong>현재 적용 중인 7가지 매매 규칙</strong><button @click="showSettings = !showSettings">
          {{ showSettings ? '설정 닫기' : '전략 설정' }}
        </button>
      </header>
      <ol>
        <li>개장 직후 30분과 마감 전 1시간을 피해 매수합니다.</li>
        <li>당일 거래대금 상위 50위 안에 든 종목만 봅니다.</li>
        <li>오늘 {{ settings.minChangePercent }}~{{ settings.maxChangePercent }}% 오른 종목만 고릅니다.</li>
        <li>거래량이 전일의 {{ settings.minVolumeRatio }}배 이상인 종목만 고릅니다.</li>
        <li>한 번에 최대 약 ${{ money(estimatedOrderUsd) }}만 매수합니다.</li>
        <li>자동매매 종목은 최대 {{ settings.maxPositions }}개, 하루 매수는 최대 {{ settings.dailyMaxBuys }}번입니다.</li>
        <li>-{{ settings.stopLossPercent }}% 손절, +{{ settings.takeProfitPercent }}%부터 나눠 익절하고 {{ settings.maxHoldingDays }}일 안에 정리합니다.</li>
      </ol>
      <div
        v-if="showSettings"
        class="settings-area"
      >
        <div class="easy-guide">
          <b>숫자만 바꾸면 됩니다.</b>
          <span>각 숫자가 실제로 무엇을 뜻하는지 아래에 적었습니다. 저장하기를 눌러야 자동매매에 적용됩니다.</span>
        </div>
        <form
          class="strategy-settings"
          @submit.prevent="saveSettings"
        >
          <section class="setting-card screen-card">
            <p class="setting-step">
              1. 매수 후보 찾기
            </p>
            <p class="setting-description">
              너무 조용한 종목과 이미 급등한 종목을 피하고, 거래가 활발해진 종목만 찾습니다.
            </p>
            <div class="setting-field">
              <label>오늘 최소 상승률<span>이만큼 이상 오른 종목부터 후보로 봅니다.</span></label>
              <div class="number-with-unit">
                <b>+</b><input
                  v-model.number="settings.minChangePercent"
                  type="number"
                  min="0"
                  max="20"
                  step="0.1"
                ><em>%</em>
              </div>
            </div>
            <div class="setting-field">
              <label>오늘 최대 상승률<span>이보다 많이 오른 종목은 급등 추격을 피하기 위해 제외합니다.</span></label>
              <div class="number-with-unit">
                <b>+</b><input
                  v-model.number="settings.maxChangePercent"
                  type="number"
                  min="0"
                  max="30"
                  step="0.1"
                ><em>%</em>
              </div>
            </div>
            <div class="setting-field">
              <label>최소 거래량 증가<span>2배는 현재 거래량이 전일 거래량의 두 배 이상이라는 뜻입니다.</span></label>
              <div class="number-with-unit">
                <input
                  v-model.number="settings.minVolumeRatio"
                  type="number"
                  min="1"
                  max="20"
                  step="0.1"
                ><em>배</em>
              </div>
            </div>
          </section>

          <section class="setting-card buy-card">
            <p class="setting-step">
              2. 한 번에 살 때
            </p>
            <p class="setting-description">
              미리 환전한 달러 중 한 번에 얼마를 쓰고, 몇 종목까지 살지 정합니다.
            </p>
            <div class="setting-field">
              <label>한 번에 살 수 있는 돈<span>현재 D+0 USD 예수금 중 한 번의 매수에 쓸 최대 비율입니다. 지금 기준 약 ${{ money(estimatedOrderUsd) }}입니다.</span></label>
              <div class="number-with-unit">
                <input
                  v-model.number="settings.maxOrderPercent"
                  type="number"
                  min="0.1"
                  max="100"
                  step="0.1"
                ><em>%</em>
              </div>
            </div>
            <div class="setting-field">
              <label>동시에 보유할 자동매매 종목<span>장기투자나 직접 산 미국주식은 세지 않고, 자동매매로 산 종목만 셉니다.</span></label>
              <div class="number-with-unit">
                <input
                  v-model.number="settings.maxPositions"
                  type="number"
                  min="1"
                  max="20"
                  step="1"
                ><em>종목</em>
              </div>
            </div>
            <div class="setting-field">
              <label>하루에 새로 살 수 있는 횟수<span>실제 주문을 보낸 횟수를 제한합니다. 매도와 후보 확인은 계속합니다.</span></label>
              <div class="number-with-unit">
                <input
                  v-model.number="settings.dailyMaxBuys"
                  type="number"
                  min="1"
                  max="20"
                  step="1"
                ><em>번</em>
              </div>
            </div>
            <div class="setting-field">
              <label>같은 종목을 다시 사기까지 기다릴 기간<span>최근 매수 주문 뒤 이 기간 동안 같은 종목을 다시 매수하지 않습니다.</span></label>
              <div class="number-with-unit">
                <input
                  v-model.number="settings.symbolCooldownDays"
                  type="number"
                  min="1"
                  max="30"
                  step="1"
                ><em>일</em>
              </div>
            </div>
          </section>

          <section class="setting-card sell-card">
            <p class="setting-step">
              3. 산 주식을 팔 때
            </p>
            <p class="setting-description">
              손실을 줄이고 이익을 나눠 지키는 자동 매도 기준입니다.
            </p>
            <div class="setting-field">
              <label>손실이 이만큼 나면 팔기<span>평균 매수가보다 이 비율 이상 내려가면 보유수량을 모두 손절합니다.</span></label>
              <div class="number-with-unit negative">
                <b>-</b><input
                  v-model.number="settings.stopLossPercent"
                  type="number"
                  min="0.1"
                  max="30"
                  step="0.1"
                ><em>%</em>
              </div>
            </div>
            <div class="setting-field">
              <label>1차 이익 실현<span>이만큼 오르면 보유수량의 절반을 먼저 팝니다. 1주만 있으면 전량 매도합니다.</span></label>
              <div class="number-with-unit">
                <b>+</b><input
                  v-model.number="settings.takeProfitPercent"
                  type="number"
                  min="0.1"
                  max="100"
                  step="0.1"
                ><em>%</em>
              </div>
            </div>
            <div class="setting-field">
              <label>2차 이익 실현<span>남은 수량은 이 수익률에 도달하면 모두 팝니다. 1차보다 큰 값이어야 합니다.</span></label>
              <div class="number-with-unit">
                <b>+</b><input
                  v-model.number="settings.takeProfitPercent2"
                  type="number"
                  min="0.1"
                  max="100"
                  step="0.1"
                ><em>%</em>
              </div>
            </div>
            <div class="setting-field">
              <label>가장 오래 보유할 기간<span>매수 후 이 기간이 지나면 수익률과 관계없이 정리합니다.</span></label>
              <div class="number-with-unit">
                <input
                  v-model.number="settings.maxHoldingDays"
                  type="number"
                  min="1"
                  max="30"
                  step="1"
                ><em>일</em>
              </div>
            </div>
          </section>

          <section class="setting-card safety-card">
            <p class="setting-step">
              4. 하루 안전장치
            </p>
            <p class="setting-description">
              자동매매 자산의 하루 손실이 커지면 그날의 새 매수를 멈춥니다.
            </p>
            <div class="setting-field">
              <label>오늘 손실률이 이 비율이면 새 매수 멈추기<span>그날 처음 확인한 자동매매용 USD와 자동매매 보유종목 평가액을 기준으로 계산합니다. 0%는 사용하지 않음입니다.</span></label>
              <div class="number-with-unit negative">
                <b>-</b><input
                  v-model.number="settings.dailyLossLimitPercent"
                  type="number"
                  min="0"
                  max="30"
                  step="0.1"
                ><em>%</em>
              </div>
            </div>
          </section>

          <p
            v-if="validationError"
            class="settings-error"
          >
            ⚠ {{ validationError }}
          </p>
          <button
            class="save-settings"
            type="submit"
            :disabled="pending || !!validationError"
          >
            {{ pending ? '저장 중...' : '설정 저장하기' }}
          </button>
        </form>
      </div>
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import axios from '@/axios'

const BASE = '/api/kiwoom/us/auto-trade'
const status = ref({ configured: false, autoTrading: false, orderEnabled: false, marketOpen: false, entryWindow: false, marketSeason: '', regularSessionKst: '', entrySessionKst: '' })
const summary = ref({ cash: { availableUsd: 0 }, stockEvaluationUsd: 0, managedEvaluationUsd: 0, perOrderLimitUsd: 0, positionCount: 0, managedPositionCount: 0 })
const settings = ref({ minChangePercent: 1, maxChangePercent: 4, minVolumeRatio: 1.5, maxOrderPercent: 10, maxPositions: 2, dailyMaxBuys: 1, symbolCooldownDays: 5, maxHoldingDays: 3, stopLossPercent: 2.5, takeProfitPercent: 4, takeProfitPercent2: 7, dailyLossLimitPercent: 2 })
const candidates = ref([]), holdings = ref([]), logs = ref([])
const pending = ref(false), error = ref(''), showSettings = ref(false), logBox = ref(null)
let source
const money = value => Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const validNumber = (value, min, max) => typeof value === 'number' && !Number.isNaN(value) && value >= min && value <= max
const validInteger = (value, min, max) => Number.isInteger(value) && value >= min && value <= max
const estimatedOrderUsd = computed(() => Number(summary.value.cash?.availableUsd || 0) * Number(settings.value.maxOrderPercent || 0) / 100)
const validationError = computed(() => {
  const s = settings.value
  if (!validNumber(s.minChangePercent, 0, 20)) return '오늘 최소 상승률은 0부터 20% 사이여야 합니다.'
  if (!validNumber(s.maxChangePercent, s.minChangePercent, 30)) return '오늘 최대 상승률은 최소 상승률 이상, 30% 이하여야 합니다.'
  if (!validNumber(s.minVolumeRatio, 1, 20)) return '최소 거래량 증가는 1부터 20배 사이여야 합니다.'
  if (!validNumber(s.maxOrderPercent, 0.1, 100)) return '한 번에 살 수 있는 돈은 0.1부터 100% 사이여야 합니다.'
  if (!validInteger(s.maxPositions, 1, 20)) return '동시에 보유할 종목 수는 1부터 20 사이의 정수여야 합니다.'
  if (!validInteger(s.dailyMaxBuys, 1, 20)) return '하루 매수 횟수는 1부터 20 사이의 정수여야 합니다.'
  if (!validInteger(s.symbolCooldownDays, 1, 30)) return '같은 종목을 다시 사기까지 기다릴 기간은 1부터 30일 사이여야 합니다.'
  if (!validNumber(s.stopLossPercent, 0.1, 30)) return '손절 기준은 0.1부터 30% 사이여야 합니다.'
  if (!validNumber(s.takeProfitPercent, 0.1, 100)) return '1차 이익 실현은 0.1부터 100% 사이여야 합니다.'
  if (!validNumber(s.takeProfitPercent2, s.takeProfitPercent, 100) || s.takeProfitPercent2 === s.takeProfitPercent) return '2차 이익 실현은 1차보다 크고 100% 이하여야 합니다.'
  if (!validInteger(s.maxHoldingDays, 1, 30)) return '가장 오래 보유할 기간은 1부터 30일 사이의 정수여야 합니다.'
  if (!validNumber(s.dailyLossLimitPercent, 0, 30)) return '하루 손실 안전장치는 0부터 30% 사이여야 합니다.'
  return ''
})
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
async function saveSettings() { if (validationError.value) return; await action(async () => { settings.value = (await axios.patch(`${BASE}/settings`, settings.value)).data; showSettings.value = false; pushLog({ type: 'SYSTEM', message: '미국주식 자동매매 전략 설정을 저장했습니다.', createdAt: new Date().toISOString() }) }) }
function connect() { source = new EventSource(`${process.env.VUE_APP_API_URL || ''}${BASE}/events`, { withCredentials: true }); source.addEventListener('kiwoom-us', event => pushLog(JSON.parse(event.data))) }
onMounted(() => action(async () => { await loadAll(); connect() }))
onBeforeUnmount(() => source?.close())
</script>

<style scoped>
.us-auto{color:var(--text-primary)}.hero,.controls,.card,.summary article{border:1px solid var(--card-border);border-radius:16px;background:var(--card-bg)}.hero,.controls{display:flex;align-items:center;justify-content:space-between;padding:20px;margin-bottom:14px}.hero p{margin:0;color:#68a4ff;font-size:.7rem;font-weight:800;letter-spacing:.14em}.hero h3{margin:6px 0}.hero small,.controls small,.summary span,td small{display:block;color:var(--text-muted)}.hero b{padding:6px 10px;border-radius:99px;background:#43201e;color:#ffb0a5;font-size:.75rem}.usd-notice{display:flex;flex-direction:column;gap:4px;margin-bottom:14px;padding:14px 16px;border:1px solid #32694f;border-radius:12px;background:#19382b;color:#b9f5d8}.usd-notice span{font-size:.78rem}.error{padding:12px;border-radius:10px;background:#472424;color:#ffb4b4}.buttons{display:flex;gap:8px}.buttons button,.card button,.strategy-settings button{padding:8px 11px;border:1px solid var(--card-border-strong);border-radius:9px;background:transparent;color:var(--text-secondary);cursor:pointer}.buttons button:first-child{background:var(--accent);color:#18140b;font-weight:700}.buttons button.danger{background:#762f35;color:#fff}.buttons button:disabled{opacity:.45}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px}.summary article{padding:17px}.summary small{color:var(--text-muted)}.summary strong{display:block;margin:7px 0;font-size:1.25rem}.card{margin-bottom:14px;overflow:hidden}.card>header{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;border-bottom:1px solid var(--card-border)}.rules ol{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 28px;margin:15px 20px 18px;padding-left:20px;color:var(--text-secondary);font-size:.8rem}.grids{display:grid;grid-template-columns:1fr 1fr;gap:14px}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;font-size:.78rem}th,td{padding:10px 12px;border-bottom:1px solid var(--card-border);text-align:right;white-space:nowrap}th:first-child,td:first-child{text-align:left}td small{max-width:130px;overflow:hidden;text-overflow:ellipsis}.up,.buy{color:#ef7777}.down,.sell{color:#72a7ff}.empty{padding:25px!important;color:var(--text-muted)!important;text-align:center!important}.terminal{height:280px;overflow:auto;padding:13px 16px;background:#0a0f0d;font:12px/1.65 ui-monospace,Consolas,monospace}.terminal p{margin:0;word-break:break-word}.terminal time{margin-right:9px;color:#78847e}.terminal b{margin-right:5px}.terminal .candidate{color:#e7cf78}.terminal .system{color:#77dda0}.terminal .error-line{color:#f08d8d}@media(max-width:800px){.hero,.controls{align-items:flex-start;flex-direction:column;gap:12px}.buttons{width:100%;flex-direction:column}.summary,.grids{grid-template-columns:1fr}.rules ol{grid-template-columns:1fr}}
.market-hours>div{padding:14px 17px;color:var(--text-secondary);font-size:.8rem}.market-hours p{margin:5px 0}.market-hours b{color:var(--text-primary)}.market-hours header span{padding:5px 9px;border-radius:99px;font-size:.72rem;font-weight:700}.market-hours header .open{background:#1c5138;color:#9af0bd}.market-hours header .closed{background:#4b2929;color:#ffb4b4}
.settings-area{padding:0 18px 18px}.easy-guide{display:grid;gap:3px;margin-bottom:12px;padding:12px;border-radius:10px;background:#1f2924;color:#dff5e5;font-size:.86rem}.easy-guide span{color:#b6c6ba;font-size:.78rem}.strategy-settings{display:grid;grid-template-columns:1fr 1fr;gap:12px}.setting-card{padding:14px;border:1px solid var(--card-border);border-radius:12px}.screen-card{border-left:3px solid #9e8ee8}.buy-card{border-left:3px solid #d98a51}.sell-card{border-left:3px solid #68a6e8}.safety-card{border-left:3px solid #d4b466}.setting-step{margin:0;font-size:1rem;font-weight:800}.setting-description{margin:4px 0 10px;color:var(--text-muted);font-size:.78rem}.setting-field{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:11px 0;border-top:1px solid var(--card-border)}.setting-field label{color:var(--text-primary);font-size:.82rem;font-weight:700}.setting-field label span{display:block;margin-top:3px;color:var(--text-muted);font-size:.72rem;font-weight:400;line-height:1.45}.number-with-unit{display:flex;align-items:center;justify-content:flex-end;gap:5px;min-width:112px;color:#80d69a}.number-with-unit.negative{color:#f29090}.number-with-unit input{box-sizing:border-box;width:72px;padding:8px;border:1px solid var(--card-border);border-radius:8px;background:var(--input-bg,#171b20);color:var(--text-primary);text-align:right}.number-with-unit em{min-width:24px;color:var(--text-muted);font-size:.78rem;font-style:normal}.settings-error{grid-column:1/-1;margin:0;padding:10px;border-radius:8px;background:#472424;color:#ffb4b4;font-size:.8rem}.save-settings{grid-column:1/-1;justify-self:end;background:var(--accent)!important;color:#18140b!important;font-weight:800}.save-settings:disabled{cursor:not-allowed;opacity:.45}@media(max-width:800px){.strategy-settings{grid-template-columns:1fr}}@media(max-width:520px){.settings-area{padding:0 12px 14px}.setting-field{align-items:flex-start;flex-direction:column}.number-with-unit{align-self:flex-end}}
</style>
