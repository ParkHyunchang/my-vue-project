<template>
  <div>
    <!-- 빈 상태 -->
    <div v-if="holdings.length === 0" class="portfolio-empty">
      <div class="portfolio-empty-icon">📊</div>
      <h3>보유 종목이 없습니다</h3>
      <p>
        보유 중인 주식을 추가하면 평가금액과 종목 비중을 한눈에 확인할 수
        있습니다.
      </p>
      <button class="btn-add-primary" @click="openAddModal">
        ＋ 종목 추가
      </button>
    </div>

    <template v-else>
      <!-- 요약 바 -->
      <div class="portfolio-summary">
        <div class="ps-left">
          <span class="ps-count">
            {{ marketFilter === 'all' ? '전체' : marketFilter === 'kr' ? '🇰🇷 한국' : '🇺🇸 미국' }}
            {{ filteredHoldings.length }}종목
          </span>
          <template v-if="marketFilter === 'all' && krHoldingsCount > 0 && usHoldingsCount > 0">
            <div class="ps-breakdown">
              <div class="ps-bd-row">
                <span class="ps-bd-label">🇰🇷 한국</span>
                <span class="ps-bd-val">{{ fmtKRW(krTotal) }}</span>
                <span v-if="krHasAvgPrice" :class="['ps-bd-pnl', pnlCls(krPnl)]">
                  {{ krPnl >= 0 ? "▲" : "▼" }} {{ fmtKRW(Math.abs(krPnl)) }}
                  <span class="ps-bd-pct">({{ krPnlPct >= 0 ? "+" : "" }}{{ krPnlPct.toFixed(2) }}%)</span>
                </span>
              </div>
              <div class="ps-bd-row">
                <span class="ps-bd-label">🇺🇸 미국</span>
                <div class="ps-bd-val-group">
                  <span class="ps-bd-val">{{ fmtUSD(usTotal) }}</span>
                  <span v-if="usTotalKRW > 0" class="ps-us-krw">≈ {{ fmtKRW(usTotalKRW) }}</span>
                </div>
                <span v-if="usHasAvgPrice" :class="['ps-bd-pnl', pnlCls(usPnl)]">
                  {{ usPnl >= 0 ? "▲" : "▼" }} {{ fmtUSD(Math.abs(usPnl)) }}
                  <span class="ps-bd-pct">({{ usPnlPct >= 0 ? "+" : "" }}{{ usPnlPct.toFixed(2) }}%)</span>
                </span>
              </div>
              <div class="ps-bd-total">
                <span class="ps-bd-total-label">전체</span>
                <span v-if="exchangeRate > 0" class="ps-bd-val">{{ fmtKRW(totalValKRW) }}</span>
                <template v-if="krHasAvgPrice || (usHasAvgPrice && exchangeRate > 0)">
                  <span class="ps-cost-label">투자원금 {{ fmtKRW(totalCostKRW) }}</span>
                  <span :class="['ps-pnl-val', pnlCls(totalPnlKRW)]">
                    {{ totalPnlKRW >= 0 ? "▲" : "▼" }} {{ fmtKRW(Math.abs(totalPnlKRW)) }}
                  </span>
                  <span :class="['ps-pnl-pct', pnlCls(totalPnlKRW)]">
                    ({{ totalPnlKRWPct >= 0 ? "+" : "" }}{{ totalPnlKRWPct.toFixed(2) }}%)
                  </span>
                </template>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="ps-totals">
              <span v-if="krTotal > 0" class="ps-total-val">🇰🇷 {{ fmtKRW(krTotal) }}</span>
              <span v-if="krTotal > 0 && usTotal > 0" class="ps-sep">·</span>
              <div v-if="usTotal > 0" class="ps-us-wrap">
                <span class="ps-total-val">🇺🇸 {{ fmtUSD(usTotal) }}</span>
                <span v-if="usTotalKRW > 0" class="ps-us-krw">≈ {{ fmtKRW(usTotalKRW) }}</span>
              </div>
            </div>
            <div v-if="hasAvgPrice" class="ps-pnl">
              <span class="ps-cost-label">투자원금 {{ fmtAbsPnl(totalCost) }}</span>
              <span :class="['ps-pnl-val', pnlCls(totalPnl)]">
                {{ totalPnl >= 0 ? "▲" : "▼" }} {{ fmtAbsPnl(totalPnl) }}
              </span>
              <span :class="['ps-pnl-pct', pnlCls(totalPnl)]">
                ({{ totalPnlPct >= 0 ? "+" : "" }}{{ totalPnlPct.toFixed(2) }}%)
              </span>
            </div>
          </template>
        </div>
        <button class="btn-add-sm" @click="openAddModal">＋ 추가</button>
      </div>

      <!-- 마켓 필터 바 -->
      <div class="balance-filter-bar">
        <button :class="['bfb-btn', { active: marketFilter === 'all' }]" @click="marketFilter = 'all'">
          전체 <span class="bfb-count">{{ holdings.length }}</span>
        </button>
        <button :class="['bfb-btn', { active: marketFilter === 'kr' }]" @click="marketFilter = 'kr'">
          🇰🇷 한국 <span class="bfb-count">{{ krHoldingsCount }}</span>
        </button>
        <button :class="['bfb-btn', { active: marketFilter === 'us' }]" @click="marketFilter = 'us'">
          🇺🇸 미국 <span class="bfb-count">{{ usHoldingsCount }}</span>
        </button>
        <div v-if="exchangeRate > 0" class="exrate-info">
          <span class="exrate-val">1$ = {{ fmtKRW(exchangeRate) }}</span>
          <span v-if="exRateAt" class="exrate-at">{{ exRateAt }} 기준</span>
        </div>
      </div>

      <!-- 목록 / 차트 전환 탭 -->
      <div class="portfolio-view-tabs">
        <button
          :class="['pv-tab', { active: portfolioView === 'grid' }]"
          @click="portfolioView = 'grid'"
        >
          ≡ 목록
        </button>
        <button
          :class="['pv-tab', { active: portfolioView === 'chart' }]"
          @click="portfolioView = 'chart'"
        >
          ◎ 차트
        </button>
      </div>

      <!-- 새로고침 바 -->
      <div class="price-refresh-bar">
        <span v-if="lastUpdatedAt" class="prf-updated">↻ {{ relativeUpdated }}</span>
        <button class="prf-btn" :disabled="priceLoading" @click="fetchPrices">
          {{ priceLoading ? '로딩 중...' : '↻ 새로고침' }}
        </button>
      </div>

      <!-- 현재가 로딩 -->
      <div v-if="priceLoading" class="loading-state" style="padding: 24px 0">
        <div class="spinner"></div>
        <span>현재가 조회 중...</span>
      </div>

      <!-- 필터 결과 없음 -->
      <div v-else-if="sortedHoldings.length === 0" class="filter-empty">
        <span>{{ marketFilter === 'kr' ? '🇰🇷 국내' : '🇺🇸 미국' }} 보유 종목이 없습니다</span>
      </div>

      <!-- 목록 뷰 -->
      <template v-else-if="portfolioView === 'grid'">
        <!-- 데스크탑 테이블 -->
        <div class="holdings-table-wrap">
          <table class="holdings-table">
            <thead>
              <tr>
                <th class="sortable-th" @click="toggleSort('name')">
                  종목<span class="sort-ind">{{ sortKey === 'name' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '' }}</span>
                </th>
                <th class="th-r">보유수량</th>
                <th class="th-r sortable-th" @click="toggleSort('curPrice')">
                  현재가<span class="sort-ind">{{ sortKey === 'curPrice' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '' }}</span>
                </th>
                <th class="th-r sortable-th" @click="toggleSort('changePct')">
                  등락률<span class="sort-ind">{{ sortKey === 'changePct' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '' }}</span>
                </th>
                <th class="th-r sortable-th" @click="toggleSort('value')">
                  평가금액<span class="sort-ind">{{ sortKey === 'value' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '' }}</span>
                </th>
                <th class="th-r">평단가</th>
                <th class="th-r">평가손익</th>
                <th class="th-r sortable-th" @click="toggleSort('pnlPct')">
                  수익률<span class="sort-ind">{{ sortKey === 'pnlPct' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '' }}</span>
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="h in sortedHoldings" :key="h.id">
                <template v-if="editingId === h.id">
                  <td class="hname-cell">
                    <span class="mkt-flag">{{ h.market === "KR" ? "🇰🇷" : "🇺🇸" }}</span>
                    <div>
                      <div class="h-name">{{ h.name }}</div>
                      <div class="h-sym">{{ h.symbol }}</div>
                    </div>
                  </td>
                  <td class="td-r">
                    <input v-model.number="editForm.quantity" type="number" min="1" class="inline-inp" />
                  </td>
                  <td class="td-r">{{ fmtCurPrice(h) }}</td>
                  <td class="td-r">
                    <span :class="['change-badge', changePctCls(h) || 'neutral']">{{ fmtChangePctDisplay(h) }}</span>
                  </td>
                  <td class="td-r">{{ fmtHoldVal(h) }}</td>
                  <td class="td-r">
                    <input v-model.number="editForm.avgPrice" type="number" min="0" class="inline-inp" placeholder="미입력" />
                  </td>
                  <td class="td-r">—</td>
                  <td class="td-r">—</td>
                  <td class="td-act">
                    <button class="act-btn act-save" @click="saveEdit(h)">저장</button>
                    <button class="act-btn act-cancel" @click="editingId = null">취소</button>
                  </td>
                </template>
                <template v-else>
                  <td class="hname-cell">
                    <span class="mkt-flag">{{ h.market === "KR" ? "🇰🇷" : "🇺🇸" }}</span>
                    <div>
                      <div class="h-name">{{ h.name }}</div>
                      <div class="h-sym">{{ h.symbol }}</div>
                    </div>
                  </td>
                  <td class="td-r">{{ h.quantity.toLocaleString() }}</td>
                  <td class="td-r">{{ fmtCurPrice(h) }}</td>
                  <td class="td-r">
                    <span :class="['change-badge', changePctCls(h) || 'neutral']">{{ fmtChangePctDisplay(h) }}</span>
                  </td>
                  <td class="td-r">
                    {{ fmtHoldVal(h) }}
                    <div v-if="h.market === 'US' && holdValKRW(h) > 0" class="td-krw-sub">
                      ≈ {{ fmtKRW(holdValKRW(h)) }}
                    </div>
                  </td>
                  <td class="td-r">
                    <span v-if="h.avgPrice">{{ fmtByMkt(h.avgPrice, h.market) }}</span>
                    <span v-else class="txt-muted">—</span>
                  </td>
                  <td class="td-r"><span :class="pnlCls(holdPnl(h))">{{ fmtHoldPnl(h) }}</span></td>
                  <td class="td-r"><span :class="['pnl-pct', pnlCls(holdPnlPct(h))]">{{ fmtHoldPnlPct(h) }}</span></td>
                  <td class="td-act">
                    <button class="act-btn act-edit" @click="startEdit(h)">수정</button>
                    <button class="act-btn act-del" @click="removeHolding(h.id)">삭제</button>
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 모바일 카드 뷰 -->
        <div class="holdings-cards">
          <div v-for="h in sortedHoldings" :key="h.id" class="holding-card">
            <template v-if="editingId === h.id">
              <div class="hcard-header">
                <div class="hcard-name-wrap">
                  <span class="mkt-flag">{{ h.market === "KR" ? "🇰🇷" : "🇺🇸" }}</span>
                  <div>
                    <div class="h-name">{{ h.name }}</div>
                    <div class="h-sym">{{ h.symbol }}</div>
                  </div>
                </div>
                <div class="hcard-price-wrap">
                  <div class="hcard-price">{{ fmtCurPrice(h) }}</div>
                  <span :class="['change-badge', changePctCls(h) || 'neutral']" style="margin-top:4px; display:inline-block;">{{ fmtChangePctDisplay(h) }}</span>
                </div>
              </div>
              <div class="hcard-edit-body">
                <div class="hcard-edit-row">
                  <label class="hcard-edit-label">보유수량</label>
                  <input v-model.number="editForm.quantity" type="number" min="1" class="hcard-edit-inp" />
                </div>
                <div class="hcard-edit-row">
                  <label class="hcard-edit-label">평단가 <span class="opt-label">(선택)</span></label>
                  <input v-model.number="editForm.avgPrice" type="number" min="0" class="hcard-edit-inp" :placeholder="h.market === 'KR' ? '원 단위' : 'USD'" />
                </div>
              </div>
              <div class="hcard-actions">
                <button class="act-btn act-save" @click="saveEdit(h)">저장</button>
                <button class="act-btn act-cancel" @click="editingId = null">취소</button>
              </div>
            </template>
            <template v-else>
              <div class="hcard-header">
                <div class="hcard-name-wrap">
                  <span class="mkt-flag">{{ h.market === "KR" ? "🇰🇷" : "🇺🇸" }}</span>
                  <div>
                    <div class="h-name">{{ h.name }}</div>
                    <div class="h-sym">{{ h.symbol }}</div>
                  </div>
                </div>
                <div class="hcard-price-wrap">
                  <div class="hcard-price">{{ fmtCurPrice(h) }}</div>
                  <span :class="['change-badge', changePctCls(h) || 'neutral']" style="margin-top:4px; display:inline-block;">{{ fmtChangePctDisplay(h) }}</span>
                </div>
              </div>
              <div class="hcard-body">
                <div class="hcard-row">
                  <span class="hcard-label">보유수량</span>
                  <span>{{ h.quantity.toLocaleString() }}주</span>
                </div>
                <div class="hcard-row">
                  <span class="hcard-label">평가금액</span>
                  <span>{{ fmtHoldVal(h) }}</span>
                </div>
                <div v-if="h.avgPrice" class="hcard-row">
                  <span class="hcard-label">평단가</span>
                  <span>{{ fmtByMkt(h.avgPrice, h.market) }}</span>
                </div>
                <div v-if="holdPnl(h) !== null" class="hcard-row">
                  <span class="hcard-label">평가손익</span>
                  <span :class="pnlCls(holdPnl(h))">{{ fmtHoldPnl(h) }}</span>
                </div>
                <div v-if="holdPnlPct(h) !== null" class="hcard-row">
                  <span class="hcard-label">수익률</span>
                  <span :class="pnlCls(holdPnlPct(h))">{{ fmtHoldPnlPct(h) }}</span>
                </div>
              </div>
              <div class="hcard-actions">
                <button class="act-btn act-edit" @click="startEdit(h)">수정</button>
                <button class="act-btn act-del" @click="removeHolding(h.id)">삭제</button>
              </div>
            </template>
          </div>
        </div>
      </template>

      <!-- 차트 뷰 -->
      <div v-else class="chart-view">
        <div class="chart-inner">
          <div class="donut-box">
            <svg viewBox="-100 -100 200 200" class="donut-svg">
              <path
                v-for="seg in chartSegments"
                :key="seg.id"
                :d="seg.path"
                :fill="seg.color"
                :style="{ opacity: hoveredSegId && hoveredSegId !== seg.id ? 0.45 : 1 }"
                class="donut-seg"
                @mouseenter="hoveredSegId = seg.id"
                @mouseleave="hoveredSegId = null"
              />
              <template v-for="seg in chartSegments" :key="'lbl-' + seg.id">
                <text
                  v-if="seg.pct >= 0.05"
                  :x="seg.labelX"
                  :y="seg.labelY"
                  text-anchor="middle"
                  dominant-baseline="middle"
                  font-size="7"
                  font-weight="700"
                  fill="white"
                  style="pointer-events: none"
                >
                  {{ (seg.pct * 100).toFixed(1) }}%
                </text>
              </template>
              <template v-if="hoveredSegment">
                <text y="-18" text-anchor="middle" font-size="8" fill="var(--text-muted)" style="pointer-events:none">{{ hoveredSegment.name.length > 8 ? hoveredSegment.name.slice(0,7) + '…' : hoveredSegment.name }}</text>
                <text y="-3" text-anchor="middle" font-size="14" font-weight="700" fill="var(--accent)" style="pointer-events:none">{{ (hoveredSegment.pct * 100).toFixed(1) }}%</text>
                <text y="14" text-anchor="middle" font-size="7.5" fill="var(--text-primary)" style="pointer-events:none">{{ fmtLegVal(hoveredSegment) }}</text>
              </template>
              <template v-else>
                <text
                  class="donut-lbl1"
                  y="-10"
                  text-anchor="middle"
                  font-size="9"
                  fill="var(--text-muted)"
                  style="pointer-events:none"
                >
                  총 평가
                </text>
                <text
                  class="donut-lbl2"
                  y="8"
                  text-anchor="middle"
                  font-size="15"
                  font-weight="600"
                  fill="var(--text-primary)"
                  style="pointer-events:none"
                >
                  {{ filteredHoldings.length }}종목
                </text>
              </template>
            </svg>
          </div>
          <div class="chart-legend">
            <div v-for="seg in chartSegments" :key="seg.id" class="leg-row">
              <span class="leg-dot" :style="{ background: seg.color }"></span>
              <span class="leg-name">{{ seg.name }}</span>
              <div class="leg-right">
                <span class="leg-pct">{{ (seg.pct * 100).toFixed(1) }}%</span>
                <span class="leg-val">{{ fmtLegVal(seg) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ══════════════════════════════════════════
         종목 추가 모달
    ══════════════════════════════════════════ -->
    <teleport to="body">
      <div
        v-if="showAddModal"
        class="modal-overlay"
        @click.self="closeAddModal"
      >
        <div class="modal-box">
          <div class="modal-hdr">
            <h3>종목 추가</h3>
            <button class="modal-close" @click="closeAddModal">✕</button>
          </div>

          <div class="mform-row">
            <label>종목 검색 ( 종목코드 )</label>
            <div class="stock-search-box">
              <input
                v-model="searchQ"
                type="text"
                placeholder="삼성전자, Tesla, NVDA, 005930.KS..."
                class="stock-search-inp"
                autocomplete="off"
                @input="onSearchInput"
                @focus="showDropdown = true"
                @blur="onSearchBlur"
              />
              <div v-if="searchLoading" class="search-loading">검색 중...</div>
              <div
                v-else-if="showDropdown && searchResults.length > 0"
                class="stock-dropdown"
              >
                <div
                  v-for="s in searchResults"
                  :key="s.symbol"
                  class="stock-drop-item"
                  @mousedown.prevent="selectStock(s)"
                >
                  <span class="sdi-flag">{{ s.market === "KR" ? "🇰🇷" : "🇺🇸" }}</span>
                  <div class="sdi-info">
                    <span class="sdi-name">{{ s.name }}</span>
                    <span class="sdi-meta">{{ s.symbol }} · {{ s.exchange }}</span>
                  </div>
                  <span class="sdi-type">{{ s.type }}</span>
                </div>
              </div>
              <div
                v-else-if="
                  showDropdown &&
                  searchQ.length > 1 &&
                  !searchLoading &&
                  searchResults.length === 0
                "
                class="search-empty"
              >
                검색 결과가 없습니다
              </div>
            </div>
          </div>

          <div class="mform-row">
            <label>종목명</label>
            <input
              v-model="newHolding.name"
              type="text"
              placeholder="위에서 종목을 검색하세요"
              readonly
              class="inp-readonly"
            />
          </div>
          <div class="mform-row">
            <label>심볼</label>
            <input
              v-model="newHolding.symbol"
              type="text"
              placeholder="위에서 종목을 검색하세요"
              readonly
              class="inp-readonly"
            />
          </div>

          <div v-if="newHolding.symbol" class="detected-market">
            <span>감지된 시장:</span>
            <span class="dm-badge">
              {{
                newHolding.symbol.toUpperCase().endsWith(".KS") ||
                newHolding.symbol.toUpperCase().endsWith(".KQ")
                  ? "🇰🇷 국내 (KRW)"
                  : newHolding.market === "KR"
                  ? "🇰🇷 국내 (KRW)"
                  : "🇺🇸 미국 (USD)"
              }}
            </span>
          </div>

          <div class="mform-row">
            <label>보유수량</label>
            <input
              v-model.number="newHolding.quantity"
              type="number"
              min="1"
              placeholder="0"
            />
          </div>

          <div class="mform-row">
            <label>평단가 <span class="opt-label">(선택)</span></label>
            <input
              v-model.number="newHolding.avgPrice"
              type="number"
              min="0"
              :placeholder="newHolding.market === 'KR' ? '원 단위' : 'USD'"
            />
          </div>

          <div class="modal-actions">
            <button class="mbtn-cancel" @click="closeAddModal">취소</button>
            <button class="mbtn-submit" :disabled="!canAdd" @click="addHolding">
              추가
            </button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import axios from "@/axios";
import { useStockFormatters } from "@/composables/useStockFormatters";

const CHART_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#3b82f6",
  "#ec4899", "#8b5cf6", "#ef4444", "#14b8a6",
  "#f97316", "#a78bfa", "#34d399", "#fb923c",
];

const PORTFOLIO_KEY = "stock_portfolio";

export default {
  name: "PortfolioPanel",
  props: {
    active: { type: Boolean, default: false },
  },
  emits: ["holdings-changed"],
  setup(props, { emit }) {
    const { fmtKRW, fmtUSD, fmtByMkt, pnlCls } = useStockFormatters();

    const holdings = ref([]);
    const prices = ref({});
    const priceLoading = ref(false);
    const portfolioView = ref("grid");
    const marketFilter = ref("all");
    const exchangeRate = ref(0);
    const exRateAt = ref("");

    const showAddModal = ref(false);
    const searchQ = ref("");
    const showDropdown = ref(false);
    const searchResults = ref([]);
    const searchLoading = ref(false);
    const newHolding = ref({
      market: "US", name: "", symbol: "", quantity: null, avgPrice: null,
    });
    let searchTimer = null;

    const editingId = ref(null);
    const editForm = ref({ quantity: null, avgPrice: null });

    const lastUpdatedAt = ref(null);
    const relativeUpdated = ref("");
    const sortKey = ref(localStorage.getItem("stock_sortKey") || "");
    const sortDir = ref(localStorage.getItem("stock_sortDir") || "asc");
    const hoveredSegId = ref(null);

    let refreshTimer = null;
    let relativeTimer = null;

    function emitHoldingsChanged() {
      emit("holdings-changed", holdings.value);
    }

    async function initPortfolio() {
      try {
        holdings.value = JSON.parse(localStorage.getItem(PORTFOLIO_KEY)) || [];
      } catch {
        holdings.value = [];
      }
      const localData = [...holdings.value];
      try {
        const res = await axios.get("/api/portfolio/holdings");
        const serverData = res.data || [];
        if (serverData.length > 0) {
          holdings.value = serverData;
          localStorage.removeItem(PORTFOLIO_KEY);
        } else if (localData.length > 0) {
          for (const h of localData) {
            await axios.post("/api/portfolio/holdings", {
              market: h.market, name: h.name, symbol: h.symbol,
              quantity: h.quantity, avgPrice: h.avgPrice,
            });
          }
          const refreshed = await axios.get("/api/portfolio/holdings");
          holdings.value = refreshed.data || [];
          localStorage.removeItem(PORTFOLIO_KEY);
        }
      } catch {
        holdings.value = localData;
      }
      emitHoldingsChanged();
    }

    async function fetchPrices() {
      if (holdings.value.length === 0) return;
      priceLoading.value = true;
      const results = {};
      const tasks = holdings.value.map(async (h) => {
        try {
          const res = await axios.get("/api/stock/quote", {
            params: { symbol: h.symbol, market: h.market.toLowerCase() },
          });
          results[h.symbol] = res.data;
        } catch { /* noop */ }
      });
      const hasUs = holdings.value.some((h) => h.market === "US");
      if (hasUs) tasks.push(fetchExchangeRate());
      await Promise.all(tasks);
      prices.value = results;
      priceLoading.value = false;
      lastUpdatedAt.value = new Date();
      updateRelativeTime();
    }

    function updateRelativeTime() {
      if (!lastUpdatedAt.value) return;
      const sec = Math.floor((Date.now() - lastUpdatedAt.value.getTime()) / 1000);
      if (sec < 10) relativeUpdated.value = "방금 전 업데이트";
      else if (sec < 60) relativeUpdated.value = `${sec}초 전 업데이트`;
      else relativeUpdated.value = `${Math.floor(sec / 60)}분 전 업데이트`;
    }

    async function fetchExchangeRate() {
      try {
        const res = await axios.get("/api/stock/quote", {
          params: { symbol: "USDKRW=X", market: "us" },
        });
        if (res.data?.price) {
          exchangeRate.value = res.data.price;
          exRateAt.value = new Date().toLocaleTimeString("ko-KR", {
            hour: "2-digit", minute: "2-digit",
          });
        }
      } catch { /* noop */ }
    }

    function openAddModal() { showAddModal.value = true; }
    function closeAddModal() {
      showAddModal.value = false;
      searchQ.value = "";
      showDropdown.value = false;
      searchResults.value = [];
      newHolding.value = {
        market: "US", name: "", symbol: "", quantity: null, avgPrice: null,
      };
    }

    function onSearchInput() {
      clearTimeout(searchTimer);
      showDropdown.value = true;
      if (!searchQ.value.trim()) {
        searchResults.value = [];
        searchLoading.value = false;
        return;
      }
      searchLoading.value = true;
      searchTimer = setTimeout(async () => {
        try {
          const res = await axios.get("/api/stock/search", {
            params: { q: searchQ.value.trim() },
          });
          searchResults.value = res.data;
        } catch {
          searchResults.value = [];
        } finally {
          searchLoading.value = false;
        }
      }, 300);
    }

    function selectStock(s) {
      newHolding.value.name = s.name;
      newHolding.value.symbol = s.symbol;
      newHolding.value.market = s.market;
      searchQ.value = s.name;
      showDropdown.value = false;
    }
    function onSearchBlur() {
      setTimeout(() => { showDropdown.value = false; }, 200);
    }

    async function addHolding() {
      const h = newHolding.value;
      const sym = h.symbol.trim().toUpperCase();
      const market =
        h.market || (sym.endsWith(".KS") || sym.endsWith(".KQ") ? "KR" : "US");
      if (holdings.value.some((x) => x.symbol.toUpperCase() === sym)) {
        alert(`'${h.name}' 종목은 이미 추가되어 있습니다.`);
        return;
      }
      try {
        const res = await axios.post("/api/portfolio/holdings", {
          market, name: h.name.trim(), symbol: sym,
          quantity: h.quantity, avgPrice: h.avgPrice || null,
        });
        holdings.value.push(res.data);
        emitHoldingsChanged();
        closeAddModal();
        fetchPrices();
      } catch { /* noop */ }
    }

    async function removeHolding(id) {
      const target = holdings.value.find((h) => h.id === id);
      const name = target ? target.name : "이 종목";
      if (!confirm(`'${name}'을(를) 삭제하시겠습니까?`)) return;
      try {
        await axios.delete(`/api/portfolio/holdings/${id}`);
        holdings.value = holdings.value.filter((h) => h.id !== id);
        emitHoldingsChanged();
      } catch { /* noop */ }
    }

    function startEdit(h) {
      editingId.value = h.id;
      editForm.value = { quantity: h.quantity, avgPrice: h.avgPrice };
    }
    async function saveEdit(h) {
      const payload = {
        quantity: editForm.value.quantity,
        avgPrice: editForm.value.avgPrice || null,
      };
      try {
        const res = await axios.put(`/api/portfolio/holdings/${h.id}`, payload);
        const idx = holdings.value.findIndex((x) => x.id === h.id);
        if (idx !== -1) holdings.value[idx] = res.data;
        editingId.value = null;
        emitHoldingsChanged();
        fetchPrices();
      } catch { /* noop */ }
    }

    const canAdd = computed(
      () =>
        newHolding.value.name.trim() &&
        newHolding.value.symbol.trim() &&
        newHolding.value.quantity > 0,
    );

    const filteredHoldings = computed(() => {
      if (marketFilter.value === "kr") return holdings.value.filter((h) => h.market === "KR");
      if (marketFilter.value === "us") return holdings.value.filter((h) => h.market === "US");
      return holdings.value;
    });

    const sortedHoldings = computed(() => {
      const arr = [...filteredHoldings.value];
      if (!sortKey.value) return arr;
      return arr.sort((a, b) => {
        if (sortKey.value === "name") {
          return sortDir.value === "asc"
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        }
        let va, vb;
        if (sortKey.value === "value") {
          va = (prices.value[a.symbol]?.price || 0) * a.quantity;
          vb = (prices.value[b.symbol]?.price || 0) * b.quantity;
        } else if (sortKey.value === "curPrice") {
          va = prices.value[a.symbol]?.price || 0;
          vb = prices.value[b.symbol]?.price || 0;
        } else if (sortKey.value === "pnlPct") {
          va = holdPnlPct(a) ?? -Infinity;
          vb = holdPnlPct(b) ?? -Infinity;
        } else if (sortKey.value === "changePct") {
          va = prices.value[a.symbol]?.changePercent ?? -Infinity;
          vb = prices.value[b.symbol]?.changePercent ?? -Infinity;
        } else {
          return 0;
        }
        return sortDir.value === "asc" ? va - vb : vb - va;
      });
    });

    const krHoldingsCount = computed(() => holdings.value.filter((h) => h.market === "KR").length);
    const usHoldingsCount = computed(() => holdings.value.filter((h) => h.market === "US").length);

    const krTotal = computed(() =>
      filteredHoldings.value
        .filter((h) => h.market === "KR")
        .reduce((s, h) => s + (prices.value[h.symbol]?.price || 0) * h.quantity, 0),
    );
    const usTotal = computed(() =>
      filteredHoldings.value
        .filter((h) => h.market === "US")
        .reduce((s, h) => s + (prices.value[h.symbol]?.price || 0) * h.quantity, 0),
    );
    const usTotalKRW = computed(() =>
      exchangeRate.value > 0 ? usTotal.value * exchangeRate.value : 0,
    );
    const hasAvgPrice = computed(() => filteredHoldings.value.some((h) => h.avgPrice));

    const totalPnl = computed(() =>
      filteredHoldings.value.reduce((s, h) => {
        if (!h.avgPrice) return s;
        const p = prices.value[h.symbol]?.price;
        return p ? s + (p - h.avgPrice) * h.quantity : s;
      }, 0),
    );
    const totalCost = computed(() =>
      filteredHoldings.value.reduce(
        (s, h) => (h.avgPrice ? s + h.avgPrice * h.quantity : s),
        0,
      ),
    );
    const totalPnlPct = computed(() =>
      totalCost.value === 0 ? 0 : (totalPnl.value / totalCost.value) * 100,
    );

    const krPnl = computed(() =>
      holdings.value.filter((h) => h.market === "KR").reduce((s, h) => {
        if (!h.avgPrice) return s;
        const p = prices.value[h.symbol]?.price;
        return p ? s + (p - h.avgPrice) * h.quantity : s;
      }, 0),
    );
    const krCost = computed(() =>
      holdings.value.filter((h) => h.market === "KR").reduce((s, h) => h.avgPrice ? s + h.avgPrice * h.quantity : s, 0),
    );
    const krPnlPct = computed(() => krCost.value === 0 ? 0 : (krPnl.value / krCost.value) * 100);
    const krHasAvgPrice = computed(() => holdings.value.filter((h) => h.market === "KR").some((h) => h.avgPrice));

    const usPnl = computed(() =>
      holdings.value.filter((h) => h.market === "US").reduce((s, h) => {
        if (!h.avgPrice) return s;
        const p = prices.value[h.symbol]?.price;
        return p ? s + (p - h.avgPrice) * h.quantity : s;
      }, 0),
    );
    const usCost = computed(() =>
      holdings.value.filter((h) => h.market === "US").reduce((s, h) => h.avgPrice ? s + h.avgPrice * h.quantity : s, 0),
    );
    const usPnlPct = computed(() => usCost.value === 0 ? 0 : (usPnl.value / usCost.value) * 100);
    const usHasAvgPrice = computed(() => holdings.value.filter((h) => h.market === "US").some((h) => h.avgPrice));

    const totalValKRW = computed(() => krTotal.value + usTotalKRW.value);
    const totalPnlKRW = computed(() =>
      krPnl.value + (exchangeRate.value > 0 ? usPnl.value * exchangeRate.value : 0),
    );
    const totalCostKRW = computed(() =>
      krCost.value + (exchangeRate.value > 0 ? usCost.value * exchangeRate.value : 0),
    );
    const totalPnlKRWPct = computed(() =>
      totalCostKRW.value === 0 ? 0 : (totalPnlKRW.value / totalCostKRW.value) * 100,
    );

    const chartSegments = computed(() => {
      const toKRW = (h, price) => {
        const raw = price * h.quantity;
        if (h.market === "KR") return raw;
        if (exchangeRate.value > 0) return raw * exchangeRate.value;
        const hasKR = filteredHoldings.value.some((x) => x.market === "KR");
        return hasKR ? 0 : raw;
      };

      const items = filteredHoldings.value
        .map((h) => {
          const p = prices.value[h.symbol]?.price || 0;
          const valKRW = toKRW(h, p);
          return { h, val: p * h.quantity, valKRW, currency: h.market === "KR" ? "KRW" : "USD" };
        })
        .filter((item) => item.valKRW > 0)
        .sort((a, b) => b.valKRW - a.valKRW);

      const totalKRW = items.reduce((s, item) => s + item.valKRW, 0);
      if (totalKRW === 0) return [];

      const segs = [];
      let cum = -Math.PI / 2;
      const gap = items.length > 1 ? 0.025 : 0;
      const TEXT_R = 63;

      items.forEach(({ h, val, valKRW, currency }, idx) => {
        const pct = valKRW / totalKRW;
        const angle = pct * 2 * Math.PI;
        const start = cum + gap / 2;
        const end = cum + angle - gap / 2;
        const mid = (start + end) / 2;
        segs.push({
          id: h.id,
          name: h.name,
          value: val,
          valKRW,
          pct,
          color: CHART_COLORS[idx % CHART_COLORS.length],
          path: arcPath(start, end, 78, 48),
          currency,
          labelX: TEXT_R * Math.cos(mid),
          labelY: TEXT_R * Math.sin(mid),
        });
        cum += angle;
      });
      return segs;
    });

    function arcPath(s, e, ro, ri) {
      const cos = Math.cos, sin = Math.sin;
      const large = e - s > Math.PI ? 1 : 0;
      return [
        `M ${ro * cos(s)} ${ro * sin(s)}`,
        `A ${ro} ${ro} 0 ${large} 1 ${ro * cos(e)} ${ro * sin(e)}`,
        `L ${ri * cos(e)} ${ri * sin(e)}`,
        `A ${ri} ${ri} 0 ${large} 0 ${ri * cos(s)} ${ri * sin(s)}`,
        "Z",
      ].join(" ");
    }

    function fmtAbsPnl(v) {
      const abs = Math.abs(v);
      const krPart = filteredHoldings.value.filter(
        (h) => h.market === "KR" && h.avgPrice,
      ).length;
      return krPart > 0 ? fmtKRW(abs) : fmtUSD(abs);
    }
    function fmtCurPrice(h) {
      const p = prices.value[h.symbol];
      return p ? fmtByMkt(p.price, h.market) : "—";
    }
    function fmtHoldVal(h) {
      const p = prices.value[h.symbol];
      return p ? fmtByMkt(p.price * h.quantity, h.market) : "—";
    }
    function holdPnl(h) {
      if (!h.avgPrice) return null;
      const p = prices.value[h.symbol]?.price;
      return p != null ? (p - h.avgPrice) * h.quantity : null;
    }
    function fmtHoldPnl(h) {
      const v = holdPnl(h);
      if (v === null) return "—";
      return (v >= 0 ? "+" : "") + fmtByMkt(v, h.market);
    }
    function holdPnlPct(h) {
      if (!h.avgPrice) return null;
      const p = prices.value[h.symbol]?.price;
      return p != null && h.avgPrice !== 0
        ? ((p - h.avgPrice) / h.avgPrice) * 100
        : null;
    }
    function fmtHoldPnlPct(h) {
      const v = holdPnlPct(h);
      if (v === null) return "—";
      return (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
    }
    function fmtLegVal(seg) {
      if (seg.currency === "KRW") {
        return seg.value >= 1e8
          ? (seg.value / 1e8).toFixed(1) + "억"
          : fmtKRW(seg.value);
      }
      const usdStr = "$" + seg.value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      if (seg.valKRW > 0) {
        const krwStr = seg.valKRW >= 1e8
          ? (seg.valKRW / 1e8).toFixed(1) + "억"
          : fmtKRW(seg.valKRW);
        return `${usdStr} ≈ ${krwStr}`;
      }
      return usdStr;
    }
    function holdValKRW(h) {
      if (h.market !== "US" || !exchangeRate.value) return 0;
      const p = prices.value[h.symbol]?.price;
      return p ? p * h.quantity * exchangeRate.value : 0;
    }

    function toggleSort(key) {
      if (sortKey.value === key) {
        sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
      } else {
        sortKey.value = key;
        sortDir.value = (key === "value" || key === "pnlPct") ? "desc" : "asc";
      }
      localStorage.setItem("stock_sortKey", sortKey.value);
      localStorage.setItem("stock_sortDir", sortDir.value);
    }

    function fmtChangePct(h) {
      return prices.value[h.symbol]?.changePercent ?? null;
    }
    function fmtChangePctDisplay(h) {
      const v = fmtChangePct(h);
      if (v === null) return "—";
      return (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
    }
    function changePctCls(h) {
      return pnlCls(fmtChangePct(h));
    }

    const hoveredSegment = computed(() =>
      hoveredSegId.value ? chartSegments.value.find((s) => s.id === hoveredSegId.value) : null,
    );

    function onKeydown(e) {
      if (e.key === "Escape" && showAddModal.value) closeAddModal();
    }

    watch(
      () => props.active,
      (isActive) => {
        if (isActive) fetchPrices();
      },
    );

    onMounted(async () => {
      await initPortfolio();
      if (props.active) fetchPrices();
      refreshTimer = setInterval(() => {
        if (props.active) fetchPrices();
      }, 120000);
      relativeTimer = setInterval(updateRelativeTime, 10000);
      document.addEventListener("keydown", onKeydown);
    });

    onBeforeUnmount(() => {
      clearInterval(refreshTimer);
      clearInterval(relativeTimer);
      clearTimeout(searchTimer);
      document.removeEventListener("keydown", onKeydown);
    });

    return {
      holdings, prices, priceLoading, portfolioView, marketFilter,
      exchangeRate, exRateAt, lastUpdatedAt, relativeUpdated,
      sortKey, sortDir, hoveredSegId, hoveredSegment,
      showAddModal, searchQ, showDropdown, searchResults, searchLoading,
      newHolding, editingId, editForm, canAdd,
      filteredHoldings, sortedHoldings,
      krHoldingsCount, usHoldingsCount,
      krTotal, usTotal, usTotalKRW, hasAvgPrice,
      totalCost, totalPnl, totalPnlPct,
      krPnl, krPnlPct, krHasAvgPrice,
      usPnl, usPnlPct, usHasAvgPrice,
      totalValKRW, totalCostKRW, totalPnlKRW, totalPnlKRWPct,
      chartSegments,
      openAddModal, closeAddModal, onSearchInput, selectStock, onSearchBlur,
      addHolding, removeHolding, startEdit, saveEdit, fetchPrices,
      fmtKRW, fmtUSD, fmtByMkt, pnlCls,
      fmtAbsPnl, fmtCurPrice, fmtHoldVal, fmtHoldPnl, fmtHoldPnlPct,
      fmtLegVal, holdPnl, holdPnlPct, holdValKRW,
      toggleSort, fmtChangePctDisplay, changePctCls,
    };
  },
};
</script>

<style src="@/assets/css/stock.css" scoped></style>
