<template>
  <div class="holdings-cards">
    <div v-for="h in sortedHoldings" :key="h.id" class="holding-card">
      <template v-if="editingId === h.id">
        <div class="hcard-header">
          <div class="hcard-name-wrap">
            <span class="mkt-flag">{{ isCashHolding(h) ? "💵" : h.market === "KR" ? "🇰🇷" : "🇺🇸" }}</span>
            <div>
              <div class="h-name">
                {{ h.name }}
                <span v-if="h.accountLabel" class="acct-badge">{{ h.accountLabel }}</span>
              </div>
              <div class="h-sym">{{ isCashHolding(h) ? "현금성 자산" : h.symbol }}</div>
            </div>
          </div>
          <div class="hcard-price-wrap">
            <div class="hcard-price">{{ fmtCurPrice(h) }}</div>
            <span v-if="isCashHolding(h)" class="txt-muted" style="margin-top:4px; display:inline-block;">—</span>
            <span v-else :class="['change-badge', changePctCls(h) || 'neutral']" style="margin-top:4px; display:inline-block;">{{ fmtChangePctDisplay(h) }}</span>
          </div>
        </div>
        <div class="hcard-edit-body">
          <div class="hcard-edit-row">
            <label class="hcard-edit-label">{{ isCashHolding(h) ? '금액' : '보유수량' }}</label>
            <div class="hcard-edit-field">
              <input
                :value="editForm.quantity"
                @input="$emit('update:editForm', { ...editForm, quantity: $event.target.value === '' ? null : Number($event.target.value) })"
                type="number"
                min="1"
                class="hcard-edit-inp"
              />
              <div v-if="isCashHolding(h)" class="quick-add-btns">
                <button type="button" class="quick-btn quick-minus" @click="addQuantity(-100000)">-10만</button>
                <button type="button" class="quick-btn" @click="addQuantity(10000)">+1만</button>
                <button type="button" class="quick-btn" @click="addQuantity(100000)">+10만</button>
                <button type="button" class="quick-btn" @click="addQuantity(1000000)">+100만</button>
              </div>
              <div v-else class="quick-add-btns">
                <button type="button" class="quick-btn quick-minus" @click="addQuantity(-10)">-10</button>
                <button type="button" class="quick-btn quick-minus" @click="addQuantity(-1)">-1</button>
                <button type="button" class="quick-btn" @click="addQuantity(1)">+1</button>
                <button type="button" class="quick-btn" @click="addQuantity(10)">+10</button>
              </div>
            </div>
          </div>
          <div v-if="!isCashHolding(h)" class="hcard-edit-row">
            <label class="hcard-edit-label">평단가 <span class="opt-label">(선택)</span></label>
            <div class="hcard-edit-field">
              <input
                :value="formatAvgPrice(editForm.avgPrice)"
                @input="onAvgPriceInput($event)"
                type="text"
                inputmode="decimal"
                pattern="[0-9,]*[.]?[0-9]*"
                class="hcard-edit-inp"
                :placeholder="h.market === 'KR' ? '원 단위' : 'USD'"
              />
              <div v-if="h.market === 'KR'" class="quick-add-btns">
                <button type="button" class="quick-btn" @click="addAvgPrice(1000)">+1천</button>
                <button type="button" class="quick-btn" @click="addAvgPrice(5000)">+5천</button>
                <button type="button" class="quick-btn" @click="addAvgPrice(10000)">+1만</button>
                <button type="button" class="quick-btn" @click="addAvgPrice(100000)">+10만</button>
              </div>
            </div>
          </div>
        </div>
        <div class="hcard-actions">
          <button class="act-btn act-save" @click="$emit('save-edit', h)">저장</button>
          <button class="act-btn act-cancel" @click="$emit('cancel-edit')">취소</button>
        </div>
      </template>
      <template v-else>
        <div class="hcard-header">
          <div class="hcard-name-wrap">
            <span class="mkt-flag">{{ isCashHolding(h) ? "💵" : h.market === "KR" ? "🇰🇷" : "🇺🇸" }}</span>
            <div>
              <div class="h-name">
                {{ h.name }}
                <span v-if="h.accountLabel" class="acct-badge">{{ h.accountLabel }}</span>
              </div>
              <div class="h-sym">{{ isCashHolding(h) ? "현금성 자산" : h.symbol }}</div>
            </div>
          </div>
          <div class="hcard-price-wrap">
            <div class="hcard-price">{{ fmtCurPrice(h) }}</div>
            <span v-if="isCashHolding(h)" class="txt-muted" style="margin-top:4px; display:inline-block;">—</span>
            <span v-else :class="['change-badge', changePctCls(h) || 'neutral']" style="margin-top:4px; display:inline-block;">{{ fmtChangePctDisplay(h) }}</span>
          </div>
        </div>
        <div class="hcard-body">
          <div class="hcard-row">
            <span class="hcard-label">{{ isCashHolding(h) ? '금액' : '보유수량' }}</span>
            <span>{{ isCashHolding(h) ? fmtKRW(Number(h.quantity) || 0) : `${h.quantity.toLocaleString()}주` }}</span>
          </div>
          <div class="hcard-row">
            <span class="hcard-label">평가금액</span>
            <span>{{ fmtHoldVal(h) }}</span>
          </div>
          <div v-if="h.avgPrice && !isCashHolding(h)" class="hcard-row">
            <span class="hcard-label">평단가</span>
            <span>{{ fmtByMkt(h.avgPrice, h.market) }}</span>
          </div>
          <div v-if="holdPnl(h) !== null && !isCashHolding(h)" class="hcard-row">
            <span class="hcard-label">평가손익</span>
            <span :class="pnlCls(holdPnl(h))">{{ fmtHoldPnl(h) }}</span>
          </div>
          <div v-if="holdPnlPct(h) !== null && !isCashHolding(h)" class="hcard-row">
            <span class="hcard-label">수익률</span>
            <span :class="pnlCls(holdPnlPct(h))">{{ fmtHoldPnlPct(h) }}</span>
          </div>
        </div>
        <div class="hcard-actions">
          <button v-if="!isCashHolding(h)" class="act-btn act-analyze" @click="$emit('analyze', h)">✨ AI 분석</button>
          <template v-if="!readonly">
            <button class="act-btn act-edit" @click="$emit('start-edit', h)">수정</button>
            <button class="act-btn act-del" @click="$emit('remove', h.id)">삭제</button>
          </template>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HoldingsCards',
  props: {
    sortedHoldings: { type: Array, required: true },
    editingId: { default: null },
    editForm: { type: Object, required: true },
    fmtCurPrice: { type: Function, required: true },
    fmtChangePctDisplay: { type: Function, required: true },
    changePctCls: { type: Function, required: true },
    fmtHoldVal: { type: Function, required: true },
    fmtByMkt: { type: Function, required: true },
    fmtKRW: { type: Function, required: true },
    holdPnl: { type: Function, required: true },
    fmtHoldPnl: { type: Function, required: true },
    holdPnlPct: { type: Function, required: true },
    fmtHoldPnlPct: { type: Function, required: true },
    pnlCls: { type: Function, required: true },
    readonly: { type: Boolean, default: false },
  },
  emits: ['start-edit', 'save-edit', 'cancel-edit', 'remove', 'toggle-core', 'update:editForm', 'analyze'],
  setup(props, { emit }) {
    const isCashHolding = (holding) => holding?.assetType === 'CASH';
    const formatAvgPrice = (v) => {
      if (v == null || v === '') return '';
      const s = String(v);
      const [intPart, decPart] = s.split('.');
      const intNum = intPart.replace(/[^\d-]/g, '');
      const formatted = intNum === '' || intNum === '-'
        ? intNum
        : Number(intNum).toLocaleString('en-US');
      return decPart !== undefined ? `${formatted}.${decPart}` : formatted;
    };
    const onAvgPriceInput = (e) => {
      const raw = e.target.value.replace(/,/g, '');
      if (raw === '') {
        emit('update:editForm', { ...props.editForm, avgPrice: null });
        return;
      }
      if (!/^-?\d*\.?\d*$/.test(raw)) return;
      emit('update:editForm', { ...props.editForm, avgPrice: raw });
    };
    const addAvgPrice = (n) => {
      const current = Number(props.editForm.avgPrice) || 0;
      emit('update:editForm', { ...props.editForm, avgPrice: String(current + n) });
    };
    const addQuantity = (n) => {
      const current = Number(props.editForm.quantity) || 0;
      const next = Math.max(0, current + n);
      emit('update:editForm', { ...props.editForm, quantity: next === 0 ? null : next });
    };
    return { isCashHolding, formatAvgPrice, onAvgPriceInput, addAvgPrice, addQuantity };
  },
};
</script>

<style src="@/assets/css/stock.css" scoped></style>
