<template>
  <div class="pp">
    <div class="pp-head">
      <div class="pp-summary" v-if="holdings.length">
        보유 <strong>{{ holdings.length }}</strong>건
      </div>
      <button class="pp-add-btn" @click="showModal = true">＋ 부동산 등록</button>
    </div>

    <div v-if="loading" class="pp-empty">불러오는 중…</div>

    <div v-else-if="holdings.length === 0" class="pp-empty">
      등록된 부동산이 없습니다. <strong>＋ 부동산 등록</strong>으로 추가하세요.
    </div>

    <div v-else class="pp-grid">
      <div v-for="h in holdings" :key="h.id" class="pp-card">
        <div class="pp-card-top">
          <span :class="['pp-badge', 'pp-badge-' + h.dealType.toLowerCase()]">
            {{ dealLabel(h.dealType) }}
          </span>
          <button class="pp-del" title="삭제" @click="removeHolding(h)">🗑</button>
        </div>

        <div class="pp-name">{{ h.name }}</div>
        <div class="pp-region">
          {{ h.sigungu }}
          <span v-if="h.areaM2"> · {{ h.areaM2 }}㎡ ({{ (h.areaM2 / 3.3058).toFixed(1) }}평)</span>
        </div>

        <div class="pp-rows">
          <div class="pp-line">
            <span class="pp-k">{{ h.dealType === 'SALE' ? '매입가' : '보증금' }}</span>
            <span class="pp-v">
              {{ formatMoney(h.purchasePrice) }}
              <span v-if="h.purchaseDate" class="pp-date">· {{ h.purchaseDate }}</span>
            </span>
          </div>
          <div v-if="h.dealType === 'MONTHLY'" class="pp-line">
            <span class="pp-k">월세</span>
            <span class="pp-v">{{ h.monthlyRent ? h.monthlyRent + '만원' : '-' }}</span>
          </div>

          <!-- 추정 시세 -->
          <div class="pp-line pp-quote">
            <span class="pp-k">추정 시세</span>
            <span class="pp-v">
              <template v-if="quotes[h.id]?.loading">조회중…</template>
              <template v-else-if="quotes[h.id]?.found">
                {{ formatMoney(quotes[h.id].recentPrice) }}
                <span class="pp-quote-meta">({{ quotes[h.id].recentDate }} · {{ quotes[h.id].matchCount }}건)</span>
              </template>
              <template v-else>실거래 없음</template>
            </span>
          </div>

          <!-- 차이 (매매·전세 보증금 기준) -->
          <div
            v-if="quotes[h.id]?.found && h.purchasePrice"
            class="pp-line pp-diff"
          >
            <span class="pp-k">현재 대비</span>
            <span :class="['pp-v', diffClass(h)]">
              {{ formatDiff(quotes[h.id].recentPrice - h.purchasePrice) }}
              ({{ diffRate(h) }})
            </span>
          </div>
        </div>

        <div v-if="h.memo" class="pp-memo">{{ h.memo }}</div>
      </div>
    </div>

    <AddPropertyModal :show="showModal" @close="showModal = false" @saved="onSaved" />
  </div>
</template>

<script>
import { ref, reactive, watch, onMounted } from "vue";
import axios from "@/axios";
import AddPropertyModal from "./AddPropertyModal.vue";

export default {
  name: "PropertyPanel",
  components: { AddPropertyModal },
  props: { active: { type: Boolean, default: false } },
  emits: ["holdings-changed"],
  setup(props, { emit }) {
    const holdings = ref([]);
    const quotes = reactive({});
    const loading = ref(false);
    const showModal = ref(false);

    async function loadHoldings() {
      loading.value = true;
      try {
        const res = await axios.get("/api/property/holdings");
        holdings.value = Array.isArray(res.data) ? res.data : [];
        emit("holdings-changed", holdings.value);
        fetchAllQuotes();
      } catch {
        holdings.value = [];
      } finally {
        loading.value = false;
      }
    }

    function fetchAllQuotes() {
      holdings.value.forEach((h) => fetchQuote(h));
    }

    async function fetchQuote(h) {
      quotes[h.id] = { loading: true, found: false };
      try {
        const res = await axios.get("/api/realestate/quote", {
          params: {
            lawdCd: h.lawdCd,
            dealType: h.dealType,
            aptName: h.name,
            areaM2: h.areaM2 || undefined,
          },
        });
        quotes[h.id] = { loading: false, ...res.data };
      } catch {
        quotes[h.id] = { loading: false, found: false };
      }
    }

    async function removeHolding(h) {
      if (!confirm(`'${h.name}' 보유 부동산을 삭제할까요?`)) return;
      try {
        await axios.delete(`/api/property/holdings/${h.id}`);
        await loadHoldings();
      } catch {
        alert("삭제에 실패했습니다.");
      }
    }

    function onSaved() {
      loadHoldings();
    }

    function dealLabel(t) {
      return { SALE: "매매", JEONSE: "전세", MONTHLY: "월세" }[t] || t;
    }

    function formatMoney(manwon) {
      if (!manwon) return "-";
      const eok = Math.floor(manwon / 10000);
      const rest = manwon % 10000;
      let out = "";
      if (eok > 0) out += `${eok}억`;
      if (rest > 0) out += `${eok > 0 ? " " : ""}${rest.toLocaleString()}만`;
      return out || `${manwon}만`;
    }

    function formatDiff(manwon) {
      const sign = manwon > 0 ? "+" : manwon < 0 ? "-" : "";
      return sign + formatMoney(Math.abs(manwon));
    }

    function diffRate(h) {
      const q = quotes[h.id];
      if (!q?.found || !h.purchasePrice) return "-";
      const rate = ((q.recentPrice - h.purchasePrice) / h.purchasePrice) * 100;
      return (rate > 0 ? "+" : "") + rate.toFixed(1) + "%";
    }

    function diffClass(h) {
      const q = quotes[h.id];
      if (!q?.found) return "";
      const diff = q.recentPrice - h.purchasePrice;
      return diff > 0 ? "pp-up" : diff < 0 ? "pp-down" : "";
    }

    watch(
      () => props.active,
      (isActive) => {
        if (isActive && holdings.value.length === 0) loadHoldings();
      }
    );

    onMounted(() => {
      if (props.active) loadHoldings();
    });

    return {
      holdings, quotes, loading, showModal,
      removeHolding, onSaved,
      dealLabel, formatMoney, formatDiff, diffRate, diffClass,
    };
  },
};
</script>

<style scoped>
.pp-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px; flex-wrap: wrap; gap: 8px;
}
.pp-summary { font-size: 14px; color: var(--text-muted); }
.pp-add-btn {
  padding: 9px 16px; border: none; border-radius: 7px;
  background: #6366f1; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer;
}
.pp-empty { padding: 40px; text-align: center; color: var(--text-muted); font-size: 14px; }

.pp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}
.pp-card {
  border: 1px solid var(--card-border);
  border-radius: 10px;
  background: var(--card-bg);
  padding: 14px;
}
.pp-card-top { display: flex; align-items: center; justify-content: space-between; }
.pp-badge {
  font-size: 11px; font-weight: 700; padding: 2px 9px; border-radius: 10px;
}
.pp-badge-sale { background: #dbeafe; color: #1e40af; }
.pp-badge-jeonse { background: #dcfce7; color: #166534; }
.pp-badge-monthly { background: #fef3c7; color: #92400e; }
.pp-del { border: none; background: none; cursor: pointer; font-size: 14px; opacity: 0.6; }
.pp-del:hover { opacity: 1; }

.pp-name { font-size: 16px; font-weight: 700; color: var(--text-primary); margin-top: 8px; }
.pp-region { font-size: 12px; color: var(--text-muted); margin-bottom: 10px; }

.pp-rows { display: flex; flex-direction: column; gap: 5px; }
.pp-line { display: flex; justify-content: space-between; font-size: 13px; }
.pp-k { color: var(--text-muted); }
.pp-v { font-weight: 600; color: var(--text-primary); }
.pp-quote .pp-v { color: #4f46e5; }
.pp-date { font-size: 11px; font-weight: 400; color: var(--text-muted); }
.pp-quote-meta { font-size: 11px; font-weight: 400; color: var(--text-muted); }
.pp-up { color: #dc2626; }
.pp-down { color: #2563eb; }

.pp-memo {
  margin-top: 10px; padding-top: 10px;
  border-top: 1px dashed var(--card-border);
  font-size: 12px; color: var(--text-muted); white-space: pre-wrap;
}

@media (max-width: 640px) {
  .pp-grid { grid-template-columns: 1fr; }
}
</style>
