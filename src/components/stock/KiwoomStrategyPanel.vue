<template>
  <section class="strategy-panel">
    <header>
      <div><small>KIWOOM STRATEGY</small><h3>AI 전략 제안 <em>DRY-RUN</em></h3></div>
      <button
        :disabled="pending || !configured"
        @click="decide"
      >
        지금 판단
      </button>
    </header>
    <p class="notice">
      AI는 제안만 기록합니다. 이 화면이나 API는 주문을 실행하지 않습니다.
    </p>
    <p
      v-if="error"
      class="error"
    >
      {{ error }}
    </p>
    <form
      class="watch-form"
      @submit.prevent="addWatch"
    >
      <input
        v-model.trim="code"
        maxlength="100"
        placeholder="종목코드 (선택)"
      >
      <input
        v-model.trim="name"
        maxlength="100"
        placeholder="종목명 (코드 없이 등록 가능)"
      >
      <input
        v-model.trim="note"
        maxlength="200"
        placeholder="메모 (선택)"
      >
      <button :disabled="pending">
        추가
      </button>
    </form>
    <div class="watch-list">
      <span
        v-for="item in watchlist"
        :key="item.id"
      >{{ item.stockName }} · {{ item.stockCode }}<button
        type="button"
        title="삭제"
        @click="removeWatch(item.id)"
      >×</button></span>
      <small v-if="!watchlist.length">관심종목을 추가하면 판단 대상에 포함됩니다.</small>
    </div>
    <div class="runs">
      <article
        v-for="run in runs"
        :key="run.id"
      >
        <div class="run-meta">
          <b>{{ run.status }}</b><small>{{ date(run.createdAt) }} · {{ run.triggeredBy }}</small>
        </div>
        <p>{{ run.marketView || run.errorMessage || '생성된 제안이 없습니다.' }}</p>
        <div class="proposals">
          <div
            v-for="proposal in run.proposals"
            :key="proposal.id"
            :class="['proposal', proposal.action]"
          >
            <b>{{ proposal.action }}</b><span>{{ proposal.stockName }} ({{ proposal.stockCode }})</span>
            <span v-if="proposal.quantity">{{ proposal.quantity.toLocaleString() }}주</span>
            <span v-if="proposal.limitPrice">{{ proposal.limitPrice.toLocaleString() }}원</span>
            <small>{{ proposal.confidence }}% · {{ proposal.reason }}</small>
            <small
              v-if="proposal.guardFlags"
              class="guards"
            >안전 경고: {{ proposal.guardFlags }}</small>
          </div>
        </div>
      </article>
      <p
        v-if="!loading && !runs.length"
        class="empty"
      >
        아직 전략 판단 이력이 없습니다.
      </p>
    </div>
  </section>
</template>

<script setup>
/* global defineProps */
import { onMounted, ref } from 'vue'
import axios from '@/axios'

defineProps({ configured: Boolean })
const watchlist = ref([]), runs = ref([]), code = ref(''), name = ref(''), note = ref('')
const pending = ref(false), loading = ref(false), error = ref('')
const date = (value) => value ? new Date(value).toLocaleString('ko-KR', { hour12: false }) : ''
async function load() {
  loading.value = true
  try {
    const [watch, history] = await Promise.all([axios.get('/api/kiwoom/strategy/watchlist'), axios.get('/api/kiwoom/strategy/runs?limit=10')])
    watchlist.value = watch.data
    runs.value = history.data
  } catch (e) { error.value = e.response?.data?.message || '전략 데이터를 불러오지 못했습니다.' } finally { loading.value = false }
}
async function decide() {
  pending.value = true; error.value = ''
  try { await axios.post('/api/kiwoom/strategy/decide'); await load() } catch (e) { error.value = e.response?.data?.message || '전략 판단에 실패했습니다.' } finally { pending.value = false }
}
async function addWatch() {
  const query = /^\d{6}$/.test(code.value) ? code.value : (name.value || code.value)
  if (!query) { error.value = '종목코드 또는 종목명을 입력하세요.'; return }
  pending.value = true; error.value = ''
  try {
    let stockCode = query
    let stockName = ''
    if (!/^\d{6}$/.test(query)) {
      const { data } = await axios.get('/api/stock/search', { params: { q: query } })
      const exact = data.filter((item) => item.market === 'KR' && item.name === query)
      if (exact.length !== 1) {
        error.value = exact.length > 1 ? '같은 이름의 종목이 여러 개입니다. 종목코드를 입력하세요.' : '국내 종목명을 찾지 못했습니다.'
        return
      }
      // KRX search returns Yahoo-style symbols such as 005930.KS/005930.KQ,
      // while Kiwoom requires its six-digit code without the exchange suffix.
      stockCode = exact[0].symbol.replace(/\.(KS|KQ)$/i, '')
      stockName = exact[0].name
    }
    await axios.post('/api/kiwoom/strategy/watchlist', { stockCode, stockName, note: note.value })
    code.value = ''; name.value = ''; note.value = ''; await load()
  } catch (e) { error.value = e.response?.data?.message || '관심종목을 추가하지 못했습니다.' } finally { pending.value = false }
}
async function removeWatch(id) { pending.value = true; try { await axios.delete(`/api/kiwoom/strategy/watchlist/${id}`); await load() } catch { error.value = '관심종목을 삭제하지 못했습니다.' } finally { pending.value = false } }
onMounted(load)
</script>

<style scoped>
.strategy-panel{margin:14px 0;color:var(--text-primary);background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;padding:18px}.strategy-panel header{display:flex;align-items:center;justify-content:space-between}.strategy-panel h3{margin:4px 0}.strategy-panel header small{color:var(--accent);font-weight:800;letter-spacing:.1em}.strategy-panel em{font-style:normal;color:#e9b664;font-size:.7rem;margin-left:6px}.strategy-panel button{cursor:pointer;border:1px solid var(--card-border-strong);border-radius:8px;padding:7px 10px;background:transparent;color:var(--text-primary)}.strategy-panel button:disabled{opacity:.5;cursor:not-allowed}.notice,.error{padding:10px;border-radius:8px;font-size:.82rem}.notice{background:#3c3424;color:#f2ce8b}.error{background:#482424;color:#ffb4b4}.watch-form{display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:7px;margin:12px 0}.watch-form input{min-width:0;border:1px solid var(--card-border);border-radius:8px;padding:8px;background:transparent;color:inherit}.watch-list{display:flex;flex-wrap:wrap;gap:6px}.watch-list span{background:#1f2924;border-radius:99px;font-size:.77rem;padding:5px 8px}.watch-list span button{border:0;padding:0 0 0 5px;color:#ff9f9f}.watch-list small,.empty{color:var(--text-muted)}.runs{margin-top:15px}.runs article{border-top:1px solid var(--card-border);padding:12px 0}.run-meta{display:flex;gap:8px;align-items:center}.run-meta b{font-size:.7rem;background:#303a34;padding:3px 6px;border-radius:5px}.run-meta small{color:var(--text-muted)}.runs p{font-size:.84rem;margin:7px 0}.proposals{display:flex;flex-wrap:wrap;gap:7px}.proposal{border-radius:8px;padding:7px;font-size:.76rem;display:flex;gap:5px;flex-wrap:wrap}.proposal small{width:100%;opacity:.8}.proposal.BUY{background:#4a2626;color:#ffbab4}.proposal.SELL{background:#213853;color:#b9d7ff}.proposal.HOLD{background:#30343a;color:#d9dce0}@media(max-width:700px){.watch-form{grid-template-columns:1fr 1fr}.watch-form input:last-of-type{grid-column:span 2}}
</style>
