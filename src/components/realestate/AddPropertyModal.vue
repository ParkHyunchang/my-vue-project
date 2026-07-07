<template>
  <teleport to="body">
    <div
      v-if="show"
      class="rem-overlay"
      data-lenis-prevent
      @click.self="close"
    >
      <div class="rem-box">
        <div class="rem-hdr">
          <h3>보유 부동산 등록</h3>
          <button
            class="rem-close"
            @click="close"
          >
            ✕
          </button>
        </div>

        <!-- 유형: 아파트 / 토지 -->
        <div class="rem-row">
          <label>유형</label>
          <div class="rem-toggle">
            <button
              v-for="t in propertyTypes"
              :key="t.id"
              type="button"
              :class="['rem-toggle-btn', { active: form.propertyType === t.id }]"
              @click="setPropertyType(t.id)"
            >
              {{ t.label }}
            </button>
          </div>
        </div>

        <!-- 거래유형 (아파트만) -->
        <div
          v-if="isApt"
          class="rem-row"
        >
          <label>거래유형</label>
          <div class="rem-toggle">
            <button
              v-for="t in dealTypes"
              :key="t.id"
              type="button"
              :class="['rem-toggle-btn', { active: form.dealType === t.id }]"
              @click="form.dealType = t.id"
            >
              {{ t.label }}
            </button>
          </div>
        </div>

        <!-- 지역 (공통) -->
        <div class="rem-row rem-region">
          <label>지역</label>
          <input
            :value="regionQuery"
            type="text"
            placeholder="시/군/구 검색 (예: 강남구)"
            autocomplete="off"
            @input="onRegionInput"
            @focus="showRegionList = true"
          >
          <span
            v-if="form.lawdCd"
            class="rem-selected"
          >✓ {{ form.sigungu }}</span>
          <ul
            v-if="showRegionList && regionResults.length"
            class="rem-region-list"
            data-lenis-prevent
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

        <!-- ───────── 아파트 모드 ───────── -->
        <template v-if="isApt">
          <!-- 단지명 (지역+거래유형 실거래 단지 자동완성) -->
          <div class="rem-row rem-region">
            <label>단지명</label>
            <input
              :value="aptQuery"
              type="text"
              :placeholder="form.lawdCd ? '단지명 검색·선택' : '먼저 지역을 선택하세요'"
              :disabled="!form.lawdCd"
              autocomplete="off"
              @input="onAptInput"
              @focus="showAptList = true"
            >
            <span
              v-if="aptLoading"
              class="rem-hint"
            >단지 목록 불러오는 중…</span>
            <ul
              v-if="showAptList && filteredApts.length"
              class="rem-region-list"
              data-lenis-prevent
            >
              <li
                v-for="(a, i) in filteredApts"
                :key="i"
                @mousedown.prevent="selectApt(a)"
              >
                {{ a }}
              </li>
            </ul>
          </div>

          <!-- 전용면적: 선택한 단지의 실거래 면적 목록, 없으면 직접 입력 -->
          <div class="rem-row">
            <label>전용면적 (㎡) <span class="rem-opt">(시세 매칭에 사용)</span></label>
            <select
              v-if="areaList.length"
              v-model.number="form.areaM2"
            >
              <option :value="null">
                선택
              </option>
              <option
                v-for="a in areaList"
                :key="a"
                :value="a"
              >
                {{ a }}㎡ ({{ (a / 3.3058).toFixed(1) }}평)
              </option>
            </select>
            <input
              v-else
              v-model.number="form.areaM2"
              type="number"
              min="0"
              step="0.01"
              placeholder="예: 84.95"
            >
            <span
              v-if="form.areaM2 > 0 && !areaList.length"
              class="rem-hint"
            >≈ {{ (form.areaM2 / 3.3058).toFixed(1) }}평</span>
          </div>
        </template>

        <!-- ───────── 토지 모드 ───────── -->
        <template v-else>
          <!-- 읍면동 (법정동) + 지번 → 공시지가 조회 -->
          <div class="rem-row rem-region">
            <label>읍면동 <span class="rem-opt">(공시지가 조회용, 선택)</span></label>
            <input
              :value="umdQuery"
              type="text"
              :placeholder="form.lawdCd ? (umdLoading ? '불러오는 중…' : '읍면동·리 검색 (예: 화양면 나진)') : '먼저 지역을 선택하세요'"
              :disabled="!form.lawdCd"
              autocomplete="off"
              @input="onUmdInput"
              @focus="showUmdList = true"
            >
            <span
              v-if="form.bdongCode"
              class="rem-selected"
            >✓ {{ form.umdName }}</span>
            <ul
              v-if="showUmdList && filteredUmds.length"
              class="rem-region-list"
              data-lenis-prevent
            >
              <li
                v-for="u in filteredUmds"
                :key="u.code"
                @mousedown.prevent="selectUmd(u)"
              >
                {{ u.name }}
              </li>
            </ul>
          </div>

          <div class="rem-row">
            <label>지번 <span class="rem-opt">(공시지가 조회용, 선택)</span></label>
            <div class="rem-jibun">
              <label class="rem-check">
                <input
                  type="checkbox"
                  v-model="form.mountain"
                > 산
              </label>
              <input
                v-model.number="form.bun"
                type="number"
                min="0"
                placeholder="본번"
              >
              <span class="rem-dash">-</span>
              <input
                v-model.number="form.ji"
                type="number"
                min="0"
                placeholder="부번"
              >
            </div>
          </div>

          <!-- 공시지가 조회 -->
          <div class="rem-row">
            <label>개별공시지가 <span class="rem-opt">(원/㎡, 선택)</span></label>
            <div class="rem-official">
              <button
                type="button"
                class="rem-official-btn"
                :disabled="!form.bdongCode || officialLoading"
                @click="fetchOfficialPrice"
              >
                {{ officialLoading ? '조회중…' : '공시지가 조회' }}
              </button>
              <span
                v-if="form.officialPricePerM2"
                class="rem-official-val"
              >
                {{ form.officialPricePerM2.toLocaleString() }}원/㎡
                <span
                  v-if="form.officialPriceYear"
                  class="rem-opt"
                >({{ form.officialPriceYear }}년)</span>
              </span>
              <span
                v-else-if="officialMsg"
                class="rem-hint"
              >{{ officialMsg }}</span>
            </div>
          </div>

          <div class="rem-grid2">
            <div class="rem-row">
              <label>지목 <span class="rem-opt">(시세 매칭)</span></label>
              <input
                v-model="form.jimok"
                type="text"
                list="land-jimok-list"
                :disabled="!form.lawdCd"
                :placeholder="form.lawdCd ? '예: 대' : '먼저 지역 선택'"
                autocomplete="off"
              >
              <datalist id="land-jimok-list">
                <option
                  v-for="j in landJimoks"
                  :key="j"
                  :value="j"
                />
              </datalist>
            </div>
            <div class="rem-row">
              <label>용도지역 <span class="rem-opt">(시세 매칭)</span></label>
              <input
                v-model="form.useZone"
                type="text"
                list="land-zone-list"
                :disabled="!form.lawdCd"
                :placeholder="form.lawdCd ? '예: 계획관리' : '먼저 지역 선택'"
                autocomplete="off"
              >
              <datalist id="land-zone-list">
                <option
                  v-for="z in landUseZones"
                  :key="z"
                  :value="z"
                />
              </datalist>
            </div>
          </div>
          <span
            v-if="landFiltersLoading"
            class="rem-hint"
          >지목·용도지역 후보 불러오는 중…</span>

          <div class="rem-row">
            <label>토지면적 (㎡) <span class="rem-opt">(필수)</span></label>
            <input
              v-model.number="form.areaM2"
              type="number"
              min="0"
              step="0.01"
              placeholder="예: 330.5"
            >
            <span
              v-if="form.areaM2 > 0"
              class="rem-hint"
            >≈ {{ (form.areaM2 / 3.3058).toFixed(1) }}평</span>
          </div>

          <div class="rem-row">
            <label>토지명 <span class="rem-opt">(선택, 미입력 시 읍면동·지번으로 자동)</span></label>
            <input
              v-model="form.name"
              type="text"
              :placeholder="autoLandName || '예: 역삼동 텃밭'"
              autocomplete="off"
            >
          </div>
        </template>

        <!-- 매입가/보증금 (공통) -->
        <div class="rem-row">
          <label>{{ priceLabel }} (만원)</label>
          <input
            v-model.number="form.purchasePrice"
            type="number"
            min="0"
            placeholder="만원 단위"
          >
          <span
            v-if="form.purchasePrice > 0"
            class="rem-hint"
          >{{ formatMoney(form.purchasePrice) }}</span>
        </div>

        <!-- 월세 (아파트 월세만) -->
        <div
          v-if="isApt && form.dealType === 'MONTHLY'"
          class="rem-row"
        >
          <label>월세 (만원)</label>
          <input
            v-model.number="form.monthlyRent"
            type="number"
            min="0"
            placeholder="만원 단위"
          >
        </div>

        <!-- 매입(계약) 일자 (공통) -->
        <div class="rem-row">
          <label>{{ dateLabel }} <span class="rem-opt">(선택, 등락률 계산용)</span></label>
          <input
            v-model="form.purchaseDate"
            type="date"
            :max="today"
          >
        </div>

        <!-- 메모 -->
        <div class="rem-row">
          <label>메모 <span class="rem-opt">(선택)</span></label>
          <textarea
            v-model="form.memo"
            rows="2"
            placeholder="자유 메모"
          />
        </div>

        <div
          v-if="errorMsg"
          class="rem-error"
        >
          {{ errorMsg }}
        </div>

        <div class="rem-actions">
          <button
            class="rem-cancel"
            @click="close"
          >
            취소
          </button>
          <button
            class="rem-submit"
            :disabled="!canSubmit || saving"
            @click="submit"
          >
            {{ saving ? '저장중…' : '등록' }}
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script>
import { ref, reactive, computed, watch, onBeforeUnmount } from "vue";
import axios from "@/axios";
import { lenis } from "@/assets/js/smooth.js";

export default {
  name: "AddPropertyModal",
  props: { show: { type: Boolean, required: true } },
  emits: ["close", "saved"],
  setup(props, { emit }) {
    const propertyTypes = [
      { id: "APT", label: "아파트" },
      { id: "LAND", label: "토지" },
    ];
    const dealTypes = [
      { id: "SALE", label: "매매" },
      { id: "JEONSE", label: "전세" },
      { id: "MONTHLY", label: "월세" },
    ];

    const form = reactive({
      propertyType: "APT",
      dealType: "SALE",
      name: "",
      lawdCd: "",
      sigungu: "",
      areaM2: null,
      purchasePrice: null,
      monthlyRent: null,
      memo: "",
      purchaseDate: "",
      // 토지 전용
      jimok: "",
      useZone: "",
      umdName: "",
      jibun: "",
      bdongCode: "",
      mountain: false,
      bun: null,
      ji: null,
      officialPricePerM2: null,
      officialPriceYear: null,
    });

    const regionQuery = ref("");
    const regionResults = ref([]);
    const showRegionList = ref(false);
    const saving = ref(false);
    const errorMsg = ref("");
    let debounceTimer = null;

    // 아파트 단지명 자동완성
    const aptList = ref([]);
    const aptQuery = ref("");
    const showAptList = ref(false);
    const aptLoading = ref(false);
    const areaList = ref([]);

    // 토지 지목·용도지역 후보
    const landJimoks = ref([]);
    const landUseZones = ref([]);
    const landFiltersLoading = ref(false);

    // 토지 읍면동·공시지가
    const umdList = ref([]);
    const umdQuery = ref("");
    const showUmdList = ref(false);
    const umdLoading = ref(false);
    const officialLoading = ref(false);
    const officialMsg = ref("");

    const filteredUmds = computed(() => {
      const q = umdQuery.value.trim().replace(/\s+/g, "");
      const list = q
        ? umdList.value.filter((u) => u.name.replace(/\s+/g, "").includes(q))
        : umdList.value;
      return list.slice(0, 80); // DOM 경량화 (검색으로 좁히도록 유도)
    });

    const today = new Date().toISOString().slice(0, 10);

    const isApt = computed(() => form.propertyType === "APT");

    // 지번 표시 문자열: "산 123-4" / "123" / "123-4"
    const jibunText = computed(() => {
      if (!form.bun) return form.jibun || "";
      const base = `${form.mountain ? "산 " : ""}${form.bun}`;
      return form.ji ? `${base}-${form.ji}` : base;
    });
    const priceLabel = computed(() =>
      isApt.value ? (form.dealType === "SALE" ? "매입가" : "보증금") : "매입가"
    );
    const dateLabel = computed(() =>
      isApt.value && form.dealType !== "SALE" ? "계약일자" : "매입일자"
    );
    const autoLandName = computed(() =>
      [form.umdName, jibunText.value].filter(Boolean).join(" ").trim()
    );

    const filteredApts = computed(() => {
      const q = aptQuery.value.trim().toLowerCase();
      if (!q) return aptList.value;
      return aptList.value.filter((a) => a.toLowerCase().includes(q));
    });

    const canSubmit = computed(() => {
      if (!form.lawdCd) return false;
      if (isApt.value) return !!form.name.trim() && !!form.dealType;
      // 토지: 면적 필수, 이름은 자동 생성 가능
      return form.areaM2 > 0;
    });

    function setPropertyType(id) {
      if (form.propertyType === id) return;
      form.propertyType = id;
      // 유형 전환 시 유형별 입력 초기화 (지역은 유지)
      form.name = "";
      form.areaM2 = null;
      form.jimok = "";
      form.useZone = "";
      form.umdName = "";
      form.jibun = "";
      form.bdongCode = "";
      form.mountain = false;
      form.bun = null;
      form.ji = null;
      form.officialPricePerM2 = null;
      form.officialPriceYear = null;
      officialMsg.value = "";
      resetAptArea();
      if (form.lawdCd) {
        if (id === "APT") fetchApartments();
        else { fetchLandFilters(); fetchUmds(); }
      }
    }

    function onRegionInput(e) {
      // v-model 대신 :value+수동 갱신: 한글 IME 조합 중에도 즉시 반영
      regionQuery.value = e.target.value;
      form.lawdCd = "";
      form.sigungu = "";
      showRegionList.value = true;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fetchRegions, 250);
    }
    async function fetchRegions() {
      const q = regionQuery.value.trim();
      if (!q) { regionResults.value = []; return; }
      try {
        const res = await axios.get("/api/realestate/regions", { params: { q } });
        regionResults.value = res.data || [];
      } catch { regionResults.value = []; }
    }
    function selectRegion(r) {
      form.lawdCd = r.code;
      form.sigungu = r.sigungu;
      regionQuery.value = r.name;
      showRegionList.value = false;
      regionResults.value = [];
      if (isApt.value) { resetAptArea(); fetchApartments(); }
      else { fetchLandFilters(); fetchUmds(); }
    }

    // ── 아파트: 단지명 / 전용면적 ──
    function resetAptArea() {
      aptQuery.value = "";
      aptList.value = [];
      areaList.value = [];
    }
    async function fetchApartments() {
      if (!form.lawdCd) return;
      aptLoading.value = true;
      try {
        const res = await axios.get("/api/realestate/apartments", {
          params: { lawdCd: form.lawdCd, dealType: form.dealType },
        });
        aptList.value = Array.isArray(res.data) ? res.data : [];
      } catch {
        aptList.value = [];
      } finally {
        aptLoading.value = false;
      }
    }
    function onAptInput(e) {
      aptQuery.value = e.target.value;
      form.name = aptQuery.value;
      showAptList.value = true;
      areaList.value = [];
    }
    async function selectApt(name) {
      form.name = name;
      aptQuery.value = name;
      showAptList.value = false;
      form.areaM2 = null;
      try {
        const res = await axios.get("/api/realestate/areas", {
          params: { lawdCd: form.lawdCd, dealType: form.dealType, aptName: name },
        });
        areaList.value = Array.isArray(res.data) ? res.data : [];
      } catch {
        areaList.value = [];
      }
    }

    // ── 토지: 지목 / 용도지역 후보 ──
    async function fetchLandFilters() {
      if (!form.lawdCd) return;
      landFiltersLoading.value = true;
      try {
        const res = await axios.get("/api/realestate/land/filters", {
          params: { lawdCd: form.lawdCd },
        });
        landJimoks.value = Array.isArray(res.data?.jimoks) ? res.data.jimoks : [];
        landUseZones.value = Array.isArray(res.data?.useZones) ? res.data.useZones : [];
      } catch {
        landJimoks.value = [];
        landUseZones.value = [];
      } finally {
        landFiltersLoading.value = false;
      }
    }

    // ── 토지: 읍면동(법정동코드) / 공시지가 ──
    async function fetchUmds() {
      if (!form.lawdCd) return;
      umdLoading.value = true;
      form.bdongCode = "";
      form.umdName = "";
      umdQuery.value = "";
      try {
        const res = await axios.get("/api/realestate/land/umds", {
          params: { lawdCd: form.lawdCd },
        });
        umdList.value = Array.isArray(res.data) ? res.data : [];
      } catch {
        umdList.value = [];
      } finally {
        umdLoading.value = false;
      }
    }
    function onUmdInput(e) {
      umdQuery.value = e.target.value;
      showUmdList.value = true;
      // 타이핑 중에는 선택·공시지가 무효화 (재선택 유도)
      form.bdongCode = "";
      form.umdName = "";
      clearOfficial();
    }
    function selectUmd(u) {
      form.bdongCode = u.code;
      form.umdName = u.name;
      umdQuery.value = u.name;
      showUmdList.value = false;
      clearOfficial();
    }
    function clearOfficial() {
      form.officialPricePerM2 = null;
      form.officialPriceYear = null;
      officialMsg.value = "";
    }
    async function fetchOfficialPrice() {
      if (!form.bdongCode) return;
      officialLoading.value = true;
      officialMsg.value = "";
      form.officialPricePerM2 = null;
      form.officialPriceYear = null;
      try {
        const res = await axios.get("/api/realestate/land/official-price", {
          params: {
            bdongCode: form.bdongCode,
            mountain: !!form.mountain,
            bun: form.bun || 0,
            ji: form.ji || 0,
          },
        });
        if (res.data?.found) {
          form.officialPricePerM2 = res.data.pricePerM2;
          form.officialPriceYear = res.data.year;
        } else {
          officialMsg.value = res.data?.message || "공시지가를 찾지 못했습니다.";
        }
      } catch (e) {
        officialMsg.value =
          e.response?.data?.error || "공시지가 조회에 실패했습니다.";
      } finally {
        officialLoading.value = false;
      }
    }

    function formatMoney(manwon) {
      if (!manwon) return "";
      const eok = Math.floor(manwon / 10000);
      const rest = manwon % 10000;
      let out = "";
      if (eok > 0) out += `${eok}억`;
      if (rest > 0) out += `${eok > 0 ? " " : ""}${rest.toLocaleString()}만`;
      return out || `${manwon}만`;
    }

    // 아파트 거래유형 변경 시 단지/면적 목록 재로드
    watch(() => form.dealType, () => {
      if (isApt.value && form.lawdCd) {
        resetAptArea();
        fetchApartments();
      }
    });

    function resetForm() {
      Object.assign(form, {
        propertyType: "APT", dealType: "SALE", name: "", lawdCd: "", sigungu: "",
        areaM2: null, purchasePrice: null, monthlyRent: null, memo: "", purchaseDate: "",
        jimok: "", useZone: "", umdName: "", jibun: "",
        bdongCode: "", mountain: false, bun: null, ji: null,
        officialPricePerM2: null, officialPriceYear: null,
      });
      regionQuery.value = "";
      regionResults.value = [];
      aptQuery.value = "";
      aptList.value = [];
      areaList.value = [];
      landJimoks.value = [];
      landUseZones.value = [];
      umdList.value = [];
      umdQuery.value = "";
      showUmdList.value = false;
      officialMsg.value = "";
      errorMsg.value = "";
    }

    function close() {
      emit("close");
    }

    async function submit() {
      if (!canSubmit.value) return;
      saving.value = true;
      errorMsg.value = "";
      try {
        const land = !isApt.value;
        const name = land
          ? (form.name.trim() || autoLandName.value || `${form.sigungu} 토지`)
          : form.name.trim();
        await axios.post("/api/property/holdings", {
          propertyType: form.propertyType,
          dealType: land ? "SALE" : form.dealType,
          name,
          lawdCd: form.lawdCd,
          sigungu: form.sigungu,
          areaM2: form.areaM2 || null,
          purchasePrice: form.purchasePrice || null,
          monthlyRent: !land && form.dealType === "MONTHLY" ? form.monthlyRent || null : null,
          memo: form.memo?.trim() || null,
          purchaseDate: form.purchaseDate || null,
          jimok: land ? form.jimok?.trim() || null : null,
          useZone: land ? form.useZone?.trim() || null : null,
          umdName: land ? form.umdName?.trim() || null : null,
          jibun: land ? jibunText.value || null : null,
          bdongCode: land ? form.bdongCode || null : null,
          officialPricePerM2: land ? form.officialPricePerM2 || null : null,
          officialPriceYear: land ? form.officialPriceYear || null : null,
        });
        resetForm();
        emit("saved");
        emit("close");
      } catch (e) {
        errorMsg.value =
          e.response?.data?.message || e.response?.data || "등록에 실패했습니다.";
      } finally {
        saving.value = false;
      }
    }

    // 배경 스크롤 잠금 (Lenis 제어)
    const setBgScrollLock = (locked) => {
      const v = locked ? "hidden" : "";
      document.body.style.overflow = v;
      document.documentElement.style.overflow = v;
      if (lenis) locked ? lenis.stop() : lenis.start();
    };
    watch(() => props.show, (s) => { setBgScrollLock(s); if (s) resetForm(); }, { immediate: true });
    onBeforeUnmount(() => setBgScrollLock(false));

    return {
      propertyTypes, dealTypes, form, regionQuery, regionResults, showRegionList,
      saving, errorMsg, canSubmit,
      isApt, priceLabel, dateLabel, autoLandName,
      aptQuery, showAptList, aptLoading, areaList, filteredApts, today,
      landJimoks, landUseZones, landFiltersLoading,
      umdQuery, showUmdList, umdLoading, filteredUmds, officialLoading, officialMsg,
      setPropertyType, onRegionInput, selectRegion, onAptInput, selectApt,
      onUmdInput, selectUmd, fetchOfficialPrice,
      formatMoney, close, submit,
    };
  },
};
</script>

<style src="@/assets/css/components/realestate/add-property-modal.css" scoped></style>
