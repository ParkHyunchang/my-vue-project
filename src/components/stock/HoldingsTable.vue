<template>
  <div class="holdings-table-wrap">
    <table class="holdings-table">
      <thead>
        <tr>
          <th class="sortable-th" @click="$emit('toggle-sort', 'name')">
            종목<span class="sort-ind">{{ sortKey === 'name' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '' }}</span>
          </th>
          <th class="th-r">보유수량</th>
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
              <span class="mkt-flag">{{ h.market === "KR" ? "🇰🇷" : "🇺🇸" }}</span>
              <div>
                <div class="h-name">{{ h.name }}</div>
                <div class="h-sym">{{ h.symbol }}</div>
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
              <span :class="['change-badge', changePctCls(h) || 'neutral']">{{ fmtChangePctDisplay(h) }}</span>
            </td>
            <td class="td-r">{{ fmtHoldVal(h) }}</td>
            <td class="td-r">
              <input
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
              <span class="mkt-flag">{{ h.market === "KR" ? "🇰🇷" : "🇺🇸" }}</span>
              <div>
                <div class="h-name">{{ h.name }}</div>
                <div class="h-sym">{{ h.symbol }}</div>
                <button
                  type="button"
                  :class="['core-toggle', { 'is-core': h.core }]"
                  :title="h.core ? '코어(장기 적립) · 클릭하면 위성으로' : '위성(단타) · 클릭하면 코어로'"
                  @click="$emit('toggle-core', h)"
                >{{ h.core ? '★ 코어' : '☆ 위성' }}</button>
              </div>
            </td>
            <td class="td-r">{{ h.quantity.toLocaleString() }}</td>
            <td class="td-r">{{ fmtCurPrice(h) }}</td>
            <td class="td-r">
              <span :class="['change-badge', changePctCls(h) || 'neutral']">{{ fmtChangePctDisplay(h) }}</span>
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
              <span v-if="h.avgPrice">{{ fmtByMkt(h.avgPrice, h.market) }}</span>
              <span v-else class="txt-muted">—</span>
            </td>
            <td class="td-r"><span :class="pnlCls(holdPnl(h))">{{ fmtHoldPnl(h) }}</span></td>
            <td class="td-r"><span :class="['pnl-pct', pnlCls(holdPnlPct(h))]">{{ fmtHoldPnlPct(h) }}</span></td>
            <td class="td-act">
              <button class="act-btn act-analyze" @click="$emit('analyze', h)">✨ 분석</button>
              <button class="act-btn act-edit" @click="$emit('start-edit', h)">수정</button>
              <button class="act-btn act-del" @click="$emit('remove', h.id)">삭제</button>
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
  },
  emits: ['toggle-sort', 'start-edit', 'save-edit', 'cancel-edit', 'remove', 'toggle-core', 'update:editForm', 'analyze'],
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
    return { formatAvgPrice, onAvgPriceInput };
  },
};
</script>

<style src="@/assets/css/stock.css" scoped></style>
