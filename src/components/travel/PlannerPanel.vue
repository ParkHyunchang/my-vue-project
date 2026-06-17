<template>
  <div class="pl">
    <!-- 입력 폼 -->
    <div class="pl-form">
      <div class="pl-row pl-row-wide">
        <label>목적지 <span class="pl-req">*</span></label>
        <input v-model="form.destination" type="text" placeholder="예: 오사카, 제주도, 다낭" @keyup.enter="generate" />
      </div>

      <div class="pl-grid">
        <div class="pl-row">
          <label>기간</label>
          <select v-model.number="form.days">
            <option v-for="d in 14" :key="d" :value="d">{{ d }}일 ({{ d - 1 }}박 {{ d }}일)</option>
          </select>
        </div>
        <div class="pl-row">
          <label>동행</label>
          <input v-model="form.companions" type="text" placeholder="예: 부부, 친구 2명, 혼자" />
        </div>
      </div>

      <div class="pl-row">
        <label>여행 스타일 <span class="pl-opt">(선택)</span></label>
        <div class="pl-chips">
          <button
            v-for="s in styleOptions"
            :key="s"
            type="button"
            :class="['pl-chip', { active: form.style.includes(s) }]"
            @click="toggleStyle(s)"
          >{{ s }}</button>
        </div>
      </div>

      <div class="pl-row">
        <label>예산 <span class="pl-opt">(선택)</span></label>
        <input v-model="form.budget" type="text" placeholder="예: 1인 100만원, 가성비 위주" />
        <div class="pl-checks">
          <label class="pl-check">
            <input type="checkbox" v-model="form.includeFlight" /> 항공권 포함
          </label>
          <label class="pl-check">
            <input type="checkbox" v-model="form.includeStay" /> 숙박 포함
          </label>
        </div>
      </div>

      <button class="pl-gen-btn" :disabled="!canGenerate || loading" @click="generate">
        {{ loading ? "AI가 일정을 짜는 중…" : "✨ AI 일정 생성" }}
      </button>
    </div>

    <!-- AI 제공자 차단 안내 -->
    <div v-if="blocked" class="pl-blocked">
      <span>⚠️ 지금은 AI 일정 생성이 어렵습니다(제공자 사용량 한도).</span>
      <span v-if="retryText"> 다시 가능한 시각: <strong>{{ retryText }}</strong></span>
    </div>

    <div v-if="errorMsg" class="pl-error">{{ errorMsg }}</div>

    <!-- 결과 -->
    <div v-if="plan" class="pl-result">
      <div class="pl-result-head">
        <div>
          <h3 class="pl-title">{{ plan.title }}</h3>
          <p v-if="plan.summary" class="pl-summary">{{ plan.summary }}</p>
        </div>
        <div class="pl-result-actions">
          <button class="pl-save-btn primary" :disabled="savingItinerary" @click="saveToItinerary">
            {{ savingItinerary ? "저장 중…" : "📅 예정 일정으로 저장" }}
          </button>
          <button class="pl-save-btn" :disabled="saving" @click="saveToWishlist">
            {{ saving ? "담는 중…" : "⭐ 버킷리스트에 담기" }}
          </button>
        </div>
      </div>

      <div v-if="plan.estimatedBudget" class="pl-budget">💰 {{ plan.estimatedBudget }}</div>

      <div class="pl-days">
        <div v-for="d in plan.days" :key="d.day" class="pl-day">
          <div class="pl-day-head">
            <span class="pl-day-num">Day {{ d.day }}</span>
            <span class="pl-day-theme">{{ d.theme }}</span>
          </div>
          <ul class="pl-items">
            <li v-for="(it, i) in d.items" :key="i" class="pl-item">
              <span class="pl-item-time">{{ it.time }}</span>
              <span class="pl-item-body">
                <strong>{{ typeIcon(it.type) }} {{ it.place }}</strong>
                <span v-if="it.desc" class="pl-item-desc">{{ it.desc }}</span>
              </span>
            </li>
          </ul>
        </div>
      </div>

      <ItineraryChat
        class="pl-chat"
        :plan="plan"
        :destination="form.destination"
        :days="form.days"
        @revised="onRevised"
      />

      <div v-if="plan.tips && plan.tips.length" class="pl-tips">
        <div class="pl-tips-title">💡 여행 팁</div>
        <ul>
          <li v-for="(t, i) in plan.tips" :key="i">{{ t }}</li>
        </ul>
      </div>

      <p v-if="providerName" class="pl-meta">생성: {{ providerName }} · {{ model }}</p>
    </div>

    <div v-else-if="!loading && !blocked && !errorMsg" class="pl-hint">
      목적지와 기간을 입력하고 <strong>AI 일정 생성</strong>을 눌러보세요.
    </div>
  </div>
</template>

<script>
import { reactive, ref, computed } from "vue";
import axios from "@/axios";
import { typeIcon } from "./itemTypes.js";
import ItineraryChat from "./ItineraryChat.vue";

export default {
  name: "PlannerPanel",
  components: { ItineraryChat },
  emits: ["add-to-wishlist", "saved-itinerary"],
  setup(props, { emit }) {
    const styleOptions = ["맛집", "자연", "휴양", "액티비티", "쇼핑", "역사·문화", "사진", "가성비"];

    const form = reactive({
      destination: "",
      days: 3,
      companions: "",
      style: [],
      budget: "",
      includeFlight: true,
      includeStay: true,
    });

    const loading = ref(false);
    const saving = ref(false);
    const savingItinerary = ref(false);
    const plan = ref(null);
    const blocked = ref(false);
    const retryText = ref("");
    const providerName = ref("");
    const model = ref("");
    const errorMsg = ref("");

    const canGenerate = computed(() => form.destination.trim().length > 0);

    function toggleStyle(s) {
      const i = form.style.indexOf(s);
      if (i >= 0) form.style.splice(i, 1);
      else form.style.push(s);
    }

    async function generate() {
      if (!canGenerate.value || loading.value) return;
      loading.value = true;
      plan.value = null;
      blocked.value = false;
      retryText.value = "";
      errorMsg.value = "";
      try {
        const res = await axios.post("/api/travel/plan", {
          destination: form.destination.trim(),
          days: form.days,
          companions: form.companions.trim() || null,
          style: form.style.join(", ") || null,
          budget: form.budget.trim() || null,
          includeFlight: form.includeFlight,
          includeStay: form.includeStay,
        });
        const data = res.data || {};
        if (data.blocked) {
          blocked.value = true;
          if (data.retryAt) {
            retryText.value = new Date(data.retryAt).toLocaleString("ko-KR");
          }
          return;
        }
        plan.value = data.plan || null;
        providerName.value = data.providerName || "";
        model.value = data.model || "";
      } catch (e) {
        errorMsg.value =
          e.response?.data?.message || e.response?.data || "일정 생성에 실패했습니다.";
      } finally {
        loading.value = false;
      }
    }

    function onRevised(newPlan) {
      if (newPlan) plan.value = newPlan;
    }

    async function saveToItinerary() {
      if (!plan.value || savingItinerary.value) return;
      savingItinerary.value = true;
      errorMsg.value = "";
      try {
        await axios.post("/api/travel/itinerary", {
          title: plan.value.title || `${form.destination.trim()} ${form.days}일`,
          destination: form.destination.trim() || null,
          days: form.days,
          itinerary: plan.value.days || [],
          memo: plan.value.summary || null,
        });
        emit("saved-itinerary");
      } catch {
        errorMsg.value = "예정 일정 저장에 실패했습니다.";
      } finally {
        savingItinerary.value = false;
      }
    }

    async function saveToWishlist() {
      if (!plan.value || saving.value) return;
      saving.value = true;
      try {
        await axios.post("/api/travel/wishlist", {
          title: form.destination.trim(),
          priority: 1,
          memo: plan.value.title + (form.style.length ? `\n스타일: ${form.style.join(", ")}` : ""),
        });
        emit("add-to-wishlist");
      } catch {
        errorMsg.value = "버킷리스트 담기에 실패했습니다.";
      } finally {
        saving.value = false;
      }
    }

    return {
      styleOptions, form, loading, saving, savingItinerary, plan, blocked, retryText,
      providerName, model, errorMsg, canGenerate,
      toggleStyle, generate, saveToWishlist, saveToItinerary, onRevised, typeIcon,
    };
  },
};
</script>

<style scoped>
.pl-form {
  border: 1px solid var(--card-border);
  border-radius: 12px;
  background: var(--card-bg);
  padding: 18px;
  margin-bottom: 16px;
}
.pl-row { margin-bottom: 14px; }
.pl-row label {
  display: block; font-size: 13px; font-weight: 600;
  color: var(--text-muted); margin-bottom: 6px;
}
.pl-req { color: #ef4444; }
.pl-opt { font-weight: 400; font-size: 11px; opacity: 0.7; }
.pl-row input,
.pl-row select {
  width: 100%; box-sizing: border-box;
  padding: 9px 11px;
  border: 1px solid var(--input-border);
  border-radius: 7px;
  background: var(--input-bg);
  color: var(--input-text);
  font-size: 14px;
}
.pl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

.pl-checks { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 8px; }
.pl-check {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; color: var(--text-muted); cursor: pointer; margin: 0;
}
.pl-check input { width: auto; cursor: pointer; }

.pl-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.pl-chip {
  padding: 6px 12px; border: 1px solid var(--input-border);
  background: var(--input-bg); color: var(--text-muted);
  border-radius: 16px; font-size: 13px; cursor: pointer;
}
.pl-chip.active { background: #6366f1; border-color: #6366f1; color: #fff; }

.pl-gen-btn {
  width: 100%; margin-top: 4px;
  padding: 12px; border: none; border-radius: 8px;
  background: #6366f1; color: #fff; font-size: 15px; font-weight: 700; cursor: pointer;
}
.pl-gen-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.pl-blocked {
  padding: 12px 16px; border-radius: 8px; margin-bottom: 14px; font-size: 13px;
  background: rgba(251, 191, 36, 0.12); border: 1px solid rgba(251, 191, 36, 0.4); color: #b45309;
}
.pl-error {
  padding: 10px 14px; border-radius: 8px; margin-bottom: 14px; font-size: 13px;
  background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #b91c1c;
}
.pl-hint { padding: 30px; text-align: center; color: var(--text-muted); font-size: 14px; }

.pl-result {
  border: 1px solid var(--card-border);
  border-radius: 12px; background: var(--card-bg); padding: 18px;
}
.pl-result-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 12px; flex-wrap: wrap; margin-bottom: 12px;
}
.pl-title { margin: 0 0 4px; font-size: 18px; color: var(--text-primary); }
.pl-summary { margin: 0; font-size: 13px; color: var(--text-muted); }
.pl-result-actions { display: flex; flex-direction: column; gap: 6px; align-items: stretch; }
.pl-save-btn {
  padding: 8px 14px; border: 1px solid #6366f1; border-radius: 7px;
  background: var(--input-bg); color: #6366f1; font-size: 13px; font-weight: 600;
  cursor: pointer; white-space: nowrap;
}
.pl-save-btn.primary { background: #6366f1; color: #fff; }
.pl-save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.pl-budget {
  display: inline-block; margin-bottom: 14px;
  padding: 5px 12px; border-radius: 8px; font-size: 13px; font-weight: 600;
  background: rgba(99, 102, 241, 0.1); color: #4f46e5;
}

.pl-days { display: flex; flex-direction: column; gap: 12px; }
.pl-day {
  border: 1px solid var(--card-border); border-radius: 10px; padding: 12px 14px;
}
.pl-day-head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px; }
.pl-day-num {
  font-size: 13px; font-weight: 800; color: #fff; background: #6366f1;
  padding: 2px 9px; border-radius: 8px;
}
.pl-day-theme { font-size: 14px; font-weight: 700; color: var(--text-primary); }
.pl-items { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
.pl-item { display: flex; gap: 10px; font-size: 13px; }
.pl-item-time {
  flex: 0 0 44px; font-size: 12px; font-weight: 700; color: #6366f1; padding-top: 1px;
}
.pl-item-body { display: flex; flex-direction: column; gap: 1px; }
.pl-item-body strong { color: var(--text-primary); }
.pl-item-desc { color: var(--text-muted); font-size: 12px; }

.pl-chat { margin-top: 16px; }

.pl-tips {
  margin-top: 16px; padding-top: 14px; border-top: 1px dashed var(--card-border);
}
.pl-tips-title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; }
.pl-tips ul { margin: 0; padding-left: 18px; }
.pl-tips li { font-size: 13px; color: var(--text-muted); margin-bottom: 4px; }

.pl-meta { margin: 14px 0 0; font-size: 11px; color: var(--text-muted); text-align: right; }

@media (max-width: 480px) {
  .pl-grid { grid-template-columns: 1fr; }
}
</style>
