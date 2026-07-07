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
          <h3>보유 부동산 수정</h3>
          <button
            class="rem-close"
            @click="close"
          >
            ✕
          </button>
        </div>

        <!-- 고정(식별) 정보 — 수정 불가 -->
        <div class="rem-fixed">
          <div class="rem-fixed-row">
            <span class="rem-fixed-badge">{{ isLand ? '토지' : dealLabel }}</span>
            <span class="rem-fixed-name">{{ h?.name }}</span>
          </div>
          <div class="rem-fixed-sub">
            {{ h?.sigungu }}<span v-if="h?.umdName"> {{ h.umdName }}</span><span v-if="h?.jibun"> {{ h.jibun }}</span>
            <span v-if="h?.areaM2"> · {{ h.areaM2 }}㎡ ({{ (h.areaM2 / 3.3058).toFixed(1) }}평)</span>
          </div>
          <div class="rem-fixed-hint">
            소재·지번·명칭·면적은 변경할 수 없어요 (바꾸려면 삭제 후 재등록).
          </div>
        </div>

        <!-- 매입가 / 보증금 -->
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
          v-if="!isLand && h?.dealType === 'MONTHLY'"
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

        <!-- 토지 전용: 지목 / 용도지역 / 공시지가 -->
        <template v-if="isLand">
          <div class="rem-grid2">
            <div class="rem-row">
              <label>지목</label>
              <input
                v-model="form.jimok"
                type="text"
                list="edit-land-jimok"
                placeholder="예: 대"
                autocomplete="off"
              >
              <datalist id="edit-land-jimok">
                <option
                  v-for="j in landJimoks"
                  :key="j"
                  :value="j"
                />
              </datalist>
            </div>
            <div class="rem-row">
              <label>용도지역</label>
              <input
                v-model="form.useZone"
                type="text"
                list="edit-land-zone"
                placeholder="예: 계획관리"
                autocomplete="off"
              >
              <datalist id="edit-land-zone">
                <option
                  v-for="z in landUseZones"
                  :key="z"
                  :value="z"
                />
              </datalist>
            </div>
          </div>

          <div class="rem-row">
            <label>개별공시지가 <span class="rem-opt">(원/㎡)</span></label>
            <div class="rem-official">
              <input
                v-model.number="form.officialPricePerM2"
                type="number"
                min="0"
                placeholder="원/㎡"
                class="rem-official-input"
              >
              <input
                v-model.number="form.officialPriceYear"
                type="number"
                min="2000"
                :max="thisYear"
                placeholder="연도"
                class="rem-official-year"
              >
              <button
                type="button"
                class="rem-official-btn"
                :disabled="!h?.bdongCode || officialLoading"
                @click="refetchOfficial"
              >
                {{ officialLoading ? '조회중…' : '최신 재조회' }}
              </button>
            </div>
            <span
              v-if="officialMsg"
              class="rem-hint"
            >{{ officialMsg }}</span>
            <span
              v-else-if="!h?.bdongCode"
              class="rem-hint"
            >읍면동·지번 정보가 없어 자동 조회 불가 (직접 입력)</span>
          </div>
        </template>

        <!-- 매입(계약) 일자 -->
        <div class="rem-row">
          <label>{{ dateLabel }} <span class="rem-opt">(선택)</span></label>
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
            :disabled="saving"
            @click="submit"
          >
            {{ saving ? '저장중…' : '수정' }}
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
  name: "EditPropertyModal",
  props: {
    show: { type: Boolean, required: true },
    holding: { type: Object, default: null },
  },
  emits: ["close", "saved"],
  setup(props, { emit }) {
    const form = reactive({
      purchasePrice: null,
      monthlyRent: null,
      memo: "",
      purchaseDate: "",
      jimok: "",
      useZone: "",
      officialPricePerM2: null,
      officialPriceYear: null,
    });

    const saving = ref(false);
    const errorMsg = ref("");
    const landJimoks = ref([]);
    const landUseZones = ref([]);
    const officialLoading = ref(false);
    const officialMsg = ref("");

    const h = computed(() => props.holding);
    const isLand = computed(() => props.holding?.propertyType === "LAND");
    const today = new Date().toISOString().slice(0, 10);
    const thisYear = new Date().getFullYear();

    const dealLabel = computed(
      () => ({ SALE: "매매", JEONSE: "전세", MONTHLY: "월세" }[props.holding?.dealType] || "")
    );
    const priceLabel = computed(() =>
      isLand.value ? "매입가" : props.holding?.dealType === "SALE" ? "매입가" : "보증금"
    );
    const dateLabel = computed(() =>
      !isLand.value && props.holding?.dealType !== "SALE" ? "계약일자" : "매입일자"
    );

    function formatMoney(manwon) {
      if (!manwon) return "";
      const eok = Math.floor(manwon / 10000);
      const rest = manwon % 10000;
      let out = "";
      if (eok > 0) out += `${eok}억`;
      if (rest > 0) out += `${eok > 0 ? " " : ""}${rest.toLocaleString()}만`;
      return out || `${manwon}만`;
    }

    // 저장된 지번 문자열("산 588-4" / "588" / "588-4") → {mountain, bun, ji}
    function parseJibun(jibun) {
      if (!jibun) return { mountain: false, bun: 0, ji: 0 };
      const mountain = jibun.includes("산");
      const nums = jibun
        .replace("산", "")
        .trim()
        .split("-")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n));
      return { mountain, bun: nums[0] || 0, ji: nums[1] || 0 };
    }

    async function fetchLandFilters() {
      if (!props.holding?.lawdCd) return;
      try {
        const res = await axios.get("/api/realestate/land/filters", {
          params: { lawdCd: props.holding.lawdCd },
        });
        landJimoks.value = Array.isArray(res.data?.jimoks) ? res.data.jimoks : [];
        landUseZones.value = Array.isArray(res.data?.useZones) ? res.data.useZones : [];
      } catch {
        landJimoks.value = [];
        landUseZones.value = [];
      }
    }

    async function refetchOfficial() {
      if (!props.holding?.bdongCode) return;
      officialLoading.value = true;
      officialMsg.value = "";
      const { mountain, bun, ji } = parseJibun(props.holding.jibun);
      try {
        const res = await axios.get("/api/realestate/land/official-price", {
          params: { bdongCode: props.holding.bdongCode, mountain, bun, ji },
        });
        if (res.data?.found) {
          form.officialPricePerM2 = res.data.pricePerM2;
          form.officialPriceYear = res.data.year;
          officialMsg.value = "";
        } else {
          officialMsg.value = res.data?.message || "공시지가를 찾지 못했습니다.";
        }
      } catch (e) {
        officialMsg.value = e.response?.data?.error || "공시지가 조회에 실패했습니다.";
      } finally {
        officialLoading.value = false;
      }
    }

    function fillForm() {
      const src = props.holding || {};
      form.purchasePrice = src.purchasePrice ?? null;
      form.monthlyRent = src.monthlyRent ?? null;
      form.memo = src.memo || "";
      form.purchaseDate = src.purchaseDate || "";
      form.jimok = src.jimok || "";
      form.useZone = src.useZone || "";
      form.officialPricePerM2 = src.officialPricePerM2 ?? null;
      form.officialPriceYear = src.officialPriceYear ?? null;
      errorMsg.value = "";
      officialMsg.value = "";
      if (isLand.value) fetchLandFilters();
    }

    function close() {
      emit("close");
    }

    async function submit() {
      saving.value = true;
      errorMsg.value = "";
      try {
        const land = isLand.value;
        await axios.put(`/api/property/holdings/${props.holding.id}`, {
          purchasePrice: form.purchasePrice || null,
          monthlyRent: !land && props.holding.dealType === "MONTHLY" ? form.monthlyRent || null : null,
          memo: form.memo?.trim() || null,
          purchaseDate: form.purchaseDate || null,
          jimok: land ? form.jimok?.trim() || null : null,
          useZone: land ? form.useZone?.trim() || null : null,
          officialPricePerM2: land ? form.officialPricePerM2 || null : null,
          officialPriceYear: land ? form.officialPriceYear || null : null,
        });
        emit("saved");
        emit("close");
      } catch (e) {
        errorMsg.value =
          e.response?.data?.message || e.response?.data || "수정에 실패했습니다.";
      } finally {
        saving.value = false;
      }
    }

    const setBgScrollLock = (locked) => {
      const v = locked ? "hidden" : "";
      document.body.style.overflow = v;
      document.documentElement.style.overflow = v;
      if (lenis) locked ? lenis.stop() : lenis.start();
    };
    watch(
      () => props.show,
      (s) => {
        setBgScrollLock(s);
        if (s) fillForm();
      },
      { immediate: true }
    );
    onBeforeUnmount(() => setBgScrollLock(false));

    return {
      form, saving, errorMsg, h, isLand, today, thisYear,
      dealLabel, priceLabel, dateLabel,
      landJimoks, landUseZones, officialLoading, officialMsg,
      formatMoney, refetchOfficial, close, submit,
    };
  },
};
</script>

<style src="@/assets/css/components/realestate/edit-property-modal.css" scoped></style>
