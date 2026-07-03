<template>
  <div class="holdings-table-wrap">
    <table class="holdings-table">
      <thead>
        <tr>
          <th class="sortable-th" @click="$emit('toggle-sort', 'name')">
            종목<span class="sort-ind">{{ sortKey === 'name' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '' }}</span>
          </th>
          <th class="th-r">수량/금액</th>
          <th class="th-r sortable-th" @click="$emit('toggle-sort', 'curPrice')">
            현재가<span class="sort-ind">{{ sortKey === 'curPrice' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '' }}</span>
          </th>
          <th class="th-r sortable-th" @click="$emit('toggle-sort', 'changePct')">
            등락률<span class="sort-ind">{{ sortKey === 'changePct' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '' }}</span>
          </th>
          <th class="th-r sortable-th" @click="$emit('toggle-sort', 'value')">
            평가금액<span class="sort-ind">{{ sortKey === 'value' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '' }}</span>
          </th>
          <th class="th-r">평단가</th>
          <th class="th-r">평가손익</th>
          <th class="th-r sortable-th" @click="$emit('toggle-sort', 'pnlPct')">
            수익률<span class="sort-ind">{{ sortKey === 'pnlPct' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '' }}</span>
          </th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="h in sortedHoldings" :key="h.id">
          <template v-if="editingId === h.id">
            <td class="hname-cell">
              <span class="mkt-flag">{{ isCashHolding(h) ? "💵" : h.market === "KR" ? "🇰🇷" : "🇺🇸" }}</span>
              <div>
                <div class="h-name">
                  {{ h.name }}
                  <span v-if="h.accountLabel" class="acct-badge">{{ h.accountLabel }}</span>
                </div>
                <div class="h-sym">{{ isCashHolding(h) ? "현금성 자산" : h.symbol }}</div>
              </div>
            </td>
            <td class="td-r">
              <input
                :value="editForm.quantity"
                @input="$emit('update:editForm', { ...editForm, quantity: $event.target.value === '' ? null : Number($event.target.value) })"
                type="number"
                min="1"
                class="inline-inp"
              />
            </td>
            <td class="td-r">{{ fmtCurPrice(h) }}</td>
            <td class="td-r">
              <span v-if="isCashHolding(h)" class="txt-muted">—</span>
              <span v-else :class="['change-badge', changePctCls(h) || 'neutral']">{{ fmtChangePctDisplay(h) }}</span>
            </td>
            <td class="td-r">{{ fmtHoldVal(h) }}</td>
            <td class="td-r">
              <span v-if="isCashHolding(h)" class="txt-muted">—</span>
              <input
                v-else
                :value="formatAvgPrice(editForm.avgPrice)"
                @input="onAvgPriceInput($event)"
                type="text"
                inputmode="decimal"
                pattern="[0-9,]*[.]?[0-9]*"
                class="inline-inp"
                placeholder="미입력"
              />
            </td>
            <td class="td-r">—</td>
            <td class="td-r">—</td>
            <td class="td-act">
              <button class="act-btn act-save" @click="$emit('save-edit', h)">저장</button>
              <button class="act-btn act-cancel" @click="$emit('cancel-edit')">취소</button>
            </td>
          </template>
          <template v-else>
            <td class="hname-cell">
              <span class="mkt-flag">{{ isCashHolding(h) ? "💵" : h.market === "KR" ? "🇰🇷" : "🇺🇸" }}</span>
              <div>
                <div class="h-name">
                  {{ h.name }}
                  <span v-if="h.accountLabel" class="acct-badge">{{ h.accountLabel }}</span>
                </div>
                <div class="h-sym">{{ isCashHolding(h) ? "현금성 자산" : h.symbol }}</div>
              </div>
            </td>
            <td class="td-r">{{ isCashHolding(h) ? fmtKRW(Number(h.quantity) || 0) : h.quantity.toLocaleString() }}</td>
            <td class="td-r">{{ fmtCurPrice(h) }}</td>
            <td class="td-r">
              <span v-if="isCashHolding(h)" class="txt-muted">—</span>
              <span v-else :class="['change-badge', changePctCls(h) || 'neutral']">{{ fmtChangePctDisplay(h) }}</span>
            </td>
            <td class="td-r">
              {{ fmtHoldVal(h) }}
              <div
                v-if="h.market === 'US' && holdValKRW(h) > 0 && displayCurrency !== 'krw'"
                class="td-krw-sub"
              >
                ≈ {{ fmtKRW(holdValKRW(h)) }}
              </div>
            </td>
            <td class="td-r">
              <span v-if="isCashHolding(h)" class="txt-muted">—</span>
              <span v-else-if="h.avgPrice">{{ fmtByMkt(h.avgPrice, h.market) }}</span>
              <span v-else class="txt-muted">—</span>
            </td>
            <td class="td-r">
              <span v-if="isCashHolding(h)" class="txt-muted">—</span>
              <span v-else :class="pnlCls(holdPnl(h))">{{ fmtHoldPnl(h) }}</span>
            </td>
            <td class="td-r">
              <span v-if="isCashHolding(h)" class="txt-muted">—</span>
              <span v-else :class="['pnl-pct', pnlCls(holdPnlPct(h))]">{{ fmtHoldPnlPct(h) }}</span>
            </td>
            <td class="td-act">
              <button v-if="!isCashHolding(h)" class="act-btn act-analyze" @click="$emit('analyze', h)">✨ 분석</button>
              <template v-if="!readonly">
                <button class="act-btn act-edit" @click="$emit('start-edit', h)">수정</button>
                <button class="act-btn act-del" @click="$emit('remove', h.id)">삭제</button>
              </template>
            </td>
          </template>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
export default {
  name: 'HoldingsTable',
  props: {
    sortedHoldings: { type: Array, required: true },
    sortKey: { type: String, default: '' },
    sortDir: { type: String, default: 'asc' },
    editingId: { default: null },
    displayCurrency: { type: String, default: 'native' },
    editForm: { type: Object, required: true },
    fmtCurPrice: { type: Function, required: true },
    fmtChangePctDisplay: { type: Function, required: true },
    changePctCls: { type: Function, required: true },
    fmtHoldVal: { type: Function, required: true },
    fmtByMkt: { type: Function, required: true },
    fmtKRW: { type: Function, required: true },
    holdValKRW: { type: Function, required: true },
    holdPnl: { type: Function, required: true },
    fmtHoldPnl: { type: Function, required: true },
    holdPnlPct: { type: Function, required: true },
    fmtHoldPnlPct: { type: Function, required: true },
    pnlCls: { type: Function, required: true },
    readonly: { type: Boolean, default: false },
  },
  emits: ['toggle-sort', 'start-edit', 'save-edit', 'cancel-edit', 'remove', 'toggle-core', 'update:editForm', 'analyze'],
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
    return { isCashHolding, formatAvgPrice, onAvgPriceInput };
  },
};
</script>

<style src="@/assets/css/stock.css" scoped></style>
