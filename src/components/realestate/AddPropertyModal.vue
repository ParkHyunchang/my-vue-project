<template>
  <teleport to="body">
    <div v-if="show" class="rem-overlay" data-lenis-prevent @click.self="close">
      <div class="rem-box">
        <div class="rem-hdr">
          <h3>보유 부동산 등록</h3>
          <button class="rem-close" @click="close">✕</button>
        </div>

        <!-- 거래유형 -->
        <div class="rem-row">
          <label>거래유형</label>
          <div class="rem-toggle">
            <button
              v-for="t in dealTypes"
              :key="t.id"
              type="button"
              :class="['rem-toggle-btn', { active: form.dealType === t.id }]"
              @click="form.dealType = t.id"
            >{{ t.label }}</button>
          </div>
        </div>

        <!-- 지역 -->
        <div class="rem-row rem-region">
          <label>지역</label>
          <input
            v-model="regionQuery"
            type="text"
            placeholder="시/군/구 검색 (예: 강남구)"
            autocomplete="off"
            @input="onRegionInput"
            @focus="showRegionList = true"
          />
          <span v-if="form.lawdCd" class="rem-selected">✓ {{ form.sigungu }}</span>
          <ul v-if="showRegionList && regionResults.length" class="rem-region-list" data-lenis-prevent>
            <li
              v-for="r in regionResults"
              :key="r.code"
              @mousedown.prevent="selectRegion(r)"
            >{{ r.name }}</li>
          </ul>
        </div>

        <!-- 단지명 (지역+거래유형 실거래 단지 자동완성) -->
        <div class="rem-row rem-region">
          <label>단지명</label>
          <input
            v-model="aptQuery"
            type="text"
            :placeholder="form.lawdCd ? '단지명 검색·선택' : '먼저 지역을 선택하세요'"
            :disabled="!form.lawdCd"
            autocomplete="off"
            @input="onAptInput"
            @focus="showAptList = true"
          />
          <span v-if="aptLoading" class="rem-hint">단지 목록 불러오는 중…</span>
          <ul v-if="showAptList && filteredApts.length" class="rem-region-list" data-lenis-prevent>
            <li
              v-for="(a, i) in filteredApts"
              :key="i"
              @mousedown.prevent="selectApt(a)"
            >{{ a }}</li>
          </ul>
        </div>

        <!-- 전용면적: 선택한 단지의 실거래 면적 목록, 없으면 직접 입력 -->
        <div class="rem-row">
          <label>전용면적 (㎡) <span class="rem-opt">(시세 매칭에 사용)</span></label>
          <select v-if="areaList.length" v-model.number="form.areaM2">
            <option :value="null">선택</option>
            <option v-for="a in areaList" :key="a" :value="a">
              {{ a }}㎡ ({{ (a / 3.3058).toFixed(1) }}평)
            </option>
          </select>
          <input v-else v-model.number="form.areaM2" type="number" min="0" step="0.01" placeholder="예: 84.95" />
          <span v-if="form.areaM2 > 0 && !areaList.length" class="rem-hint">≈ {{ (form.areaM2 / 3.3058).toFixed(1) }}평</span>
        </div>

        <!-- 매입가/보증금 -->
        <div class="rem-row">
          <label>{{ form.dealType === 'SALE' ? '매입가' : '보증금' }} (만원)</label>
          <input v-model.number="form.purchasePrice" type="number" min="0" placeholder="만원 단위" />
          <span v-if="form.purchasePrice > 0" class="rem-hint">{{ formatMoney(form.purchasePrice) }}</span>
        </div>

        <!-- 월세 -->
        <div v-if="form.dealType === 'MONTHLY'" class="rem-row">
          <label>월세 (만원)</label>
          <input v-model.number="form.monthlyRent" type="number" min="0" placeholder="만원 단위" />
        </div>

        <!-- 매입(계약) 일자 -->
        <div class="rem-row">
          <label>{{ form.dealType === 'SALE' ? '매입일자' : '계약일자' }} <span class="rem-opt">(선택, 등락률 계산용)</span></label>
          <input v-model="form.purchaseDate" type="date" :max="today" />
        </div>

        <!-- 메모 -->
        <div class="rem-row">
          <label>메모 <span class="rem-opt">(선택)</span></label>
          <textarea v-model="form.memo" rows="2" placeholder="자유 메모"></textarea>
        </div>

        <div v-if="errorMsg" class="rem-error">{{ errorMsg }}</div>

        <div class="rem-actions">
          <button class="rem-cancel" @click="close">취소</button>
          <button class="rem-submit" :disabled="!canSubmit || saving" @click="submit">
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
    const dealTypes = [
      { id: "SALE", label: "매매" },
      { id: "JEONSE", label: "전세" },
      { id: "MONTHLY", label: "월세" },
    ];

    const form = reactive({
      dealType: "SALE",
      name: "",
      lawdCd: "",
      sigungu: "",
      areaM2: null,
      purchasePrice: null,
      monthlyRent: null,
      memo: "",
      purchaseDate: "",
    });

    const regionQuery = ref("");
    const regionResults = ref([]);
    const showRegionList = ref(false);
    const saving = ref(false);
    const errorMsg = ref("");
    let debounceTimer = null;

    // 단지명 자동완성 (지역+거래유형 실거래 기반)
    const aptList = ref([]);
    const aptQuery = ref("");
    const showAptList = ref(false);
    const aptLoading = ref(false);
    const areaList = ref([]);

    const today = new Date().toISOString().slice(0, 10);

    const filteredApts = computed(() => {
      const q = aptQuery.value.trim().toLowerCase();
      if (!q) return aptList.value;
      return aptList.value.filter((a) => a.toLowerCase().includes(q));
    });

    const canSubmit = computed(
      () => form.name.trim() && form.lawdCd && form.dealType
    );

    function onRegionInput() {
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
      // 지역이 바뀌면 단지/면적 초기화 후 단지 목록 로드
      resetAptArea();
      fetchApartments();
    }

    // ── 단지명 / 전용면적 자동완성 ──
    function resetAptArea() {
      form.name = "";
      form.areaM2 = null;
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

    function onAptInput() {
      form.name = aptQuery.value;
      showAptList.value = true;
      areaList.value = []; // 직접 타이핑 중에는 면적 목록 무효화
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

    function formatMoney(manwon) {
      if (!manwon) return "";
      const eok = Math.floor(manwon / 10000);
      const rest = manwon % 10000;
      let out = "";
      if (eok > 0) out += `${eok}억`;
      if (rest > 0) out += `${eok > 0 ? " " : ""}${rest.toLocaleString()}만`;
      return out || `${manwon}만`;
    }

    // 거래유형 변경 시 단지/면적 목록 재로드 (유형별 실거래가 다름)
    watch(() => form.dealType, () => {
      if (form.lawdCd) {
        resetAptArea();
        fetchApartments();
      }
    });

    function resetForm() {
      Object.assign(form, {
        dealType: "SALE", name: "", lawdCd: "", sigungu: "",
        areaM2: null, purchasePrice: null, monthlyRent: null, memo: "", purchaseDate: "",
      });
      regionQuery.value = "";
      regionResults.value = [];
      aptQuery.value = "";
      aptList.value = [];
      areaList.value = [];
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
        await axios.post("/api/property/holdings", {
          dealType: form.dealType,
          name: form.name.trim(),
          lawdCd: form.lawdCd,
          sigungu: form.sigungu,
          areaM2: form.areaM2 || null,
          purchasePrice: form.purchasePrice || null,
          monthlyRent: form.dealType === "MONTHLY" ? form.monthlyRent || null : null,
          memo: form.memo?.trim() || null,
          purchaseDate: form.purchaseDate || null,
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
      dealTypes, form, regionQuery, regionResults, showRegionList,
      saving, errorMsg, canSubmit,
      aptQuery, showAptList, aptLoading, areaList, filteredApts, today,
      onRegionInput, selectRegion, onAptInput, selectApt,
      formatMoney, close, submit,
    };
  },
};
</script>

<style scoped>
.rem-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 10001; /* navbar(#header z-index:10000) 위로 */
  padding: 6vh 16px;
  /* 스크롤을 박스가 아닌 오버레이가 담당 → 박스 안 드롭다운이 잘리지 않음 */
  overflow-y: auto;
}
.rem-box {
  width: 100%;
  max-width: 460px;
  background: var(--card-bg, #fff);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  margin: auto; /* 내용이 짧으면 세로 중앙, 길면 위에서부터 스크롤 */
}
.rem-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.rem-hdr h3 { margin: 0; font-size: 18px; color: var(--text-primary); }
.rem-close {
  border: none; background: none; font-size: 18px; cursor: pointer;
  color: var(--text-muted);
}

.rem-row { margin-bottom: 14px; position: relative; }
.rem-row label {
  display: block; font-size: 13px; font-weight: 600;
  color: var(--text-muted); margin-bottom: 6px;
}
.rem-opt { font-weight: 400; font-size: 11px; opacity: 0.7; }
.rem-row input,
.rem-row textarea,
.rem-row select {
  width: 100%; box-sizing: border-box;
  padding: 9px 11px;
  border: 1px solid var(--input-border);
  border-radius: 7px;
  background: var(--input-bg);
  color: var(--input-text);
  font-size: 14px;
}
.rem-row input::placeholder,
.rem-row textarea::placeholder { color: var(--text-muted); opacity: 0.8; }
.rem-hint { font-size: 12px; color: #6366f1; margin-top: 4px; display: inline-block; }
.rem-selected { font-size: 11px; color: #059669; margin-top: 4px; display: inline-block; }

.rem-toggle { display: flex; gap: 4px; }
.rem-toggle-btn {
  flex: 1; padding: 8px; border: 1px solid var(--input-border);
  background: var(--input-bg); color: var(--text-muted);
  border-radius: 7px; font-size: 14px; font-weight: 600; cursor: pointer;
}
.rem-toggle-btn.active { background: #6366f1; border-color: #6366f1; color: #fff; }

.rem-region-list {
  position: absolute; z-index: 20; left: 0; right: 0;
  margin: 4px 0 0; padding: 4px; list-style: none;
  max-height: 240px; overflow-y: auto;
  overscroll-behavior: contain;        /* 휠 스크롤이 모달로 새지 않게 격리 */
  -webkit-overflow-scrolling: touch;
  background: var(--card-bg, #fff);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}
/* 스크롤 가능함이 보이도록 스크롤바 노출 */
.rem-region-list::-webkit-scrollbar { width: 8px; }
.rem-region-list::-webkit-scrollbar-thumb {
  background: var(--card-border); border-radius: 4px;
}
.rem-region-list li {
  padding: 8px 10px; border-radius: 6px; font-size: 14px;
  cursor: pointer; color: var(--text-primary);
}
.rem-region-list li:hover { background: rgba(99, 102, 241, 0.1); }

.rem-error {
  padding: 8px 12px; border-radius: 7px; margin-bottom: 12px;
  background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3);
  color: #b91c1c; font-size: 13px;
}
.rem-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
.rem-cancel, .rem-submit {
  padding: 9px 18px; border-radius: 7px; font-size: 14px; font-weight: 600; cursor: pointer;
}
.rem-cancel { border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-muted); }
.rem-submit { border: none; background: #6366f1; color: #fff; }
.rem-submit:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
