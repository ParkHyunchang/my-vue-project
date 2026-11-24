<template>
  <section
    class="broker-accounts"
    aria-labelledby="broker-title"
    :aria-busy="loading"
  >
    <header class="broker-header">
      <div>
        <p class="eyebrow">
          증권사 계좌 조회 · 최대 30초 조회 결과 재사용
        </p><h3 id="broker-title">
          연결 계좌 현황
        </h3><p>수기 포트폴리오와 별도로 조회합니다. 기존 보유 기록과 합계에 자동 반영하지 않습니다.</p>
      </div>
      <button
        :disabled="loading"
        @click="loadAccounts"
      >
        {{ loading ? '조회 중…' : '계좌 다시 조회' }}
      </button>
    </header>
    <p
      v-if="loading"
      class="broker-notice"
      role="status"
    >
      키움 국내·미국 계좌를 확인하고 있습니다.
    </p>
    <p
      v-if="error"
      class="broker-error"
      role="alert"
    >
      {{ error }}
    </p>
    <div
      v-if="overview"
      class="broker-markets"
    >
      <article
        v-for="market in markets"
        :key="market.market"
        class="broker-card"
      >
        <header class="market-header">
          <h4>키움 · {{ market.market === 'KR' ? '국내주식' : '미국주식' }}</h4><span :class="['status', { available: market.status === 'OK' }]">{{ statusLabel(market.status) }}</span>
        </header>
        <p class="broker-meta">
          {{ market.currency }} 기준 · 증권사 계좌 조회 · 최대 30초 조회 결과 재사용
        </p>
        <p
          v-if="market.notice"
          class="broker-notice"
        >
          {{ market.notice }}
        </p>
        <template v-if="market.status === 'OK'">
          <p class="broker-meta">
            조회 완료: {{ dateLabel(market.queriedAt) }}<br>데이터 기준: {{ market.dataAsOf ? dateLabel(market.dataAsOf) : '증권사 기준 시각 미제공' }}
          </p>
          <p class="cash-line">
            예수금 <strong>{{ money(market.cash, market.currency) }}</strong>
          </p>
          <p
            v-if="!market.holdings?.length"
            class="empty"
          >
            조회된 보유 종목이 없습니다.
          </p>
          <ul
            v-else
            class="holding-list"
          >
            <li
              v-for="holding in market.holdings"
              :key="holding.symbol + ':' + (holding.exchange || '')"
            >
              <div class="holding-name">
                <strong>{{ holding.name || holding.symbol }}</strong><span>{{ holding.symbol }} · {{ holding.quantity }}주</span>
              </div>
              <dl><div><dt>현재가</dt><dd>{{ money(holding.currentPrice, holding.currency || market.currency) }}</dd></div><div><dt>평균 매입가</dt><dd>{{ money(holding.averagePrice, holding.currency || market.currency) }}</dd></div><div><dt>평가손익</dt><dd>{{ money(holding.profitLoss, holding.currency || market.currency) }}</dd></div></dl>
            </li>
          </ul>
        </template>
        <p
          v-else
          class="empty"
        >
          {{ market.status === 'UNCONFIGURED' ? '이 시장의 계좌 연결이 설정되지 않았습니다.' : '잔고를 확인하지 못했습니다. 잠시 후 다시 조회해 주세요.' }}
        </p>
      </article>
    </div>
    <section
      class="other-brokers"
      aria-labelledby="other-brokers-title"
    >
      <h4 id="other-brokers-title">
        다른 증권사
      </h4>
      <p>연결 방식과 계좌별 조회 권한을 확인한 뒤 지원할 수 있습니다. 이 화면에서는 인증키나 계좌 비밀번호를 입력받지 않습니다.</p>
      <div class="broker-markets">
        <article class="broker-card">
          <header class="market-header">
            <h4>삼성증권</h4><span class="status">미연결</span>
          </header><p>개인 계좌 조회 API와 신청 경로가 확인되지 않았습니다. 아래는 HTS 조회 안내이며 API 신청 링크가 아닙니다. 증권사 문의 후 연동 가능 여부를 확인해야 합니다.</p><a
            href="https://samsungpop.com/contents/poptrading/help/4201.html"
            target="_blank"
            rel="noopener noreferrer"
          >삼성증권 HTS 조회 안내 ↗</a>
        </article>
        <article class="broker-card">
          <header class="market-header">
            <h4>신한투자증권</h4><span class="status">미연결</span>
          </header><p>아직 이용 신청 전입니다. Windows 기반 i indi 이용 신청과 실행 환경이 필요합니다. 미국주식 잔고 조회 지원 범위는 추가 확인이 필요합니다.</p><a
            href="https://www.shinhansec.com/siw/customer-center/channel/channel_homeTrading-indi/contents.do"
            target="_blank"
            rel="noopener noreferrer"
          >신한 i indi 이용 안내 ↗</a>
        </article>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { fetchKiwoomAccountsOverview } from '@/api/kiwoomAccountsApi';
import { apiErrorMessage } from '@/utils/apiError';

const loading = ref(false);
const error = ref('');
const overview = ref(null);
const markets = computed(() => overview.value?.markets || []);
function statusLabel(status) {
  return { OK: '조회 완료', UNCONFIGURED: '미연결', ERROR: '조회 실패' }[status] || '확인 필요';
}
function money(value, currency) {
  if (value == null || value === '' || !Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: currency === 'USD' ? 'USD' : 'KRW', maximumFractionDigits: currency === 'USD' ? 2 : 0 }).format(Number(value));
}
function dateLabel(value) {
  if (!value) return '확인되지 않음';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '확인되지 않음' : date.toLocaleString('ko-KR');
}
async function loadAccounts() {
  if (loading.value) return;
  loading.value = true;
  error.value = '';
  overview.value = null;
  try {
    const response = await fetchKiwoomAccountsOverview();
    overview.value = response.data;
  } catch (failure) {
    error.value = failure.response?.status === 403 ? '계좌 조회는 관리자 권한이 필요합니다.' : apiErrorMessage(failure, '계좌 정보를 불러오지 못했습니다. 다시 조회해 주세요.');
  } finally { loading.value = false; }
}
onMounted(loadAccounts);
</script>

<style scoped>
.broker-accounts { color: var(--text-primary); }
.broker-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 20px; }
.broker-header h3 { margin: 6px 0 10px; font-size: 24px; }
.broker-header p, .broker-card p, .other-brokers > p { color: var(--text-secondary); line-height: 1.7; font-size: 13px; }
.broker-header .eyebrow { color: var(--accent); margin: 0; }
.broker-header button { min-height: 44px; padding: 10px 16px; flex-shrink: 0; border: 1px solid var(--card-border); border-radius: 10px; background: var(--card-bg); color: var(--text-primary); cursor: pointer; }
.broker-header button:disabled { opacity: .6; cursor: wait; }
.broker-markets { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 16px; }
.broker-card { min-width: 0; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: var(--radius-card); padding: 20px; }
.market-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.market-header h4 { margin: 0; font-size: 17px; }
.status { padding: 4px 9px; border-radius: 8px; background: var(--card-bg-2); color: var(--text-secondary); font-size: 12px; }
.status.available { color: var(--success-color); background: var(--success-bg); }
.broker-meta { font-size: 12px!important; color: var(--text-muted)!important; }
.cash-line { display: flex; justify-content: space-between; gap: 10px; border-top: 1px solid var(--card-border); padding-top: 14px; }
.empty { padding: 18px 0; }
.holding-list { list-style: none; padding: 0; margin: 12px 0 0; }
.holding-list li { border-top: 1px solid var(--card-border); padding: 16px 0; }
.holding-name { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; }
.holding-name strong { overflow-wrap: anywhere; }
.holding-name span { color: var(--text-muted); font-size: 12px; }
.holding-list dl { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 8px; margin-bottom: 0; }
.holding-list dt { color: var(--text-muted); font-size: 11px; }
.holding-list dd { margin: 6px 0 0; font-size: 13px; overflow-wrap: anywhere; }
.broker-notice { padding: 12px; border-radius: 10px; background: var(--card-bg-2); line-height: 1.7; }
.broker-error { color: var(--danger-color); background: var(--danger-bg); padding: 14px; border-radius: 10px; }
.other-brokers { margin-top: 32px; }
.broker-card a { display: inline-flex; align-items: center; min-height: 44px; color: var(--accent); font-size: 13px; }
.broker-accounts :is(a,button):focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
@media(max-width: 760px) { .broker-markets { grid-template-columns: 1fr; } .broker-header { flex-direction: column; gap: 12px; } .broker-header button { width: 100%; } .broker-card { padding: 16px; } }
</style>
