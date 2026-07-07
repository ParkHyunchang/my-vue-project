<template>
  <teleport to="body">
    <div
      v-if="show"
      class="modal-overlay"
      @click.self="$emit('close')"
    >
      <div
        class="modal-box"
        data-lenis-prevent
      >
        <div class="modal-hdr">
          <h3>종목 추가</h3>
          <button
            class="modal-close"
            @click="$emit('close')"
          >
            ✕
          </button>
        </div>

        <div
          v-if="allowCash"
          class="asset-type-switch"
          role="group"
          aria-label="추가할 자산 유형"
        >
          <button
            type="button"
            :class="['asset-type-btn', { active: !isCashAsset }]"
            @click="setStockAsset"
          >
            종목 검색
          </button>
          <button
            type="button"
            :class="['asset-type-btn', { active: isCashAsset }]"
            @click="setCashAsset()"
          >
            현금성 자산
          </button>
        </div>

        <div
          v-if="!isCashAsset"
          class="mform-row"
        >
          <label>종목 검색 (이름 · 티커)</label>
          <div class="stock-search-box">
            <input
              :value="searchQ"
              @input="onSearchQInput"
              type="text"
              placeholder="삼성전자, 테슬라, Tesla, NVDA, 005930.KS..."
              class="stock-search-inp"
              autocomplete="off"
              @focus="$emit('update:showDropdown', true)"
              @blur="$emit('search-blur')"
            >
            <div
              v-if="searchLoading"
              class="search-loading"
            >
              검색 중...
            </div>
            <div
              v-else-if="showDropdown && searchResults.length > 0"
              class="stock-dropdown"
            >
              <div
                v-for="s in searchResults"
                :key="s.symbol"
                class="stock-drop-item"
                @mousedown.prevent="$emit('select-stock', s)"
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
              <span>검색 결과가 없습니다</span>
              <button
                v-if="allowCash"
                type="button"
                class="search-empty-cash-btn"
                @mousedown.prevent="setCashAsset(searchQ)"
              >
                이 이름으로 현금성 자산 추가
              </button>
            </div>
          </div>
        </div>

        <div
          v-else
          class="cash-asset-guide"
        >
          현금성 대기자산, 예수금, MMDA처럼 가격 조회가 없는 항목은 금액을 직접 입력하세요.
        </div>

        <div class="mform-row">
          <label>{{ isCashAsset ? '자산명' : '종목명' }}</label>
          <input
            :value="newHolding.name"
            @input="isCashAsset && updateNewField('name', $event.target.value)"
            type="text"
            :placeholder="isCashAsset ? '현금성 대기자산' : '위에서 종목을 검색하세요'"
            :readonly="!isCashAsset"
            :class="{ 'inp-readonly': !isCashAsset }"
          >
        </div>
        <div
          v-if="!isCashAsset"
          class="mform-row"
        >
          <label>심볼</label>
          <input
            :value="newHolding.symbol"
            type="text"
            placeholder="위에서 종목을 검색하세요"
            readonly
            class="inp-readonly"
          >
        </div>

        <div
          v-if="newHolding.symbol && !isCashAsset"
          class="detected-market"
        >
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
          <label>{{ isCashAsset ? '금액' : '보유수량' }}</label>
          <input
            :value="newHolding.quantity"
            @input="updateNewField('quantity', $event.target.value === '' ? null : Number($event.target.value))"
            type="number"
            min="1"
            :placeholder="isCashAsset ? '0원' : '0'"
          >
          <div
            v-if="isCashAsset"
            class="quick-add-btns"
          >
            <button
              type="button"
              class="quick-btn quick-minus"
              @click="addQuantity(-100000)"
            >
              -10만
            </button>
            <button
              type="button"
              class="quick-btn"
              @click="addQuantity(10000)"
            >
              +1만
            </button>
            <button
              type="button"
              class="quick-btn"
              @click="addQuantity(100000)"
            >
              +10만
            </button>
            <button
              type="button"
              class="quick-btn"
              @click="addQuantity(1000000)"
            >
              +100만
            </button>
          </div>
          <div
            v-else
            class="quick-add-btns"
          >
            <button
              type="button"
              class="quick-btn quick-minus"
              @click="addQuantity(-10)"
            >
              -10
            </button>
            <button
              type="button"
              class="quick-btn quick-minus"
              @click="addQuantity(-1)"
            >
              -1
            </button>
            <button
              type="button"
              class="quick-btn"
              @click="addQuantity(1)"
            >
              +1
            </button>
            <button
              type="button"
              class="quick-btn"
              @click="addQuantity(10)"
            >
              +10
            </button>
          </div>
        </div>

        <div
          v-if="!isCashAsset"
          class="mform-row"
        >
          <label>평단가 <span class="opt-label">(선택)</span></label>
          <input
            :value="formattedAvgPrice"
            @input="onAvgPriceInput"
            type="text"
            inputmode="decimal"
            pattern="[0-9,]*[.]?[0-9]*"
            :placeholder="isKR ? '원 단위' : 'USD'"
          >
          <div
            v-if="isKR"
            class="quick-add-btns"
          >
            <button
              type="button"
              class="quick-btn"
              @click="addAvgPrice(1000)"
            >
              +1천
            </button>
            <button
              type="button"
              class="quick-btn"
              @click="addAvgPrice(5000)"
            >
              +5천
            </button>
            <button
              type="button"
              class="quick-btn"
              @click="addAvgPrice(10000)"
            >
              +1만
            </button>
            <button
              type="button"
              class="quick-btn"
              @click="addAvgPrice(100000)"
            >
              +10만
            </button>
          </div>
        </div>

        <div class="modal-actions">
          <button
            class="mbtn-cancel"
            @click="$emit('close')"
          >
            취소
          </button>
          <button
            class="mbtn-submit"
            :disabled="!canAdd"
            @click="$emit('add')"
          >
            추가
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script>
import { computed, watch, onBeforeUnmount } from 'vue';
import { lenis } from '@/assets/js/smooth.js';

export default {
  name: 'AddHoldingModal',
  props: {
    show: { type: Boolean, required: true },
    allowCash: { type: Boolean, default: false },
    searchQ: { type: String, default: '' },
    showDropdown: { type: Boolean, default: false },
    searchResults: { type: Array, required: true },
    searchLoading: { type: Boolean, default: false },
    newHolding: { type: Object, required: true },
    canAdd: { type: Boolean, default: false },
  },
  emits: [
    'close',
    'add',
    'select-stock',
    'search-blur',
    'search-input',
    'update:searchQ',
    'update:showDropdown',
    'update:newHolding',
  ],
  setup(props, { emit }) {
    // 모달이 열려 있는 동안 뒤 배경 스크롤 잠금 — 모달 내부만 스크롤되도록.
    // 이 사이트는 Lenis(JS 스무스 스크롤)를 쓰므로 CSS overflow:hidden만으로는 안 막힌다.
    // Lenis를 stop()/start()로 직접 제어하고, 폴백으로 body/html overflow도 함께 잠근다.
    const setBgScrollLock = (locked) => {
      const v = locked ? 'hidden' : '';
      document.body.style.overflow = v;
      document.documentElement.style.overflow = v;
      if (lenis) locked ? lenis.stop() : lenis.start();
    };
    watch(() => props.show, setBgScrollLock, { immediate: true });
    onBeforeUnmount(() => setBgScrollLock(false));

    const onSearchQInput = (e) => {
      emit('update:searchQ', e.target.value);
      emit('search-input');
    };
    const updateNewField = (key, value) => {
      emit('update:newHolding', { ...props.newHolding, [key]: value });
    };
    const isCashAsset = computed(() => props.newHolding.assetType === 'CASH');
    const makeCashSymbol = () => `CASH-KRW-${Date.now()}`;
    const setCashAsset = (name = '') => {
      const existingCashName = props.newHolding.assetType === 'CASH' ? props.newHolding.name : '';
      const assetName = String(name || '').trim() || existingCashName || '현금성 대기자산';
      emit('update:searchQ', '');
      emit('update:showDropdown', false);
      emit('update:newHolding', {
        ...props.newHolding,
        assetType: 'CASH',
        market: 'KR',
        name: assetName,
        symbol: props.newHolding.assetType === 'CASH' && props.newHolding.symbol
          ? props.newHolding.symbol
          : makeCashSymbol(),
        quantity: props.newHolding.assetType === 'CASH' ? props.newHolding.quantity : null,
        avgPrice: 1,
      });
    };
    const setStockAsset = () => {
      emit('update:newHolding', {
        assetType: 'STOCK',
        market: 'US',
        name: '',
        symbol: '',
        quantity: null,
        avgPrice: null,
      });
      emit('update:searchQ', '');
      emit('update:showDropdown', false);
    };

    const isKR = computed(() => {
      const sym = (props.newHolding.symbol || '').toUpperCase();
      if (sym.endsWith('.KS') || sym.endsWith('.KQ')) return true;
      return props.newHolding.market === 'KR';
    });

    const formattedAvgPrice = computed(() => {
      const v = props.newHolding.avgPrice;
      if (v == null || v === '') return '';
      const s = String(v);
      const [intPart, decPart] = s.split('.');
      const intNum = intPart.replace(/[^\d-]/g, '');
      const formatted = intNum === '' || intNum === '-'
        ? intNum
        : Number(intNum).toLocaleString('en-US');
      return decPart !== undefined ? `${formatted}.${decPart}` : formatted;
    });

    const onAvgPriceInput = (e) => {
      const raw = e.target.value.replace(/,/g, '');
      if (raw === '') {
        updateNewField('avgPrice', null);
        return;
      }
      if (!/^-?\d*\.?\d*$/.test(raw)) return;
      updateNewField('avgPrice', raw);
    };

    const addAvgPrice = (n) => {
      const current = Number(props.newHolding.avgPrice) || 0;
      updateNewField('avgPrice', String(current + n));
    };

    const addQuantity = (n) => {
      const current = Number(props.newHolding.quantity) || 0;
      const next = Math.max(0, current + n);
      updateNewField('quantity', next === 0 ? null : next);
    };

    return {
      onSearchQInput, updateNewField,
      isCashAsset, setCashAsset, setStockAsset,
      isKR, formattedAvgPrice, onAvgPriceInput, addAvgPrice,
      addQuantity,
    };
  },
};
</script>

<style src="@/assets/css/stock.css" scoped></style>
