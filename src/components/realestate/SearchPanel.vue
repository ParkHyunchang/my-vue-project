<template>
  <div class="re-search">
    <!-- 검색 조건 -->
    <div class="re-controls">
      <!-- 유형: 아파트 / 토지 -->
      <div class="re-dealtype">
        <label class="re-label">유형</label>
        <div class="re-toggle">
          <button
            v-for="t in propertyTypes"
            :key="t.id"
            :class="['re-toggle-btn', { active: propertyType === t.id }]"
            @click="setPropertyType(t.id)"
          >
            {{ t.label }}
          </button>
        </div>
      </div>

      <!-- 지역 선택 -->
      <div class="re-region">
        <label class="re-label">지역</label>
        <div class="re-region-input">
          <input
            :value="regionQuery"
            type="text"
            class="re-input"
            placeholder="시/군/구 검색 (예: 강남구, 분당구)"
            @input="onRegionInput"
            @focus="showRegionList = true"
          >
          <span
            v-if="selectedRegion"
            class="re-selected"
          >✓ {{ selectedRegion.name }}</span>
          <ul
            v-if="showRegionList && regionResults.length"
            class="re-region-list"
          >
            <li
              v-for="r in regionResults"
              :key="r.code"
              @mousedown.prevent="selectRegion(r)"
            >
              {{ r.name }}
            </li>
          </ul>
        </div>
      </div>

      <!-- 거래유형 (아파트만) -->
      <div
        v-if="isApt"
        class="re-dealtype"
      >
        <label class="re-label">거래유형</label>
        <div class="re-toggle">
          <button
            v-for="t in dealTypes"
            :key="t.id"
            :class="['re-toggle-btn', { active: dealType === t.id }]"
            @click="dealType = t.id"
          >
            {{ t.label }}
          </button>
        </div>
      </div>

      <!-- 조회 기간 -->
      <div class="re-months">
        <label class="re-label">기간</label>
        <select
          v-model.number="months"
          class="re-input re-select"
        >
          <option :value="1">
            최근 1개월
          </option>
          <option :value="3">
            최근 3개월
          </option>
          <option :value="6">
            최근 6개월
          </option>
          <option :value="12">
            최근 12개월
          </option>
        </select>
      </div>

      <button
        class="re-search-btn"
        :disabled="!selectedRegion || loading"
        @click="doSearch"
      >
        {{ loading ? '조회중…' : '🔍 검색' }}
      </button>
    </div>

    <!-- 알림 -->
    <div
      v-if="errorMsg"
      class="re-alert"
    >
      {{ errorMsg }}
    </div>

    <!-- ───────── 아파트 결과 ───────── -->
    <template v-if="isApt">
      <div
        v-if="searched && !loading"
        class="re-result-meta"
      >
        <span>
          <strong>{{ selectedRegion?.name }}</strong> · {{ currentDealLabel }} ·
          총 <strong>{{ deals.length }}</strong>건
        </span>
        <button
          v-if="deals.length"
          class="re-ai-btn"
          @click="showAnalysis = true"
        >
          🤖 AI 시황 분석
        </button>
      </div>

      <div
        v-if="loading"
        class="re-empty"
      >
        실거래가를 불러오는 중입니다…
      </div>
      <div
        v-else-if="searched && deals.length === 0 && !errorMsg"
        class="re-empty"
      >
        해당 조건의 실거래 내역이 없습니다.
      </div>

      <div
        v-else-if="deals.length"
        class="re-table-wrap"
      >
        <table class="re-table">
          <thead>
            <tr>
              <th>단지명</th>
              <th>법정동</th>
              <th>전용면적</th>
              <th>층</th>
              <th>{{ dealType === 'SALE' ? '거래금액' : '보증금' }}</th>
              <th v-if="dealType === 'MONTHLY'">
                월세
              </th>
              <th>거래일</th>
              <th>건축년도</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(d, i) in deals"
              :key="i"
            >
              <td class="re-apt">
                {{ d.aptName }}
              </td>
              <td>{{ d.dong }}</td>
              <td>{{ formatArea(d.areaM2) }}</td>
              <td>{{ d.floor }}층</td>
              <td class="re-money">
                {{ formatMoney(dealType === 'SALE' ? d.dealAmount : d.deposit) }}
              </td>
              <td
                v-if="dealType === 'MONTHLY'"
                class="re-money"
              >
                {{ d.monthlyRent }}만원
              </td>
              <td>{{ d.dealDate }}</td>
              <td>{{ d.buildYear || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- ───────── 토지 결과 ───────── -->
    <template v-else>
      <div
        v-if="searched && !loading && landDeals.length"
        class="re-land-filters"
      >
        <input
          :value="dongFilter"
          type="text"
          class="re-input re-dong-filter"
          placeholder="법정동 검색 (예: 돌산읍, 군내리)"
          @input="dongFilter = $event.target.value"
        >
        <select
          v-model="jimokFilter"
          class="re-input re-select"
        >
          <option value="">
            지목 전체
          </option>
          <option
            v-for="j in landJimoks"
            :key="j"
            :value="j"
          >
            {{ j }}
          </option>
        </select>
        <select
          v-model="zoneFilter"
          class="re-input re-select"
        >
          <option value="">
            용도지역 전체
          </option>
          <option
            v-for="z in landUseZones"
            :key="z"
            :value="z"
          >
            {{ z }}
          </option>
        </select>
      </div>

      <div
        v-if="searched && !loading"
        class="re-result-meta"
      >
        <span>
          <strong>{{ selectedRegion?.name }}</strong> · 토지 ·
          총 <strong>{{ filteredLandDeals.length }}</strong>건
          <span v-if="filteredLandDeals.length !== landDeals.length">/ {{ landDeals.length }}건</span>
        </span>
        <button
          v-if="landDeals.length"
          class="re-ai-btn"
          @click="showLandAnalysis = true"
        >
          🤖 AI 시황 분석
        </button>
      </div>

      <div
        v-if="loading"
        class="re-empty"
      >
        토지 실거래가를 불러오는 중입니다…
      </div>
      <div
        v-else-if="searched && landDeals.length === 0 && !errorMsg"
        class="re-empty"
      >
        해당 지역의 토지 실거래 내역이 없습니다.
      </div>

      <div
        v-else-if="filteredLandDeals.length"
        class="re-table-wrap"
      >
        <table class="re-table">
          <thead>
            <tr>
              <th>법정동</th>
              <th>지목</th>
              <th>용도지역</th>
              <th>면적</th>
              <th>거래금액</th>
              <th>단가(평)</th>
              <th>거래일</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(d, i) in filteredLandDeals"
              :key="i"
            >
              <td>{{ d.dong }}</td>
              <td class="re-apt">
                {{ d.jimok || '-' }}
              </td>
              <td>{{ d.useZone || '-' }}</td>
              <td>{{ formatArea(d.areaM2) }}</td>
              <td class="re-money">
                {{ formatMoney(d.dealAmount) }}
              </td>
              <td class="re-money">
                {{ formatUnit(d.pricePerM2) }}
              </td>
              <td>{{ d.dealDate }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <AnalysisModal
      v-if="isApt"
      :show="showAnalysis"
      :lawd-cd="selectedRegion?.code || ''"
      :deal-type="dealType"
      :region-name="selectedRegion?.name || ''"
      @close="showAnalysis = false"
    />
    <LandAnalysisModal
      v-else
      :show="showLandAnalysis"
      :lawd-cd="selectedRegion?.code || ''"
      :region-name="selectedRegion?.name || ''"
      @close="showLandAnalysis = false"
    />
  </div>
</template>

<script>
import { ref, computed } from "vue";
import axios from "@/axios";
import AnalysisModal from "./AnalysisModal.vue";
import LandAnalysisModal from "./LandAnalysisModal.vue";

export default {
  name: "RealEstateSearchPanel",
  components: { AnalysisModal, LandAnalysisModal },
  setup() {
    const propertyTypes = [
      { id: "APT", label: "아파트" },
      { id: "LAND", label: "토지" },
    ];
    const dealTypes = [
      { id: "SALE", label: "매매" },
      { id: "JEONSE", label: "전세" },
      { id: "MONTHLY", label: "월세" },
    ];

    const propertyType = ref("APT");
    const regionQuery = ref("");
    const regionResults = ref([]);
    const showRegionList = ref(false);
    const selectedRegion = ref(null);

    const dealType = ref("SALE");
    const months = ref(3);

    const deals = ref([]);        // 아파트
    const landDeals = ref([]);    // 토지
    const dongFilter = ref("");
    const jimokFilter = ref("");
    const zoneFilter = ref("");

    const loading = ref(false);
    const searched = ref(false);
    const errorMsg = ref("");
    const showAnalysis = ref(false);
    const showLandAnalysis = ref(false);

    let debounceTimer = null;

    const isApt = computed(() => propertyType.value === "APT");
    const currentDealLabel = computed(
      () => dealTypes.find((t) => t.id === dealType.value)?.label || ""
    );

    const landJimoks = computed(() =>
      [...new Set(landDeals.value.map((d) => d.jimok).filter(Boolean))].sort()
    );
    const landUseZones = computed(() =>
      [...new Set(landDeals.value.map((d) => d.useZone).filter(Boolean))].sort()
    );
    const filteredLandDeals = computed(() => {
      const dq = dongFilter.value.trim().replace(/\s+/g, "");
      return landDeals.value.filter(
        (d) =>
          (!jimokFilter.value || d.jimok === jimokFilter.value) &&
          (!zoneFilter.value || d.useZone === zoneFilter.value) &&
          (!dq || (d.dong || "").replace(/\s+/g, "").includes(dq))
      );
    });

    function setPropertyType(id) {
      if (propertyType.value === id) return;
      propertyType.value = id;
      // 유형 전환 시 결과 초기화
      deals.value = [];
      landDeals.value = [];
      dongFilter.value = "";
      jimokFilter.value = "";
      zoneFilter.value = "";
      searched.value = false;
      errorMsg.value = "";
    }

    function onRegionInput(e) {
      // v-model 대신 :value+수동 갱신: 한글 IME 조합 중에도 즉시 반영
      regionQuery.value = e.target.value;
      selectedRegion.value = null;
      showRegionList.value = true;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fetchRegions, 250);
    }

    async function fetchRegions() {
      const q = regionQuery.value.trim();
      if (!q) {
        regionResults.value = [];
        return;
      }
      try {
        const res = await axios.get("/api/realestate/regions", { params: { q } });
        regionResults.value = res.data || [];
      } catch {
        regionResults.value = [];
      }
    }

    function selectRegion(r) {
      selectedRegion.value = r;
      regionQuery.value = r.name;
      showRegionList.value = false;
      regionResults.value = [];
    }

    async function doSearch() {
      if (!selectedRegion.value) return;
      loading.value = true;
      errorMsg.value = "";
      searched.value = true;
      dongFilter.value = "";
      jimokFilter.value = "";
      zoneFilter.value = "";
      try {
        if (isApt.value) {
          const res = await axios.get("/api/realestate/search", {
            params: { lawdCd: selectedRegion.value.code, dealType: dealType.value, months: months.value },
          });
          deals.value = Array.isArray(res.data) ? res.data : [];
        } else {
          const res = await axios.get("/api/realestate/land/search", {
            params: { lawdCd: selectedRegion.value.code, months: months.value },
          });
          landDeals.value = Array.isArray(res.data) ? res.data : [];
        }
      } catch (e) {
        deals.value = [];
        landDeals.value = [];
        errorMsg.value =
          e.response?.data?.error ||
          "실거래가 조회 중 오류가 발생했습니다. 잠시 후 다시 시도하세요.";
      } finally {
        loading.value = false;
      }
    }

    // ── 포맷터 ──
    function formatArea(m2) {
      if (!m2) return "-";
      const pyeong = (m2 / 3.3058).toFixed(1);
      return `${m2}㎡ (${pyeong}평)`;
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

    // 단가(원/㎡) → "만원/평"
    function formatUnit(perM2) {
      if (!perM2) return "-";
      const perPyeong = (perM2 * 3.3058) / 10000;
      return `${perPyeong.toLocaleString(undefined, { maximumFractionDigits: 0 })}만`;
    }

    return {
      propertyTypes,
      dealTypes,
      propertyType,
      regionQuery,
      regionResults,
      showRegionList,
      selectedRegion,
      dealType,
      months,
      deals,
      landDeals,
      dongFilter,
      jimokFilter,
      zoneFilter,
      loading,
      searched,
      errorMsg,
      showAnalysis,
      showLandAnalysis,
      isApt,
      currentDealLabel,
      landJimoks,
      landUseZones,
      filteredLandDeals,
      setPropertyType,
      onRegionInput,
      selectRegion,
      doSearch,
      formatArea,
      formatMoney,
      formatUnit,
    };
  },
};
</script>

<style src="@/assets/css/components/realestate/search-panel.css" scoped></style>
