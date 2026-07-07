<template>
  <div class="pp">
    <div class="pp-head">
      <div
        class="pp-summary"
        v-if="holdings.length"
      >
        보유 <strong>{{ holdings.length }}</strong>건
      </div>
      <button
        class="pp-add-btn"
        @click="showModal = true"
      >
        ＋ 부동산 등록
      </button>
    </div>

    <div
      v-if="loading"
      class="pp-empty"
    >
      불러오는 중…
    </div>

    <div
      v-else-if="holdings.length === 0"
      class="pp-empty"
    >
      등록된 부동산이 없습니다. <strong>＋ 부동산 등록</strong>으로 추가하세요.
    </div>

    <div
      v-else
      class="pp-grid"
    >
      <div
        v-for="h in holdings"
        :key="h.id"
        class="pp-card"
      >
        <div class="pp-card-top">
          <span
            v-if="isLand(h)"
            class="pp-badge pp-badge-land"
          >토지</span>
          <span
            v-else
            :class="['pp-badge', 'pp-badge-' + h.dealType.toLowerCase()]"
          >
            {{ dealLabel(h.dealType) }}
          </span>
          <div class="pp-actions">
            <button
              class="pp-edit"
              title="수정"
              @click="openEdit(h)"
            >
              ✏️
            </button>
            <button
              class="pp-del"
              title="삭제"
              @click="removeHolding(h)"
            >
              🗑
            </button>
          </div>
        </div>

        <div class="pp-name">
          {{ h.name }}
        </div>

        <!-- 토지 -->
        <template v-if="isLand(h)">
          <div class="pp-region">
            {{ h.sigungu }}<span v-if="h.umdName"> {{ h.umdName }}</span><span v-if="h.jibun"> {{ h.jibun }}</span>
          </div>
          <div class="pp-tags">
            <span
              v-if="h.jimok"
              class="pp-tag"
            >지목 {{ h.jimok }}</span>
            <span
              v-if="h.useZone"
              class="pp-tag"
            >{{ h.useZone }}</span>
            <span
              v-if="h.areaM2"
              class="pp-tag"
            >{{ h.areaM2 }}㎡ ({{ (h.areaM2 / 3.3058).toFixed(1) }}평)</span>
          </div>

          <div class="pp-rows">
            <div class="pp-line">
              <span class="pp-k">매입가</span>
              <span class="pp-v">
                {{ formatMoney(h.purchasePrice) }}
                <span
                  v-if="h.purchaseDate"
                  class="pp-date"
                >· {{ h.purchaseDate }}</span>
              </span>
            </div>

            <!-- 추정 시세 (단가 × 면적) -->
            <div class="pp-line pp-quote">
              <span class="pp-k">추정 시세</span>
              <span class="pp-v">
                <template v-if="quotes[h.id]?.loading">조회중…</template>
                <template v-else-if="quotes[h.id]?.found && quotes[h.id].estimate">
                  {{ formatMoney(quotes[h.id].estimate) }}
                  <span class="pp-quote-meta">({{ quotes[h.id].recentDate }} · {{ quotes[h.id].matchCount }}건)</span>
                </template>
                <template v-else>실거래 단가 없음</template>
              </span>
            </div>

            <!-- 단가 (만원/평) -->
            <div
              v-if="quotes[h.id]?.found"
              class="pp-line"
            >
              <span class="pp-k">주변 단가</span>
              <span class="pp-v pp-unit">{{ formatUnit(quotes[h.id].pricePerM2Avg) }}/평</span>
            </div>

            <!-- 개별공시지가 -->
            <div
              v-if="h.officialPricePerM2"
              class="pp-line"
            >
              <span class="pp-k">공시지가</span>
              <span class="pp-v">
                {{ h.officialPricePerM2.toLocaleString() }}원/㎡
                <span
                  v-if="h.officialPriceYear"
                  class="pp-quote-meta"
                >({{ h.officialPriceYear }}년)</span>
              </span>
            </div>

            <!-- 현재 대비 -->
            <div
              v-if="quotes[h.id]?.found && quotes[h.id].estimate && h.purchasePrice"
              class="pp-line pp-diff"
            >
              <span class="pp-k">현재 대비</span>
              <span :class="['pp-v', diffClass(h)]">
                {{ formatDiff(quotes[h.id].estimate - h.purchasePrice) }} ({{ diffRate(h) }})
              </span>
            </div>
          </div>
        </template>

        <!-- 아파트 -->
        <template v-else>
          <div class="pp-region">
            {{ h.sigungu }}
            <span v-if="h.areaM2"> · {{ h.areaM2 }}㎡ ({{ (h.areaM2 / 3.3058).toFixed(1) }}평)</span>
          </div>

          <div class="pp-rows">
            <div class="pp-line">
              <span class="pp-k">{{ h.dealType === 'SALE' ? '매입가' : '보증금' }}</span>
              <span class="pp-v">
                {{ formatMoney(h.purchasePrice) }}
                <span
                  v-if="h.purchaseDate"
                  class="pp-date"
                >· {{ h.purchaseDate }}</span>
              </span>
            </div>
            <div
              v-if="h.dealType === 'MONTHLY'"
              class="pp-line"
            >
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
        </template>

        <div
          v-if="h.memo"
          class="pp-memo"
        >
          {{ h.memo }}
        </div>
      </div>
    </div>

    <AddPropertyModal
      :show="showModal"
      @close="showModal = false"
      @saved="onSaved"
    />
    <EditPropertyModal
      :show="!!editTarget"
      :holding="editTarget"
      @close="editTarget = null"
      @saved="onEditSaved"
    />
  </div>
</template>

<script>
import { ref, reactive, watch, onMounted } from "vue";
import axios from "@/axios";
import AddPropertyModal from "./AddPropertyModal.vue";
import EditPropertyModal from "./EditPropertyModal.vue";

export default {
  name: "PropertyPanel",
  components: { AddPropertyModal, EditPropertyModal },
  props: { active: { type: Boolean, default: false } },
  emits: ["holdings-changed"],
  setup(props, { emit }) {
    const holdings = ref([]);
    const quotes = reactive({});
    const loading = ref(false);
    const showModal = ref(false);
    const editTarget = ref(null);

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
        const res = isLand(h)
          ? await axios.get("/api/realestate/land/quote", {
              params: {
                lawdCd: h.lawdCd,
                jimok: h.jimok || undefined,
                useZone: h.useZone || undefined,
                areaM2: h.areaM2 || undefined,
              },
            })
          : await axios.get("/api/realestate/quote", {
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

    function openEdit(h) {
      editTarget.value = h;
    }
    function onEditSaved() {
      editTarget.value = null;
      loadHoldings();
    }

    function isLand(h) {
      return h.propertyType === "LAND";
    }

    function dealLabel(t) {
      return { SALE: "매매", JEONSE: "전세", MONTHLY: "월세" }[t] || t;
    }

    // 추정 시세의 "현재가" — 아파트=recentPrice, 토지=estimate (모두 만원)
    function currentValue(h) {
      const q = quotes[h.id];
      if (!q?.found) return null;
      return isLand(h) ? q.estimate : q.recentPrice;
    }

    // 단가(원/㎡) → "만원/평" 표기
    function formatUnit(perM2) {
      if (!perM2) return "-";
      const perPyeongManwon = (perM2 * 3.3058) / 10000;
      return `${perPyeongManwon.toLocaleString(undefined, { maximumFractionDigits: 0 })}만`;
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
      const cur = currentValue(h);
      if (cur == null || !h.purchasePrice) return "-";
      const rate = ((cur - h.purchasePrice) / h.purchasePrice) * 100;
      return (rate > 0 ? "+" : "") + rate.toFixed(1) + "%";
    }

    function diffClass(h) {
      const cur = currentValue(h);
      if (cur == null) return "";
      const diff = cur - h.purchasePrice;
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
      holdings, quotes, loading, showModal, editTarget,
      removeHolding, onSaved, openEdit, onEditSaved,
      isLand, dealLabel, formatMoney, formatUnit, formatDiff, diffRate, diffClass,
    };
  },
};
</script>

<style src="@/assets/css/components/realestate/property-panel.css" scoped></style>
