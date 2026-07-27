<template>
  <div class="sj-panel">
    <div class="sj-form">
      <div class="sj-row">
        <label>이름 <span class="sj-opt">(선택)</span></label>
        <input
          v-model="form.label"
          type="text"
          placeholder="예: 나, 아내, 첫째"
          maxlength="40"
          @keyup.enter="submit"
        >
      </div>

      <div class="sj-grid">
        <div class="sj-row">
          <label>생년월일 <span class="sj-req">*</span></label>
          <div class="sj-toggle-group">
            <button
              type="button"
              :class="['sj-toggle-btn', { active: form.calendarType === 'solar' }]"
              @click="form.calendarType = 'solar'"
            >
              양력
            </button>
            <button
              type="button"
              :class="['sj-toggle-btn', { active: form.calendarType === 'lunar' }]"
              @click="form.calendarType = 'lunar'"
            >
              음력
            </button>
          </div>

          <input
            v-if="form.calendarType === 'solar'"
            v-model="form.birthDate"
            type="date"
          >
          <template v-else>
            <div class="sj-lunar-grid">
              <input
                v-model.number="form.lunarYear"
                type="number"
                placeholder="연도"
                min="1391"
                max="2050"
              >
              <select v-model.number="form.lunarMonth">
                <option
                  v-for="m in 12"
                  :key="m"
                  :value="m"
                >
                  {{ m }}월
                </option>
              </select>
              <select v-model.number="form.lunarDay">
                <option
                  v-for="d in 30"
                  :key="d"
                  :value="d"
                >
                  {{ d }}일
                </option>
              </select>
            </div>
            <label class="sj-check">
              <input
                type="checkbox"
                v-model="form.leapMonth"
              > 윤달
            </label>
          </template>
        </div>
        <div class="sj-row">
          <label>태어난 시각</label>
          <div class="sj-toggle-group">
            <button
              type="button"
              :class="['sj-toggle-btn', { active: form.timeMode === 'exact' }]"
              :disabled="form.timeUnknown"
              @click="form.timeMode = 'exact'"
            >
              직접 입력
            </button>
            <button
              type="button"
              :class="['sj-toggle-btn', { active: form.timeMode === 'jiji' }]"
              :disabled="form.timeUnknown"
              @click="form.timeMode = 'jiji'"
            >
              시진 선택
            </button>
          </div>

          <input
            v-if="form.timeMode === 'exact'"
            v-model="form.birthTime"
            type="time"
            :disabled="form.timeUnknown"
          >
          <select
            v-else
            v-model="form.jiji"
            :disabled="form.timeUnknown"
          >
            <option
              v-for="j in jijiOptions"
              :key="j.key"
              :value="j.key"
            >
              {{ j.key }} ({{ j.range }})
            </option>
          </select>

          <label class="sj-check">
            <input
              type="checkbox"
              v-model="form.timeUnknown"
            > 태어난 시간을 모름
          </label>
        </div>
      </div>

      <button
        class="sj-submit-btn"
        :disabled="!canSubmit || loading"
        @click="submit"
      >
        {{ loading ? "AI가 사주를 해석하는 중…" : "🔮 사주 보기" }}
      </button>
    </div>

    <div
      v-if="errorMsg"
      class="sj-error"
    >
      {{ errorMsg }}
    </div>

    <div
      v-if="result && !result.found"
      class="sj-notfound"
    >
      ⚠️ {{ result.message }}
    </div>

    <div
      v-if="result && result.found"
      class="sj-result"
    >
      <p
        v-if="form.calendarType === 'lunar' && result.palja?.solarBirthDate"
        class="sj-solar-conv"
      >
        환산 양력: {{ result.palja.solarBirthDate }}
      </p>

      <PaljaDisplay :palja="result.palja" />

      <div
        v-if="result.blocked"
        class="sj-blocked"
      >
        <span>⚠️ 지금은 AI 해석이 어렵습니다(제공자 사용량 한도).</span>
        <span v-if="retryText"> 다시 가능한 시각: <strong>{{ retryText }}</strong></span>
      </div>

      <MarkdownView
        v-else-if="result.report"
        :text="result.report"
      />

      <p
        v-if="result.providerName"
        class="sj-meta"
      >
        해석: {{ result.providerName }}<span v-if="result.model"> · {{ result.model }}</span>
      </p>

      <div class="sj-disclaimer">
        이 해석은 정보 제공/오락 목적이며 운명을 확정하거나 의학적·법적 조언을 대신하지 않습니다. 결과는 자동으로 "저장된 사주"에 남습니다.
      </div>
    </div>

    <div
      v-else-if="!loading && !errorMsg"
      class="sj-hint"
    >
      생년월일을 입력하고 <strong>🔮 사주 보기</strong>를 눌러보세요. 결과는 자동으로 저장됩니다.
    </div>
  </div>
</template>

<script>
import { reactive, ref, computed } from "vue";
import axios from "@/axios";
import MarkdownView from "@/components/common/MarkdownView.vue";
import PaljaDisplay from "./PaljaDisplay.vue";

// 12지지 시진 — 대표 시각은 각 시진 구간의 시작 시(정시)로, 서버의 2시간 단위 시지 계산과 그대로 맞물린다.
// 자시(23:00~00:59)는 조자시/야자시 논란을 피하기 위해 대표값을 00:00(같은 날)로 둔다 — 23시대 정확한 시각을 직접 입력한 경우에만 다음날 보정이 적용된다.
const JIJI_OPTIONS = [
  { key: "자시", range: "23:00~00:59", time: "00:00" },
  { key: "축시", range: "01:00~02:59", time: "01:00" },
  { key: "인시", range: "03:00~04:59", time: "03:00" },
  { key: "묘시", range: "05:00~06:59", time: "05:00" },
  { key: "진시", range: "07:00~08:59", time: "07:00" },
  { key: "사시", range: "09:00~10:59", time: "09:00" },
  { key: "오시", range: "11:00~12:59", time: "11:00" },
  { key: "미시", range: "13:00~14:59", time: "13:00" },
  { key: "신시", range: "15:00~16:59", time: "15:00" },
  { key: "유시", range: "17:00~18:59", time: "17:00" },
  { key: "술시", range: "19:00~20:59", time: "19:00" },
  { key: "해시", range: "21:00~22:59", time: "21:00" },
];

export default {
  name: "SajuPanel",
  components: { MarkdownView, PaljaDisplay },
  emits: ["saved-profile"],
  setup(props, { emit }) {
    const form = reactive({
      label: "",
      calendarType: "solar", // 'solar' | 'lunar'
      birthDate: "",
      lunarYear: null,
      lunarMonth: 1,
      lunarDay: 1,
      leapMonth: false,
      birthTime: "",
      timeMode: "exact", // 'exact' | 'jiji'
      jiji: "자시",
      timeUnknown: false,
    });

    const loading = ref(false);
    const result = ref(null);
    const errorMsg = ref("");

    const canSubmit = computed(() => {
      if (form.calendarType === "lunar") {
        return !!form.lunarYear && form.lunarYear >= 1391 && form.lunarYear <= 2050;
      }
      return form.birthDate.trim().length > 0;
    });

    const effectiveBirthTime = computed(() => {
      if (form.timeMode === "jiji") {
        const found = JIJI_OPTIONS.find((j) => j.key === form.jiji);
        return found ? found.time : null;
      }
      return form.birthTime || null;
    });

    const retryText = computed(() =>
      result.value?.retryAt ? new Date(result.value.retryAt).toLocaleString("ko-KR") : ""
    );

    async function submit() {
      if (!canSubmit.value || loading.value) return;
      loading.value = true;
      result.value = null;
      errorMsg.value = "";
      try {
        const payload = {
          label: form.label.trim() || null,
          calendarType: form.calendarType === "lunar" ? "LUNAR" : "SOLAR",
          birthTime: form.timeUnknown ? null : effectiveBirthTime.value,
          timeUnknown: form.timeUnknown,
        };
        if (form.calendarType === "lunar") {
          payload.lunarYear = form.lunarYear;
          payload.lunarMonth = form.lunarMonth;
          payload.lunarDay = form.lunarDay;
          payload.leapMonth = form.leapMonth;
        } else {
          payload.birthDate = form.birthDate;
        }
        const res = await axios.post("/api/saju/profiles", payload);
        result.value = res.data || {};
        emit("saved-profile");
      } catch (e) {
        errorMsg.value =
          e.response?.data?.message || e.response?.data || "사주 계산에 실패했습니다.";
      } finally {
        loading.value = false;
      }
    }

    return {
      form,
      loading,
      result,
      errorMsg,
      canSubmit,
      retryText,
      submit,
      jijiOptions: JIJI_OPTIONS,
    };
  },
};
</script>

<style src="@/assets/css/components/saju/saju-panel.css" scoped></style>
