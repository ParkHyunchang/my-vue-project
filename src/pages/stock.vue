<template>
  <div class="stock-container">
    <header class="page-header">
      <p class="page-eyebrow">
        KIWOOM
      </p>
      <h2>키움 자동매매</h2>
      <p class="page-subtitle">
        국내·미국 계좌의 운영 상태, 주문과 보유 종목을 확인합니다.
      </p>
    </header>

    <template v-if="isAdmin">
      <nav
        class="auto-market-tabs"
        aria-label="자동매매 국가 선택"
      >
        <button
          v-for="market in markets"
          :key="market.id"
          type="button"
          :data-market="market.id"
          :class="{ active: autoTradeMarket === market.id }"
          :aria-pressed="autoTradeMarket === market.id"
          @click="switchMarket(market.id)"
          @keydown="moveMarketFocus($event, market.id)"
        >
          {{ market.label }}
        </button>
      </nav>
      <p class="operation-context">
        시작·중지의 적용 범위는 각 시장의 운영 제어 안내를 확인하세요.
      </p>
      <p
        v-if="navigationError"
        class="navigation-error"
        role="alert"
      >
        {{ navigationError }}
      </p>
      <section :aria-label="autoTradeMarket === 'KR' ? '국내 자동매매 운영' : '미국 자동매매 운영'">
        <KiwoomAutoTrade v-if="autoTradeMarket === 'KR'" />
        <KiwoomUsAutoTrade v-else />
      </section>
      <ManualPortfolioCleanup
        :key="cleanupOwner"
        :owner-key="cleanupOwner"
      />
    </template>
    <section
      v-else
      class="access-notice"
      aria-labelledby="access-title"
    >
      <h3 id="access-title">
        자동매매 운영 권한이 필요합니다
      </h3>
      <p>키움 계좌 조회와 자동매매 관리는 관리자 계정으로 이용할 수 있습니다.</p>
    </section>
  </div>
</template>

<script>
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import KiwoomAutoTrade from '@/components/stock/KiwoomAutoTrade.vue';
import KiwoomUsAutoTrade from '@/components/stock/KiwoomUsAutoTrade.vue';
import ManualPortfolioCleanup from '@/components/stock/ManualPortfolioCleanup.vue';

export default {
  name: 'StockPage',
  components: { KiwoomAutoTrade, KiwoomUsAutoTrade, ManualPortfolioCleanup },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const store = useStore();
    const isAdmin = computed(() => store.getters['auth/isAdmin']);
    const cleanupOwner = computed(() => store.getters['auth/user']?.username || '');
    const markets = [{ id: 'KR', label: '국내 자동매매' }, { id: 'US', label: '미국 자동매매' }];
    // Old tab links remain valid; unknown or absent markets open the domestic view.
    // Deriving the mounted panel from the committed route preserves navigation guards.
    const autoTradeMarket = computed(() => route.query.market === 'US' ? 'US' : 'KR');
    const navigationError = ref('');
    async function switchMarket(market) {
      if (!isAdmin.value || !markets.some(item => item.id === market) || market === autoTradeMarket.value) return;
      navigationError.value = '';
      try {
        await router.push({ query: { ...route.query, tab: 'auto-trade', market } });
      } catch {
        navigationError.value = '화면을 전환하지 못했습니다. 다시 선택해 주세요.';
      }
    }
    function moveMarketFocus(event, market) {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 'KR' : event.key === 'End' ? 'US' : market === 'KR' ? 'US' : 'KR';
      event.currentTarget.parentElement?.querySelector(`[data-market="${next}"]`)?.focus();
    }
    return { isAdmin, cleanupOwner, markets, autoTradeMarket, navigationError, switchMarket, moveMarketFocus };
  },
};
</script>

<style src="@/assets/css/stock.css" scoped></style>
<style scoped>
.page-header { margin-bottom: 24px; }
.page-eyebrow { margin: 0 0 8px; color: var(--accent); font-size: 12px; font-weight: 700; letter-spacing: .12em; }
.auto-market-tabs { display: flex; gap: 8px; width: fit-content; max-width: 100%; padding: 5px; border: 1px solid var(--card-border); border-radius: var(--radius-card); background: var(--card-bg); }
.auto-market-tabs button { min-height: var(--control-height); min-width: 0; padding: 10px 22px; border: 0; border-radius: var(--radius-control); background: transparent; color: var(--text-secondary); font-weight: 700; cursor: pointer; }
.auto-market-tabs button.active { background: var(--accent); color: var(--text-on-accent); }
.auto-market-tabs button:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.operation-context { margin: 12px 0 24px; color: var(--text-muted); font-size: 13px; line-height: 1.7; }
.navigation-error { color: var(--danger-color); }
.access-notice { padding: 24px; border: 1px solid var(--card-border); border-radius: var(--radius-panel); background: var(--card-bg); }
.access-notice h3 { margin: 0 0 10px; color: var(--text-primary); font-size: 18px; }
.access-notice p { margin: 0; color: var(--text-secondary); line-height: 1.7; }
@media (max-width: 640px) {
  .auto-market-tabs { width: 100%; }
  .auto-market-tabs button { flex: 1; padding: 10px 8px; font-size: 14px; }
  .operation-context { margin-bottom: 18px; }
  .access-notice { padding: 20px; }
}
</style>
