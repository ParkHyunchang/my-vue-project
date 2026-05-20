<template>
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
            <input
              :value="editForm.quantity"
              @input="$emit('update:editForm', { ...editForm, quantity: $event.target.value === '' ? null : Number($event.target.value) })"
              type="number"
              min="1"
              class="hcard-edit-inp"
            />
          </div>
          <div class="hcard-edit-row">
            <label class="hcard-edit-label">평단가 <span class="opt-label">(선택)</span></label>
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
        <div class="hcard-actions">
          <button class="act-btn act-save" @click="$emit('save-edit', h)">저장</button>
          <button class="act-btn act-cancel" @click="$emit('cancel-edit')">취소</button>
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
          <button class="act-btn act-analyze" @click="$emit('analyze', h)">✨ AI 분석</button>
          <button class="act-btn act-edit" @click="$emit('start-edit', h)">수정</button>
          <button class="act-btn act-del" @click="$emit('remove', h.id)">삭제</button>
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
    holdPnl: { type: Function, required: true },
    fmtHoldPnl: { type: Function, required: true },
    holdPnlPct: { type: Function, required: true },
    fmtHoldPnlPct: { type: Function, required: true },
    pnlCls: { type: Function, required: true },
  },
  emits: ['start-edit', 'save-edit', 'cancel-edit', 'remove', 'update:editForm', 'analyze'],
  setup(props, { emit }) {
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
    return { formatAvgPrice, onAvgPriceInput, addAvgPrice };
  },
};
</script>

<style src="@/assets/css/stock.css" scoped></style>
