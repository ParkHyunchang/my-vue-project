<template>
  <div class="stock-container">
    <div class="page-header">
      <h2>주식 대시보드</h2>
      <p class="page-subtitle">실시간 시장 데이터 · 포트폴리오 현황</p>
    </div>

    <!-- KRX 만료 임박/만료 알림 배너 -->
    <div v-if="krxApiStatus !== 'valid'" :class="['krx-alert-banner', 'krx-alert-' + krxApiStatus]">
      <span class="krx-alert-icon">{{ krxApiStatus === 'expired' ? '🚨' : '⚠️' }}</span>
      <span class="krx-alert-msg">
        <template v-if="krxApiStatus === 'expired'">KRX Open API 인증키가 <strong>만료</strong>되었습니다. 국내 주식 데이터가 정상적으로 표시되지 않을 수 있습니다.</template>
        <template v-else>KRX Open API 인증키가 <strong>D-{{ krxDaysRemaining }}</strong> 후 만료됩니다. 미리 갱신하세요.</template>
      </span>
      <a href="https://openapi.krx.co.kr/contents/OPP/MYPG/mypage/OPPMYPG002.cmd" target="_blank" rel="noopener" class="krx-alert-link">인증키 갱신 →</a>
    </div>

    <!-- KRX Open API 현황 -->
    <div class="krx-api-section">
      <div :class="['krx-api-card', 'api-status-' + krxApiStatus]">
        <div class="krx-api-left">
          <span class="krx-api-name">KRX Open API</span>
          <span :class="['krx-status-badge', 'api-status-' + krxApiStatus]">{{ krxApiStatusText }}</span>
        </div>
        <div class="krx-api-middle">
          유효기간: <strong>{{ krxPeriodText }}</strong>
          <span class="krx-api-sep">·</span>
          <span :class="['krx-days', 'api-status-' + krxApiStatus]">D-{{ krxDaysRemaining }}</span>
        </div>
        <div class="krx-api-right">
          <a
            href="https://openapi.krx.co.kr/contents/OPP/MYPG/mypage/OPPMYPG002.cmd"
            target="_blank"
            rel="noopener"
            class="krx-renew-link"
          >인증키 갱신 →</a>
        </div>
      </div>
    </div>

    <!-- 탭 네비게이션 -->
    <div class="stock-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab-btn', { active: activeTab === tab.id }]"
        @click="switchTab(tab.id)"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- ══════════════════════════════════════════
         💰 내 잔고 (포트폴리오)
    ══════════════════════════════════════════ -->
    <div v-show="activeTab === 'balance'" class="tab-content">
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
            <!-- 전체 탭 + 한국/미국 모두 있을 때: 분리 표시 -->
            <template v-if="marketFilter === 'all' && krHoldingsCount > 0 && usHoldingsCount > 0">
              <div class="ps-breakdown">
                <!-- KR 행 -->
                <div class="ps-bd-row">
                  <span class="ps-bd-label">🇰🇷 한국</span>
                  <span class="ps-bd-val">{{ fmtKRW(krTotal) }}</span>
                  <span v-if="krHasAvgPrice" :class="['ps-bd-pnl', pnlCls(krPnl)]">
                    {{ krPnl >= 0 ? "▲" : "▼" }} {{ fmtKRW(Math.abs(krPnl)) }}
                    <span class="ps-bd-pct">({{ krPnlPct >= 0 ? "+" : "" }}{{ krPnlPct.toFixed(2) }}%)</span>
                  </span>
                </div>
                <!-- US 행 -->
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
                <!-- 전체 합산 행 -->
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

            <!-- 단일 마켓 탭 또는 한쪽만 있을 때: 기존 레이아웃 -->
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
          <button class="prf-btn" @click="fetchPrices" :disabled="priceLoading">
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
                  <!-- 편집 모드 -->
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
                  <!-- 일반 모드 -->
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
              <!-- 편집 모드 -->
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
              <!-- 일반 모드 -->
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
                  <div class="hcard-row" v-if="h.avgPrice">
                    <span class="hcard-label">평단가</span>
                    <span>{{ fmtByMkt(h.avgPrice, h.market) }}</span>
                  </div>
                  <div class="hcard-row" v-if="holdPnl(h) !== null">
                    <span class="hcard-label">평가손익</span>
                    <span :class="pnlCls(holdPnl(h))">{{ fmtHoldPnl(h) }}</span>
                  </div>
                  <div class="hcard-row" v-if="holdPnlPct(h) !== null">
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
                <!-- 중앙 텍스트: hover 시 해당 종목 정보 표시 -->
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
    </div>

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

          <!-- 종목 검색 (Yahoo Finance 실시간) -->
          <div class="mform-row">
            <label>종목 검색 ( 종목코드 )</label>
            <div class="stock-search-box">
              <input
                v-model="searchQ"
                type="text"
                placeholder="삼성전자, Tesla, NVDA, 005930.KS..."
                class="stock-search-inp"
                @input="onSearchInput"
                @focus="showDropdown = true"
                @blur="onSearchBlur"
                autocomplete="off"
              />
              <!-- 로딩 -->
              <div v-if="searchLoading" class="search-loading">검색 중...</div>
              <!-- 결과 드롭다운 -->
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
                  <span class="sdi-flag">{{
                    s.market === "KR" ? "🇰🇷" : "🇺🇸"
                  }}</span>
                  <div class="sdi-info">
                    <span class="sdi-name">{{ s.name }}</span>
                    <span class="sdi-meta"
                      >{{ s.symbol }} · {{ s.exchange }}</span
                    >
                  </div>
                  <span class="sdi-type">{{ s.type }}</span>
                </div>
              </div>
              <!-- 결과 없음 -->
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

          <!-- 선택된 종목 표시 (검색 후 자동 입력됨) -->
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

          <!-- 감지된 시장 표시 -->
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

          <!-- 보유수량 -->
          <div class="mform-row">
            <label>보유수량</label>
            <input
              v-model.number="newHolding.quantity"
              type="number"
              min="1"
              placeholder="0"
            />
          </div>

          <!-- 평단가 (선택) -->
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
            <button class="mbtn-submit" @click="addHolding" :disabled="!canAdd">
              추가
            </button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- ══════════════════════════════════════════
         🗺️ 히트맵
    ══════════════════════════════════════════ -->
    <div v-show="activeTab === 'heatmap'" class="tab-content">
      <div class="heatmap-controls">
        <button
          :class="['market-btn', { active: heatmapMarket === 'kr' }]"
          @click="switchHeatmap('kr')"
        >
          🇰🇷 국내 (KOSPI)
        </button>
        <button
          :class="['market-btn', { active: heatmapMarket === 'sp500' }]"
          @click="switchHeatmap('sp500')"
        >
          🇺🇸 S&amp;P 500
        </button>
        <button
          :class="['market-btn', { active: heatmapMarket === 'nasdaq' }]"
          @click="switchHeatmap('nasdaq')"
        >
          🇺🇸 NASDAQ 100
        </button>
      </div>

      <!-- 국내 히트맵 (ECharts) -->
      <div v-if="heatmapMarket === 'kr'" class="heatmap-wrapper">
        <div
          v-if="!krHeatmapLoading && !krHeatmapError && krUpdatedAt"
          class="kr-heatmap-header"
        >
          📅 {{ krUpdatedAt }} 기준 데이터
          <span class="kr-sync-note">(매 30분마다 자동 동기화)</span>
        </div>
        <div v-if="krHeatmapLoading" class="heatmap-loading">
          <span class="loading-spinner"></span> 데이터 로딩 중…
        </div>
        <div v-else-if="krHeatmapError" class="heatmap-error">
          {{ krHeatmapError }}
        </div>
        <div v-else ref="krChartEl" class="kr-heatmap-chart"></div>
        <p class="widget-credit">국내 데이터 제공: KRX 공식 Open API (전일 종가 기준)</p>
      </div>

      <!-- 해외 히트맵 (TradingView) -->
      <div v-else class="heatmap-wrapper">
        <div v-if="tvUpdatedAt" class="kr-heatmap-header">
          📅 {{ tvUpdatedAt }} 로드
          <span
            :class="[
              'tv-market-status',
              isUsMarketOpen() ? 'market-open' : 'market-closed',
            ]"
          >
            {{ isUsMarketOpen() ? "🟢 장중" : "🔴 장외" }}
          </span>
          <span class="kr-sync-note">
            (TradingView 실시간 위젯 · 장중 자동 업데이트 · NYSE/NASDAQ
            22:30~05:00 KST)
          </span>
        </div>
        <div id="tv-heatmap" class="tradingview-widget-container">
          <div class="tradingview-widget-container__widget"></div>
        </div>
        <p class="widget-credit">
          데이터 제공:
          <a href="https://www.tradingview.com" target="_blank">TradingView</a>
        </p>
      </div>
    </div>

    <!-- ══════════════════════════════════════════
         🏆 시총 Top 10
    ══════════════════════════════════════════ -->
    <div v-show="activeTab === 'top10'" class="tab-content">
      <div class="top10-controls">
        <button
          :class="['market-btn', { active: top10Market === 'kr' }]"
          @click="switchTop10('kr')"
        >
          🇰🇷 코스피
        </button>
        <button
          :class="['market-btn', { active: top10Market === 'kosdaq' }]"
          @click="switchTop10('kosdaq')"
        >
          🇰🇷 코스닥
        </button>
        <button
          :class="['market-btn', { active: top10Market === 'us' }]"
          @click="switchTop10('us')"
        >
          🇺🇸 미국
        </button>
        <span class="last-updated" v-if="top10UpdateTime"
          >기준: {{ top10UpdateTime }}</span
        >
        <span v-if="top10Market !== 'us'" class="prev-close-note">전일 종가 기준</span>
        <span class="auto-refresh-info"
          >🕐 자동 갱신: 🇰🇷 09:00 · 🇺🇸 23:30 (KST)</span
        >
      </div>

      <!-- 최초 로딩 (데이터 없을 때만 전체 스피너) -->
      <div v-if="top10Loading && top10Data.length === 0" class="loading-state">
        <div class="spinner"></div>
        <span>시세 데이터를 불러오는 중...</span>
      </div>

      <!-- 에러 (데이터 없을 때만 전체 에러 표시) -->
      <div v-else-if="top10Error && top10Data.length === 0" class="error-state">
        <span>⚠️ {{ top10Error }}</span>
        <button class="retry-btn" @click="loadTop10">다시 시도</button>
      </div>

      <!-- 데이터 없음 -->
      <div v-else-if="top10Data.length === 0" class="empty-state">
        데이터가 없습니다.
      </div>

      <!-- 데이터 표시 (갱신 중에도 기존 데이터 유지) -->
      <template v-else>
        <!-- 갱신 중 미니 인디케이터 -->
        <div v-if="top10Loading" class="top10-refreshing">
          <div class="top10-refreshing-dot"></div> 갱신 중...
        </div>
        <div v-if="top10Error && top10Data.length > 0" class="top10-error-inline">⚠️ {{ top10Error }}</div>

        <!-- 데스크탑 테이블 -->
        <div class="top10-table-wrap">
          <table class="top10-table">
            <thead>
              <tr>
                <th class="col-rank">순위</th>
                <th class="col-name">종목</th>
                <th class="col-price">현재가</th>
                <th class="col-change">등락률</th>
                <th class="col-mcap">시가총액</th>
                <th class="col-vol">거래량</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="stock in top10Data" :key="stock.symbol">
                <td class="col-rank">
                  <span :class="['rank-badge', rankClass(stock.rank)]">{{
                    stock.rank
                  }}</span>
                  <span v-if="stock.rankChange > 0" class="rank-chg rank-up"
                    >▲{{ stock.rankChange }}</span
                  >
                  <span
                    v-else-if="stock.rankChange < 0"
                    class="rank-chg rank-down"
                    >▼{{ Math.abs(stock.rankChange) }}</span
                  >
                  <span v-else class="rank-chg rank-neutral">—</span>
                </td>
                <td class="col-name">
                  <div class="stock-name-cell">
                    <span class="stock-name">{{ stock.name }}</span>
                    <span class="stock-symbol">{{ stock.symbol }}</span>
                  </div>
                </td>
                <td class="col-price">
                  {{ formatPrice(stock.price, stock.currency) }}
                </td>
                <td class="col-change">
                  <span :class="['change-badge', changeClass(stock.changePercent)]">
                    {{ formatChangePct(stock.changePercent) }}
                  </span>
                </td>
                <td class="col-mcap">
                  {{ formatMarketCap(stock.marketCap, stock.currency) }}
                </td>
                <td class="col-vol">{{ formatVolume(stock.volume) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 모바일 카드 뷰 -->
        <div class="top10-cards">
          <div v-for="stock in top10Data" :key="'card-' + stock.symbol" class="top10-card">
            <div class="t10c-header">
              <div class="t10c-rank-wrap">
                <span :class="['rank-badge', rankClass(stock.rank)]">{{ stock.rank }}</span>
                <span v-if="stock.rankChange > 0" class="rank-chg rank-up">▲{{ stock.rankChange }}</span>
                <span v-else-if="stock.rankChange < 0" class="rank-chg rank-down">▼{{ Math.abs(stock.rankChange) }}</span>
                <span v-else class="rank-chg rank-neutral">—</span>
              </div>
              <div class="t10c-name-wrap">
                <span class="stock-name">{{ stock.name }}</span>
                <span class="stock-symbol">{{ stock.symbol }}</span>
              </div>
              <div class="t10c-price-wrap">
                <span class="t10c-price">{{ formatPrice(stock.price, stock.currency) }}</span>
                <span :class="['change-badge', changeClass(stock.changePercent)]">{{ formatChangePct(stock.changePercent) }}</span>
              </div>
            </div>
            <div class="t10c-mcap">
              시가총액 {{ formatMarketCap(stock.marketCap, stock.currency) }}
              <span v-if="stock.volume" class="t10c-vol"> · 거래량 {{ formatVolume(stock.volume) }}</span>
            </div>
          </div>
        </div>
      </template>

      <!-- 스케줄 안내 -->
      <div class="schedule-info">
        <span class="schedule-info-title">⏰ 자동 갱신 스케줄</span>
        <div class="schedule-items">
          <div class="schedule-item">
            <span class="schedule-flag">🇰🇷</span>
            <div class="schedule-detail">
              <strong>코스피 / 코스닥</strong>
              <span>매일 09:00 KST — KRX 공식 API, 한국 장 개장 직전 갱신</span>
            </div>
            <span class="schedule-time">09:00</span>
          </div>
          <div class="schedule-item">
            <span class="schedule-flag">🇺🇸</span>
            <div class="schedule-detail">
              <strong>미국 (NYSE/NASDAQ)</strong>
              <span>매일 23:30 KST — 미국 장 개장 직전 갱신</span>
            </div>
            <span class="schedule-time">23:30</span>
          </div>
        </div>
        <p class="schedule-note">
          🇰🇷 KRX 공식 API · 전일 종가 기준 · 🇺🇸 Yahoo Finance v8 기반 ·
          캐시 유효 시간 6시간 · 순위 변동(▲▼)은 직전 갱신 대비
        </p>
      </div>

      <p class="data-credit">시세 데이터: KRX 공식 API · Naver Finance · Yahoo Finance</p>
    </div>

    <!-- ══════════════════════════════════════════
         📰 주식 뉴스
    ══════════════════════════════════════════ -->
    <div v-show="activeTab === 'news'" class="tab-content">
      <!-- 컨트롤 바: 시장 토글 + 보유종목 필터 + 새로고침 -->
      <div class="news-controls">
        <div class="news-market-toggle">
          <button
            :class="['news-market-btn', newsMarket === 'KR' && 'active']"
            @click="switchNewsMarket('KR')"
          >🇰🇷 국내</button>
          <button
            :class="['news-market-btn', newsMarket === 'US' && 'active']"
            @click="switchNewsMarket('US')"
          >🌐 해외</button>
          <div class="news-divider"></div>
          <button
            :class="['news-holdings-btn', newsFilterHoldings && 'active']"
            @click="newsFilterHoldings = !newsFilterHoldings"
            :disabled="holdings.length === 0"
          >
            📊 내 보유 종목
            <span v-if="newsFilterHoldings" class="news-match-count">{{ filteredNewsData.length }}</span>
          </button>
        </div>
        <div class="news-right-controls">
          <span v-if="newsLastFetchedText && !newsLoading" class="news-fetch-time">{{ newsLastFetchedText }}</span>
          <button class="news-refresh-btn" @click="refreshNews" :disabled="newsLoading" title="뉴스 새로고침">
            <span :class="['news-refresh-icon', newsLoading && 'spinning']">↻</span>
          </button>
        </div>
      </div>

      <!-- 키워드 검색 -->
      <div class="news-search-wrap">
        <span class="news-search-icon">🔍</span>
        <input
          v-model="newsKeyword"
          class="news-search-input"
          type="text"
          placeholder="제목·내용 검색..."
        />
        <button v-if="newsKeyword" class="news-search-clear" @click="newsKeyword = ''">✕</button>
      </div>

      <!-- 로딩 -->
      <div v-if="newsLoading" class="loading-state">
        <div class="spinner"></div>
        <span>뉴스를 불러오는 중...</span>
      </div>

      <!-- 에러 -->
      <div v-else-if="newsError" class="error-state">
        <span>⚠️ {{ newsError }}</span>
        <button class="retry-btn" @click="loadNews(newsMarket)">다시 시도</button>
      </div>

      <!-- 뉴스 목록 -->
      <template v-else>
        <div class="news-count-bar">
          총 <strong>{{ filteredNewsData.length }}</strong>건
          <span v-if="newsKeyword || newsFilterHoldings" class="news-count-filter">· 필터 적용 중</span>
        </div>
        <div v-if="filteredNewsData.length > 0" class="news-grid">
          <a
            v-for="(news, idx) in filteredNewsData"
            :key="idx"
            :href="news.link"
            target="_blank"
            rel="noopener noreferrer"
            :class="['news-card', visitedLinksSet.has(news.link) && 'news-card--visited']"
            @click="markVisited(news.link)"
          >
            <img
              v-if="news.imageUrl"
              :src="news.imageUrl"
              class="news-img"
              alt=""
              loading="lazy"
              @error="(e) => e.target.style.display = 'none'"
            />
            <div class="news-meta">
              <span :class="['news-source', `news-source--${newsSourceKey(news.source)}`]">{{ news.source }}</span>
              <span class="news-date">{{ formatNewsDate(news.pubDate) }}</span>
            </div>
            <h4 class="news-title">{{ news.title }}</h4>
            <p v-if="news.description" class="news-desc">{{ news.description }}</p>
          </a>
        </div>
        <div v-else class="empty-state">
          {{ newsFilterHoldings && !newsKeyword ? '보유 종목 관련 뉴스가 없습니다.' : '검색 결과가 없습니다.' }}
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import axios from "@/axios";
import * as echarts from "echarts";

// 하드코딩 종목 목록 제거 — 백엔드 Yahoo Finance 검색으로 대체

const CHART_COLORS = [
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ec4899",
  "#8b5cf6",
  "#ef4444",
  "#14b8a6",
  "#f97316",
  "#a78bfa",
  "#34d399",
  "#fb923c",
];

const PORTFOLIO_KEY = "stock_portfolio";


export default {
  name: "StockPage",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const VALID_TABS = ["balance", "heatmap", "top10", "news"];

    const activeTab = ref("balance");
    const heatmapMarket = ref("kr");
    const top10Market = ref("kr");

    // ── 국내 히트맵 (ECharts) 상태 ─────────────────────────────
    const krChartEl = ref(null);
    const krHeatmapLoading = ref(false);
    const krHeatmapError = ref("");
    const krUpdatedAt = ref("");
    let krChartInstance = null;

    // ── 해외 히트맵 (TradingView) 상태 ──────────────────────────
    const tvUpdatedAt = ref("");

    function isUsMarketOpen() {
      // NYSE/NASDAQ: 월~금 22:30~05:00 KST
      const now = new Date();
      const kst = new Date(
        now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }),
      );
      const day = kst.getDay(); // 0=일, 6=토
      const h = kst.getHours(),
        m = kst.getMinutes();
      const minutes = h * 60 + m;
      if (day === 0 || day === 6) return false;
      return minutes >= 22 * 60 + 30 || minutes < 5 * 60;
    }

    // ── 포트폴리오 상태 ──────────────────────────────────────
    const holdings = ref([]);
    const prices = ref({}); // { symbol: StockPriceDto }
    const priceLoading = ref(false);
    const portfolioView = ref("grid");
    const marketFilter = ref("all"); // 'all' | 'kr' | 'us'

    // ── 환율 ─────────────────────────────────────────────
    const exchangeRate = ref(0);  // USD → KRW
    const exRateAt = ref("");

    // ── 종목 추가 모달 ────────────────────────────────────────
    const showAddModal = ref(false);
    const searchQ = ref("");
    const showDropdown = ref(false);
    const searchResults = ref([]); // 백엔드 검색 결과
    const searchLoading = ref(false);
    const newHolding = ref({
      market: "US",
      name: "",
      symbol: "",
      quantity: null,
      avgPrice: null,
    });
    let searchTimer = null; // debounce 타이머
    let newsTimer   = null; // #9 뉴스 자동 갱신 타이머 (20분)

    // ── 인라인 편집 ───────────────────────────────────────────
    const editingId = ref(null);
    const editForm = ref({ quantity: null, avgPrice: null });

    const top10Data = ref([]);
    const top10Loading = ref(false);
    const top10Error = ref("");
    const top10UpdateTime = ref("");

    const newsData = ref([]);
    const newsLoading = ref(false);
    const newsError = ref("");
    const newsMarket = ref(localStorage.getItem('stock_newsMarket') || "KR");
    const newsFilterHoldings = ref(false);
    const newsKeyword = ref('');
    const newsLastFetched = ref(null);

    const lastUpdatedAt = ref(null);    // 갱신 시각 (Date)
    const relativeUpdated = ref('');    // "방금 전", "30초 전" 등
    const sortKey = ref(localStorage.getItem('stock_sortKey') || '');
    const sortDir = ref(localStorage.getItem('stock_sortDir') || 'asc');

    // #12 도넛 차트 hover
    const hoveredSegId = ref(null);

    // #13 방문한 뉴스 링크 추적 (localStorage 기반, Set 반응성 위해 배열+computed 사용)
    const visitedLinksList = ref(JSON.parse(localStorage.getItem('stock_visited_links') || '[]'));
    const visitedLinksSet  = computed(() => new Set(visitedLinksList.value));

    // #15 KRX 만료일 (백엔드 설정에서 로드)
    const krxExpiryDate = ref(new Date('2027-04-21T23:59:59')); // 기본값 (API 로드 전)
    // 미국 종목 ticker → 영문 검색어 맵 (뉴스 필터링용, 백엔드에서 로드)
    const usEnNames = ref({});
    let refreshTimer = null;
    let relativeTimer = null;
    let krHeatmapSectorsCache = null; // #10 히트맵 KR 섹터 데이터 캐시

    const tabs = [
      { id: "balance", icon: "💰", label: "내 잔고" },
      { id: "heatmap", icon: "🗺️", label: "히트맵" },
      { id: "top10", icon: "🏆", label: "시총 Top 10" },
      { id: "news", icon: "📰", label: "주식 뉴스" },
    ];

    // ─── 탭 전환 ─────────────────────────────────────
    function switchTab(id) {
      activeTab.value = id;
      router.replace({ query: { ...route.query, tab: id } });
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // #9 뉴스 탭 벗어날 때 자동갱신 타이머 해제
      if (id !== "news") {
        clearInterval(newsTimer);
        newsTimer = null;
      }

      if (id === "heatmap") {
        if (heatmapMarket.value !== "kr") {
          tvUpdatedAt.value = new Date().toLocaleString("ko-KR", {
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        }
        nextTick(() => {
          if (heatmapMarket.value === "kr") loadKrHeatmap();
          else initHeatmap(heatmapMarket.value);
        });
      }
      if (id === "top10" && top10Data.value.length === 0) {
        loadTop10();
      }
      if (id === "news") {
        if (newsData.value.length === 0) loadNews(newsMarket.value);
        // #9 뉴스 탭 진입 시 20분마다 자동 갱신
        if (!newsTimer) {
          newsTimer = setInterval(() => loadNews(newsMarket.value), 20 * 60 * 1000);
        }
      }
      if (id === "balance") {
        fetchPrices(); // fetchPrices 내부에서 환율도 함께 조회
      }
    }

    // ──────────────────────────────────────────────────────────────
    // 포트폴리오 로직 (DB 연동 + localStorage 마이그레이션)
    // ──────────────────────────────────────────────────────────────

    // 최초 한 번: 기존 localStorage 데이터를 서버로 마이그레이션
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
              market: h.market,
              name: h.name,
              symbol: h.symbol,
              quantity: h.quantity,
              avgPrice: h.avgPrice,
            });
          }
          const refreshed = await axios.get("/api/portfolio/holdings");
          holdings.value = refreshed.data || [];
          localStorage.removeItem(PORTFOLIO_KEY);
        }
      } catch {
        holdings.value = localData;
      }
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
        } catch { /* 가격 조회 실패 시 무시 */ }
      });
      // 미국 주식이 있으면 환율도 함께 조회
      const hasUs = holdings.value.some(h => h.market === "US");
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
      if (sec < 10) relativeUpdated.value = '방금 전 업데이트';
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
      } catch { /* 환율 조회 실패 시 무시 */ }
    }

    // ─── 모달 ────────────────────────────────────────
    function openAddModal() {
      showAddModal.value = true;
    }
    function closeAddModal() {
      showAddModal.value = false;
      searchQ.value = "";
      showDropdown.value = false;
      searchResults.value = [];
      newHolding.value = {
        market: "US",
        name: "",
        symbol: "",
        quantity: null,
        avgPrice: null,
      };
    }
    function onMarketChange(mkt) {
      newHolding.value.market = mkt;
      newHolding.value.name = "";
      newHolding.value.symbol = "";
      searchQ.value = "";
      searchResults.value = [];
    }

    // 검색어 입력 → 300ms debounce → 백엔드 호출
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
      newHolding.value.market = s.market; // 백엔드에서 자동 감지된 시장
      searchQ.value = s.name;
      showDropdown.value = false;
    }
    function onSearchBlur() {
      setTimeout(() => {
        showDropdown.value = false;
      }, 200);
    }

    async function addHolding() {
      const h = newHolding.value;
      // symbol에서 market 자동 감지 (직접 입력한 경우 대비)
      const sym = h.symbol.trim().toUpperCase();
      const market =
        h.market || (sym.endsWith(".KS") || sym.endsWith(".KQ") ? "KR" : "US");
      // #7 중복 종목 체크
      if (holdings.value.some(x => x.symbol.toUpperCase() === sym)) {
        alert(`'${h.name}' 종목은 이미 추가되어 있습니다.`);
        return;
      }
      try {
        const res = await axios.post("/api/portfolio/holdings", {
          market,
          name: h.name.trim(),
          symbol: sym,
          quantity: h.quantity,
          avgPrice: h.avgPrice || null,
        });
        holdings.value.push(res.data);
        closeAddModal();
        fetchPrices();
      } catch {
        // noop
      }
    }

    async function removeHolding(id) {
      const target = holdings.value.find(h => h.id === id);
      const name = target ? target.name : '이 종목';
      if (!confirm(`'${name}'을(를) 삭제하시겠습니까?`)) return;
      try {
        await axios.delete(`/api/portfolio/holdings/${id}`);
        holdings.value = holdings.value.filter((h) => h.id !== id);
      } catch {
        // noop
      }
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
        if (idx !== -1) {
          holdings.value[idx] = res.data;
        }
        editingId.value = null;
        fetchPrices();
      } catch {
        // noop
      }
    }

    // ─── Computed ─────────────────────────────────────

    const canAdd = computed(
      () =>
        newHolding.value.name.trim() &&
        newHolding.value.symbol.trim() &&
        newHolding.value.quantity > 0,
    );

    // 마켓 필터가 적용된 보유 목록
    const filteredHoldings = computed(() => {
      if (marketFilter.value === "kr") return holdings.value.filter(h => h.market === "KR");
      if (marketFilter.value === "us") return holdings.value.filter(h => h.market === "US");
      return holdings.value;
    });

    const sortedHoldings = computed(() => {
      const arr = [...filteredHoldings.value];
      if (!sortKey.value) return arr;
      return arr.sort((a, b) => {
        if (sortKey.value === 'name') {
          return sortDir.value === 'asc'
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        }
        let va, vb;
        if (sortKey.value === 'value') {
          va = (prices.value[a.symbol]?.price || 0) * a.quantity;
          vb = (prices.value[b.symbol]?.price || 0) * b.quantity;
        } else if (sortKey.value === 'curPrice') {
          va = prices.value[a.symbol]?.price || 0;
          vb = prices.value[b.symbol]?.price || 0;
        } else if (sortKey.value === 'pnlPct') {
          va = holdPnlPct(a) ?? -Infinity;
          vb = holdPnlPct(b) ?? -Infinity;
        } else if (sortKey.value === 'changePct') {
          va = prices.value[a.symbol]?.changePercent ?? -Infinity;
          vb = prices.value[b.symbol]?.changePercent ?? -Infinity;
        } else {
          return 0;
        }
        return sortDir.value === 'asc' ? va - vb : vb - va;
      });
    });

    // 각 마켓 종목 수 (필터 버튼 뱃지용)
    const krHoldingsCount = computed(() => holdings.value.filter(h => h.market === "KR").length);
    const usHoldingsCount = computed(() => holdings.value.filter(h => h.market === "US").length);

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

    // 미국 주식 원화 환산 합계
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

    // ── 한국/미국 분리 PnL ──
    const krPnl = computed(() =>
      holdings.value.filter(h => h.market === 'KR').reduce((s, h) => {
        if (!h.avgPrice) return s;
        const p = prices.value[h.symbol]?.price;
        return p ? s + (p - h.avgPrice) * h.quantity : s;
      }, 0),
    );
    const krCost = computed(() =>
      holdings.value.filter(h => h.market === 'KR').reduce((s, h) => h.avgPrice ? s + h.avgPrice * h.quantity : s, 0),
    );
    const krPnlPct = computed(() => krCost.value === 0 ? 0 : (krPnl.value / krCost.value) * 100);
    const krHasAvgPrice = computed(() => holdings.value.filter(h => h.market === 'KR').some(h => h.avgPrice));

    const usPnl = computed(() =>
      holdings.value.filter(h => h.market === 'US').reduce((s, h) => {
        if (!h.avgPrice) return s;
        const p = prices.value[h.symbol]?.price;
        return p ? s + (p - h.avgPrice) * h.quantity : s;
      }, 0),
    );
    const usCost = computed(() =>
      holdings.value.filter(h => h.market === 'US').reduce((s, h) => h.avgPrice ? s + h.avgPrice * h.quantity : s, 0),
    );
    const usPnlPct = computed(() => usCost.value === 0 ? 0 : (usPnl.value / usCost.value) * 100);
    const usHasAvgPrice = computed(() => holdings.value.filter(h => h.market === 'US').some(h => h.avgPrice));

    // ── 전체 합산 (KRW 환산) ──
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

    // ─── 차트 세그먼트 ────────────────────────────────
    const chartSegments = computed(() => {
      // USD는 원화로 환산하여 동일 기준으로 비율 계산
      const toKRW = (h, price) => {
        const raw = price * h.quantity;
        if (h.market === "KR") return raw;
        // 환율 미로드 시: 미국 주식 단독 필터면 그대로 USD 기준 사용
        if (exchangeRate.value > 0) return raw * exchangeRate.value;
        // 환율 없음 + 혼합 포트폴리오면 US 종목 제외
        const hasKR = filteredHoldings.value.some(x => x.market === "KR");
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
          value: val,      // 원래 통화 (범례 금액 표시용)
          valKRW,          // 원화 환산 값 (비율 계산 기준)
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
      const cos = Math.cos,
        sin = Math.sin;
      const large = e - s > Math.PI ? 1 : 0;
      return [
        `M ${ro * cos(s)} ${ro * sin(s)}`,
        `A ${ro} ${ro} 0 ${large} 1 ${ro * cos(e)} ${ro * sin(e)}`,
        `L ${ri * cos(e)} ${ri * sin(e)}`,
        `A ${ri} ${ri} 0 ${large} 0 ${ri * cos(s)} ${ri * sin(s)}`,
        "Z",
      ].join(" ");
    }

    // ─── 포맷 헬퍼 (포트폴리오 전용) ──────────────────
    function fmtKRW(v) {
      return new Intl.NumberFormat("ko-KR").format(Math.round(v)) + "원";
    }
    function fmtUSD(v) {
      return (
        "$" +
        v.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      );
    }
    function fmtByMkt(v, mkt) {
      return mkt === "KR" ? fmtKRW(v) : fmtUSD(v);
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
      // USD: 달러 + 원화 환산
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
        sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
      } else {
        sortKey.value = key;
        sortDir.value = (key === 'value' || key === 'pnlPct') ? 'desc' : 'asc';
      }
      localStorage.setItem('stock_sortKey', sortKey.value);
      localStorage.setItem('stock_sortDir', sortDir.value);
    }

    function fmtChangePct(h) {
      return prices.value[h.symbol]?.changePercent ?? null;
    }
    function fmtChangePctDisplay(h) {
      const v = fmtChangePct(h);
      if (v === null) return '—';
      return (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
    }
    function changePctCls(h) {
      return pnlCls(fmtChangePct(h));
    }

    function pnlCls(v) {
      return v == null ? "" : v > 0 ? "positive" : v < 0 ? "negative" : "";
    }

    // ─── 히트맵 ──────────────────────────────────────
    function switchHeatmap(market) {
      heatmapMarket.value = market;
      if (market !== "kr" && krChartInstance) {
        krChartInstance.dispose();
        krChartInstance = null;
      }
      if (market !== "kr") {
        tvUpdatedAt.value = new Date().toLocaleString("ko-KR", {
          year: "numeric",
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      nextTick(() => {
        if (market === "kr") loadKrHeatmap();
        else initHeatmap(market);
      });
    }

    async function loadKrHeatmap() {
      // #10 캐시된 섹터 데이터 재사용 (API 재호출 없이 차트만 재초기화)
      if (krHeatmapSectorsCache) {
        krHeatmapLoading.value = false;
        await nextTick();
        const el = krChartEl.value;
        if (!el) return;
        if (krChartInstance) krChartInstance.dispose();
        krChartInstance = echarts.init(el, "dark");
        krChartInstance.setOption(buildKrOption(krHeatmapSectorsCache));
        return;
      }

      krHeatmapLoading.value = true;
      krHeatmapError.value = "";
      try {
        const res = await axios.get("/api/stock/heatmap/kr");
        krUpdatedAt.value = res.data.updatedAt || "";
        krHeatmapSectorsCache = res.data.sectors; // #10 캐시 저장

        // loading을 false로 먼저 바꿔야 v-else 차트 div가 DOM에 생성됨
        krHeatmapLoading.value = false;
        await nextTick();

        const el = krChartEl.value;
        if (!el) return;

        if (krChartInstance) krChartInstance.dispose();
        krChartInstance = echarts.init(el, "dark");
        krChartInstance.setOption(buildKrOption(res.data.sectors));
      } catch (e) {
        krHeatmapError.value = "국내 히트맵 데이터를 불러올 수 없습니다.";
        krHeatmapLoading.value = false;
      }
    }

    function heatColor(pct) {
      if (pct >= 4) return "#0ecb81";
      if (pct >= 2) return "#1a9e64";
      if (pct >= 0.5) return "#0d7a4e";
      if (pct >= 0) return "#1a4a35";
      if (pct > -0.5) return "#5e1a1a";
      if (pct > -2) return "#b03030";
      if (pct > -4) return "#d94040";
      return "#ff4d4d";
    }

    function buildKrOption(sectors) {
      const isMobile = window.innerWidth <= 768;
      const nameFontSize = isMobile ? 14 : 12;
      const pctFontSize  = isMobile ? 12 : 11;
      const upperHeight  = isMobile ? 32 : 28;
      const upperFontSize = isMobile ? 13 : 13;

      const treeData = sectors.map((sector) => ({
        name: sector.sector,
        children: sector.stocks.map((s) => ({
          name: s.name,
          value: s.marketCap,
          changePct: s.changePercent,
          price: s.price,
          symbol: s.symbol,
          itemStyle: { color: heatColor(s.changePercent) },
        })),
      }));

      return {
        backgroundColor: "transparent",
        tooltip: {
          formatter(info) {
            const d = info.data;
            if (!d.changePct && d.changePct !== 0) return d.name;
            const sign = d.changePct >= 0 ? "+" : "";
            return `<b>${d.name}</b><br/>
                    ${d.price?.toLocaleString("ko-KR")}원<br/>
                    ${sign}${d.changePct.toFixed(2)}%`;
          },
        },
        series: [
          {
            type: "treemap",
            roam: false,
            nodeClick: false,
            visibleMin: isMobile ? 800 : 400,
            breadcrumb: { show: true, itemStyle: { color: "#2a2a3e" } },
            label: {
              show: true,
              formatter(p) {
                const d = p.data;
                if (!d.changePct && d.changePct !== 0) return p.name;
                const sign = d.changePct >= 0 ? "+" : "";
                return `{name|${d.name}}\n{pct|${sign}${d.changePct.toFixed(2)}%}`;
              },
              rich: {
                name: { fontSize: nameFontSize, fontWeight: "bold", color: "#fff" },
                pct:  { fontSize: pctFontSize,  color: "rgba(255,255,255,0.9)" },
              },
            },
            upperLabel: {
              show: true,
              height: upperHeight,
              color: "#fff",
              fontWeight: "bold",
              fontSize: upperFontSize,
              backgroundColor: "rgba(0,0,0,0.45)",
            },
            itemStyle: { borderColor: "#1a1a2e", borderWidth: 2, gapWidth: 2 },
            levels: [
              {
                itemStyle: { borderColor: "#555", borderWidth: 3, gapWidth: 3 },
              },
              { itemStyle: { borderWidth: 2, gapWidth: 2 } },
            ],
            data: treeData,
          },
        ],
      };
    }

    function onResizeKrChart() {
      if (krChartInstance) krChartInstance.resize();
    }

    function initHeatmap(market) {
      const container = document.querySelector("#tv-heatmap");
      if (!container) return;

      // 이전 위젯 제거
      container.innerHTML =
        '<div class="tradingview-widget-container__widget"></div>';

      const script = document.createElement("script");
      script.type = "text/javascript";
      script.src =
        "https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js";
      script.async = true;
      const isMobile = window.innerWidth <= 768;
      const tvHeight = isMobile
        ? Math.floor(window.innerHeight * 0.7).toString()
        : "560";

      script.textContent = JSON.stringify({
        exchanges: market === "nasdaq" ? ["NASDAQ"] : [],
        dataSource: market === "nasdaq" ? "NDX100" : "SPX500",
        // 모바일: 그룹 없이 시총 순 정렬 → 대형주만 크게, 소형주는 작은 점
        // 데스크탑: 섹터별 그룹핑
        grouping: isMobile ? "no_group" : "sector",
        blockSize: "market_cap_basic",
        blockColor: "change",
        locale: "en",
        symbolUrl: "",
        colorTheme: "dark",
        hasTopBar: false,
        isDataSetEnabled: false,
        isZoomEnabled: true,
        hasSymbolTooltip: true,
        isMonoSize: false,
        width: "100%",
        height: tvHeight,
      });
      container.appendChild(script);
    }

    // ─── 시총 Top 10 ─────────────────────────────────
    function switchTop10(market) {
      top10Market.value = market;
      loadTop10();
    }

    async function loadTop10() {
      top10Loading.value = true;
      top10Error.value = "";
      try {
        const endpoint =
          top10Market.value === "kr"
            ? "/api/stock/top10/kr"
            : top10Market.value === "kosdaq"
            ? "/api/stock/top10/kosdaq"
            : "/api/stock/top10/us";
        const res = await axios.get(endpoint);
        top10Data.value = res.data;
        top10UpdateTime.value = new Date().toLocaleTimeString("ko-KR");
      } catch (e) {
        top10Error.value =
          "시세 데이터를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.";
      } finally {
        top10Loading.value = false;
      }
    }

    // ─── 뉴스 ────────────────────────────────────────
    async function loadNews(market = "KR", force = false) {
      newsLoading.value = true;
      newsError.value = "";
      try {
        const params = { market };
        if (force) params.force = true;
        const res = await axios.get("/api/stock/news", { params });
        newsData.value = res.data;
        newsLastFetched.value = new Date();
      } catch (e) {
        newsError.value =
          "뉴스를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.";
      } finally {
        newsLoading.value = false;
      }
    }

    const filteredNewsData = computed(() => {
      let data = newsData.value;

      // 보유 종목 필터
      if (newsFilterHoldings.value && holdings.value.length > 0) {
        const keywords = holdings.value.flatMap(h => {
          const terms = [];
          if (h.market === 'KR') {
            terms.push(h.name.toLowerCase());
          } else {
            const ticker = h.symbol.replace(/\.(KS|KQ)$/i, '').toUpperCase();
            const enName = usEnNames.value[ticker];
            if (enName) {
              // 한글명으로 저장된 종목(테슬라→tesla 등) 영문 이름으로 매칭
              enName.split(' ').forEach(w => { if (w.length >= 3) terms.push(w); });
            }
            // 영문명 저장 종목(Schwab, Direxion 등)은 첫 단어로 매칭
            const firstName = h.name.split(/[\s,.(]/)[0].toLowerCase();
            if (firstName.length >= 3) terms.push(firstName);
            // ticker 보조 매칭
            if (ticker.length >= 2) terms.push(ticker.toLowerCase());
          }
          return terms;
        });
        data = data.filter(news => {
          const text = [
            news.title || '', news.originalTitle || '',
            news.description || '', news.originalDescription || '',
          ].join(' ').toLowerCase();
          return keywords.some(kw => kw.length >= 2 && text.includes(kw));
        });
      }

      // 키워드 검색 필터
      const kw = newsKeyword.value.trim().toLowerCase();
      if (kw) {
        data = data.filter(news => {
          const text = [
            news.title || '', news.originalTitle || '',
            news.description || '', news.originalDescription || '',
          ].join(' ').toLowerCase();
          return text.includes(kw);
        });
      }

      return data;
    });

    async function switchNewsMarket(market) {
      if (newsMarket.value === market) return;
      newsMarket.value = market;
      localStorage.setItem('stock_newsMarket', market);
      newsData.value = [];
      newsKeyword.value = '';
      newsFilterHoldings.value = false; // #2 필터 리셋
      await loadNews(market);
    }

    async function refreshNews() {
      newsData.value = [];
      await loadNews(newsMarket.value, true);
    }

    function newsSourceKey(source) {
      const map = {
        '한국경제': 'hk', '머니투데이': 'mt', '연합뉴스': 'yn', '매일경제': 'mk',
        '이데일리': 'ed', '서울경제': 'sd', '아시아경제': 'ae',
        'Yahoo Finance': 'yf', 'MarketWatch': 'mw', 'CNBC': 'cnbc',
        'AP News': 'ap', 'Motley Fool': 'mf', 'Investopedia': 'iv',
      };
      return map[source] || 'etc';
    }

    const newsLastFetchedText = computed(() => {
      if (!newsLastFetched.value) return '';
      return newsLastFetched.value.toLocaleTimeString('ko-KR', {
        hour: '2-digit', minute: '2-digit',
      }) + ' 기준';
    });

    // ─── 포맷 헬퍼 ──────────────────────────────────
    function formatPrice(price, currency) {
      if (price == null) return "-";
      const abs = Math.abs(price);
      if (currency === "KRW") {
        return new Intl.NumberFormat("ko-KR").format(Math.round(price)) + "원";
      }
      return (
        "$" +
        abs.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      );
    }

    function formatVolume(vol) {
      if (!vol) return '—';
      if (vol >= 1e8) return (vol / 1e8).toFixed(1) + '억주';
      if (vol >= 1e4) return (vol / 1e4).toFixed(0) + '만주';
      return vol.toLocaleString() + '주';
    }

    function formatMarketCap(cap, currency) {
      if (!cap) return "-";
      if (currency === "KRW") {
        const jo = cap / 1e12;
        return jo >= 1 ? jo.toFixed(1) + "조" : (cap / 1e8).toFixed(0) + "억";
      }
      const t = cap / 1e12;
      if (t >= 1) return "$" + t.toFixed(2) + "T";
      const b = cap / 1e9;
      return "$" + b.toFixed(1) + "B";
    }

    function formatChangePct(v) {
      if (v == null) return '—';
      return (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
    }

    function formatNewsDate(pubDate) {
      if (!pubDate) return "";
      try {
        const date = new Date(pubDate);
        const diff = Math.floor((Date.now() - date) / 1000);
        if (diff < 60)    return '방금 전';
        if (diff < 3600)  return `${Math.floor(diff / 60)}분 전`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
        return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
      } catch {
        return pubDate.substring(0, 10);
      }
    }

    function changeClass(val) {
      if (val > 0) return "positive";
      if (val < 0) return "negative";
      return "neutral";
    }

    function rankClass(rank) {
      if (rank === 1) return "rank-gold";
      if (rank === 2) return "rank-silver";
      if (rank === 3) return "rank-bronze";
      return "";
    }

    function onOrientationChange() {
      // 방향 전환 후 레이아웃 확정되면 차트 리사이즈
      setTimeout(() => {
        if (krChartInstance) {
          krChartInstance.resize();
          // 폰트 크기도 재계산
          if (heatmapMarket.value === "kr") loadKrHeatmap();
        }
      }, 300);
    }

    // #12 도넛 차트 hover — 현재 hover 중인 세그먼트
    const hoveredSegment = computed(() =>
      hoveredSegId.value ? chartSegments.value.find(s => s.id === hoveredSegId.value) : null
    );

    // #13 방문 링크 등록 함수
    function markVisited(link) {
      if (visitedLinksSet.value.has(link)) return;
      const updated = [...visitedLinksList.value, link];
      // 최대 500개 유지
      visitedLinksList.value = updated.length > 500 ? updated.slice(-500) : updated;
      localStorage.setItem('stock_visited_links', JSON.stringify(visitedLinksList.value));
    }

    // #11 ESC 키로 종목 추가 모달 닫기
    function onKeydown(e) {
      if (e.key === 'Escape' && showAddModal.value) closeAddModal();
    }

    // KRX API 키 만료 현황 (#15: krxExpiryDate ref 사용)
    const krxDaysRemaining = computed(() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return Math.ceil((krxExpiryDate.value - today) / (1000 * 60 * 60 * 24));
    });
    const krxApiStatus = computed(() => {
      const d = krxDaysRemaining.value;
      if (d < 0) return 'expired';
      if (d <= 30) return 'warning';
      return 'valid';
    });
    const krxApiStatusText = computed(() => {
      const d = krxDaysRemaining.value;
      if (d < 0) return '만료됨';
      if (d <= 30) return '만료 임박';
      return '정상';
    });

    const krxPeriodText = computed(() => {
      const fmt = d => `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
      const end = new Date(krxExpiryDate.value);
      const start = new Date(end);
      start.setFullYear(start.getFullYear() - 1);
      start.setDate(start.getDate() + 1);
      return `${fmt(start)} ~ ${fmt(end)}`;
    });

    onMounted(async () => {
      await initPortfolio();
      const tabFromUrl = route.query.tab;
      if (tabFromUrl && VALID_TABS.includes(tabFromUrl)) {
        switchTab(tabFromUrl);
      } else {
        fetchPrices();
      }
      // #3 balance 탭일 때만 가격 자동 갱신
      refreshTimer = setInterval(() => {
        if (activeTab.value === 'balance') fetchPrices();
      }, 120000);
      relativeTimer = setInterval(updateRelativeTime, 10000);
      window.addEventListener("resize", onResizeKrChart);
      window.addEventListener("orientationchange", onOrientationChange);
      // #11 ESC 키로 모달 닫기
      document.addEventListener("keydown", onKeydown);
      // #15 KRX 만료일 백엔드에서 로드
      try {
        const res = await axios.get("/api/stock/krx-config");
        if (res.data?.expiryDate) {
          krxExpiryDate.value = new Date(res.data.expiryDate + 'T23:59:59');
        }
      } catch { /* 기본값 사용 */ }
      // 미국 종목 영문 검색어 맵 로드 (뉴스 필터링용)
      try {
        const res = await axios.get("/api/stock/en-names");
        if (res.data && typeof res.data === 'object') {
          usEnNames.value = res.data;
        }
      } catch { /* 필터링 기능은 비어있는 맵으로도 동작 */ }
    });

    onBeforeUnmount(() => {
      clearInterval(refreshTimer);
      clearInterval(relativeTimer);
      clearInterval(newsTimer); // #9
      window.removeEventListener("resize", onResizeKrChart);
      window.removeEventListener("orientationchange", onOrientationChange);
      document.removeEventListener("keydown", onKeydown); // #11
      if (krChartInstance) {
        krChartInstance.dispose();
        krChartInstance = null;
      }
    });

    return {
      activeTab,
      heatmapMarket,
      top10Market,
      tabs,
      krChartEl,
      krHeatmapLoading,
      krHeatmapError,
      krUpdatedAt,
      tvUpdatedAt,
      isUsMarketOpen,
      // 포트폴리오
      holdings,
      prices,
      priceLoading,
      portfolioView,
      marketFilter,
      exchangeRate,
      exRateAt,
      lastUpdatedAt,
      relativeUpdated,
      sortKey,
      sortDir,
      filteredHoldings,
      sortedHoldings,
      krHoldingsCount,
      usHoldingsCount,
      showAddModal,
      searchQ,
      showDropdown,
      searchResults,
      searchLoading,
      newHolding,
      editingId,
      editForm,
      canAdd,
      krTotal,
      usTotal,
      usTotalKRW,
      hasAvgPrice,
      totalCost,
      totalPnl,
      totalPnlPct,
      krPnl,
      krPnlPct,
      krHasAvgPrice,
      usPnl,
      usPnlPct,
      usHasAvgPrice,
      totalValKRW,
      totalCostKRW,
      totalPnlKRW,
      totalPnlKRWPct,
      chartSegments,
      // 포트폴리오 함수
      openAddModal,
      closeAddModal,
      onMarketChange,
      onSearchInput,
      selectStock,
      onSearchBlur,
      addHolding,
      removeHolding,
      startEdit,
      saveEdit,
      fetchPrices,
      fmtKRW,
      fmtUSD,
      fmtByMkt,
      fmtAbsPnl,
      fmtCurPrice,
      fmtHoldVal,
      fmtHoldPnl,
      fmtHoldPnlPct,
      fmtLegVal,
      holdPnl,
      holdPnlPct,
      holdValKRW,
      pnlCls,
      toggleSort,
      fmtChangePct,
      fmtChangePctDisplay,
      changePctCls,
      // Top10 / 뉴스
      top10Data,
      top10Loading,
      top10Error,
      top10UpdateTime,
      newsData,
      newsLoading,
      newsError,
      newsMarket,
      newsFilterHoldings,
      newsKeyword,
      newsLastFetched,
      newsLastFetchedText,
      filteredNewsData,
      switchNewsMarket,
      refreshNews,
      newsSourceKey,
      visitedLinksSet,  // #13
      markVisited,      // #13
      hoveredSegId,     // #12
      hoveredSegment,   // #12
      switchTab,
      switchHeatmap,
      switchTop10,
      loadTop10,
      loadNews,
      formatPrice,
      formatVolume,
      formatMarketCap,
      formatChangePct,
      formatNewsDate,
      changeClass,
      rankClass,
      // KRX API
      krxDaysRemaining,
      krxApiStatus,
      krxApiStatusText,
      krxPeriodText,
      usEnNames,
    };
  },
};
</script>

<style scoped>
.krx-api-section {
  margin-bottom: 12px;
}
.krx-api-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  font-size: 13px;
  color: var(--text-muted);
}
.krx-api-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.krx-api-name {
  font-weight: 600;
  color: var(--text-primary);
}
.krx-status-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}
.krx-status-badge.api-status-valid    { background: #d1fae5; color: #065f46; }
.krx-status-badge.api-status-warning  { background: #fef3c7; color: #92400e; }
.krx-status-badge.api-status-expired  { background: #fee2e2; color: #991b1b; }
.krx-api-middle {
  display: flex;
  align-items: center;
  gap: 6px;
}
.krx-api-sep {
  color: var(--text-muted);
  opacity: 0.4;
}
.krx-days {
  font-weight: 600;
}
.krx-days.api-status-valid   { color: #059669; }
.krx-days.api-status-warning { color: #d97706; }
.krx-days.api-status-expired { color: #dc2626; }
.krx-renew-link {
  font-size: 12px;
  color: var(--text-muted);
  text-decoration: none;
  opacity: 0.7;
  transition: opacity 0.15s;
  white-space: nowrap;
}
.krx-renew-link:hover {
  opacity: 1;
  color: var(--text-primary);
}

/* ── KRX 만료 알림 배너 ── */
.krx-alert-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  flex-wrap: wrap;
}
.krx-alert-warning {
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid rgba(251, 191, 36, 0.4);
  color: #b45309;
}
.krx-alert-expired {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #b91c1c;
}
.krx-alert-icon { font-size: 16px; flex-shrink: 0; }
.krx-alert-msg  { flex: 1; line-height: 1.4; }
.krx-alert-link {
  font-size: 12px;
  font-weight: 600;
  color: inherit;
  text-decoration: underline;
  white-space: nowrap;
  opacity: 0.85;
}
.krx-alert-link:hover { opacity: 1; }

/* ── 투자 원금 레이블 ── */
.ps-cost-label {
  font-size: 11px;
  color: var(--text-muted);
  opacity: 0.8;
  margin-right: 4px;
}

/* ── Top10 거래량 컬럼 ── */
.col-vol {
  text-align: right;
  color: var(--text-secondary);
  font-size: 13px;
  white-space: nowrap;
}
.t10c-vol {
  color: var(--text-muted);
  font-size: 12px;
}
</style>

<style src="@/assets/css/stock.css" scoped></style>
