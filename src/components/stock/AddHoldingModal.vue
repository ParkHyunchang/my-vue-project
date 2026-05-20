<template>
  <teleport to="body">
    <div
      v-if="show"
      class="modal-overlay"
      @click.self="$emit('close')"
    >
      <div class="modal-box">
        <div class="modal-hdr">
          <h3>종목 추가</h3>
          <button class="modal-close" @click="$emit('close')">✕</button>
        </div>

        <div class="mform-row">
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
              검색 결과가 없습니다
            </div>
          </div>
        </div>

        <div class="mform-row">
          <label>종목명</label>
          <input
            :value="newHolding.name"
            type="text"
            placeholder="위에서 종목을 검색하세요"
            readonly
            class="inp-readonly"
          />
        </div>
        <div class="mform-row">
          <label>심볼</label>
          <input
            :value="newHolding.symbol"
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
            :value="newHolding.quantity"
            @input="updateNewField('quantity', $event.target.value === '' ? null : Number($event.target.value))"
            type="number"
            min="1"
            placeholder="0"
          />
          <div class="quick-add-btns">
            <button type="button" class="quick-btn quick-minus" @click="addQuantity(-10)">-10</button>
            <button type="button" class="quick-btn quick-minus" @click="addQuantity(-1)">-1</button>
            <button type="button" class="quick-btn" @click="addQuantity(1)">+1</button>
            <button type="button" class="quick-btn" @click="addQuantity(10)">+10</button>
          </div>
        </div>

        <div class="mform-row">
          <label>평단가 <span class="opt-label">(선택)</span></label>
          <input
            :value="formattedAvgPrice"
            @input="onAvgPriceInput"
            type="text"
            inputmode="decimal"
            pattern="[0-9,]*[.]?[0-9]*"
            :placeholder="isKR ? '원 단위' : 'USD'"
          />
          <div v-if="isKR" class="quick-add-btns">
            <button type="button" class="quick-btn" @click="addAvgPrice(1000)">+1천</button>
            <button type="button" class="quick-btn" @click="addAvgPrice(5000)">+5천</button>
            <button type="button" class="quick-btn" @click="addAvgPrice(10000)">+1만</button>
            <button type="button" class="quick-btn" @click="addAvgPrice(100000)">+10만</button>
          </div>
        </div>

        <div class="modal-actions">
          <button class="mbtn-cancel" @click="$emit('close')">취소</button>
          <button class="mbtn-submit" :disabled="!canAdd" @click="$emit('add')">
            추가
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script>
import { computed } from 'vue';

export default {
  name: 'AddHoldingModal',
  props: {
    show: { type: Boolean, required: true },
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
    const onSearchQInput = (e) => {
      emit('update:searchQ', e.target.value);
      emit('search-input');
    };
    const updateNewField = (key, value) => {
      emit('update:newHolding', { ...props.newHolding, [key]: value });
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
      isKR, formattedAvgPrice, onAvgPriceInput, addAvgPrice,
      addQuantity,
    };
  },
};
</script>

<style src="@/assets/css/stock.css" scoped></style>
