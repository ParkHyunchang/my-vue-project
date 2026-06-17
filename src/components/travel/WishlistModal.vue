<template>
  <teleport to="body">
    <div v-if="show" class="tvm-overlay" data-lenis-prevent @click.self="close">
      <div class="tvm-box">
        <div class="tvm-hdr">
          <h3>{{ isEdit ? "버킷리스트 수정" : "버킷리스트 추가" }}</h3>
          <button class="tvm-close" @click="close">✕</button>
        </div>

        <div class="tvm-row">
          <label>가고 싶은 곳 <span class="tvm-req">*</span></label>
          <input v-model="form.title" type="text" placeholder="예: 산토리니" />
        </div>

        <div class="tvm-grid2">
          <div class="tvm-row">
            <label>국가 <span class="tvm-opt">(선택)</span></label>
            <input v-model="form.country" type="text" placeholder="예: 그리스" />
          </div>
          <div class="tvm-row">
            <label>도시·지역 <span class="tvm-opt">(선택)</span></label>
            <input v-model="form.city" type="text" placeholder="예: 산토리니" />
          </div>
        </div>

        <div class="tvm-row">
          <label>우선순위</label>
          <div class="tvm-toggle">
            <button
              v-for="p in priorities"
              :key="p.id"
              type="button"
              :class="['tvm-toggle-btn', { active: form.priority === p.id }]"
              @click="form.priority = p.id"
            >{{ p.label }}</button>
          </div>
        </div>

        <div class="tvm-grid2">
          <div class="tvm-row">
            <label>목표 시기 <span class="tvm-opt">(선택)</span></label>
            <input v-model="form.targetPeriod" type="text" placeholder="예: 2026 여름" />
          </div>
          <div class="tvm-row">
            <label>예상 예산 (만원) <span class="tvm-opt">(선택)</span></label>
            <input v-model.number="form.estBudget" type="number" min="0" placeholder="만원 단위" />
          </div>
        </div>

        <div class="tvm-row">
          <label>메모 <span class="tvm-opt">(선택)</span></label>
          <textarea v-model="form.memo" rows="2" placeholder="자유 메모"></textarea>
        </div>

        <div v-if="errorMsg" class="tvm-error">{{ errorMsg }}</div>

        <div class="tvm-actions">
          <button class="tvm-cancel" @click="close">취소</button>
          <button class="tvm-submit" :disabled="!canSubmit || saving" @click="submit">
            {{ saving ? "저장중…" : (isEdit ? "수정" : "추가") }}
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script>
import { reactive, ref, computed, watch, onBeforeUnmount } from "vue";
import axios from "@/axios";
import { lenis } from "@/assets/js/smooth.js";

export default {
  name: "WishlistModal",
  props: {
    show: { type: Boolean, required: true },
    item: { type: Object, default: null },
  },
  emits: ["close", "saved"],
  setup(props, { emit }) {
    const priorities = [
      { id: 1, label: "꼭 가고싶음" },
      { id: 2, label: "보통" },
      { id: 3, label: "언젠가" },
    ];

    const form = reactive({
      title: "", country: "", city: "",
      priority: 2, targetPeriod: "", estBudget: null, memo: "",
    });
    const saving = ref(false);
    const errorMsg = ref("");

    const isEdit = computed(() => !!props.item);
    const canSubmit = computed(() => form.title.trim().length > 0);

    function resetForm() {
      Object.assign(form, {
        title: "", country: "", city: "",
        priority: 2, targetPeriod: "", estBudget: null, memo: "",
      });
      errorMsg.value = "";
    }

    function fillFrom(item) {
      Object.assign(form, {
        title: item.title || "",
        country: item.country || "",
        city: item.city || "",
        priority: item.priority || 2,
        targetPeriod: item.targetPeriod || "",
        estBudget: item.estBudget ?? null,
        memo: item.memo || "",
      });
      errorMsg.value = "";
    }

    function close() {
      emit("close");
    }

    async function submit() {
      if (!canSubmit.value) return;
      saving.value = true;
      errorMsg.value = "";
      const payload = {
        title: form.title.trim(),
        country: form.country.trim() || null,
        city: form.city.trim() || null,
        priority: form.priority,
        targetPeriod: form.targetPeriod.trim() || null,
        estBudget: form.estBudget || null,
        memo: form.memo.trim() || null,
      };
      try {
        if (isEdit.value) {
          await axios.put(`/api/travel/wishlist/${props.item.id}`, payload);
        } else {
          await axios.post("/api/travel/wishlist", payload);
        }
        emit("saved");
      } catch (e) {
        errorMsg.value =
          e.response?.data?.message || e.response?.data || "저장에 실패했습니다.";
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
        if (s) {
          if (props.item) fillFrom(props.item);
          else resetForm();
        }
      },
      { immediate: true }
    );
    onBeforeUnmount(() => setBgScrollLock(false));

    return { priorities, form, saving, errorMsg, isEdit, canSubmit, close, submit };
  },
};
</script>

<style scoped>
.tvm-overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex; align-items: flex-start; justify-content: center;
  z-index: 10001; padding: 6vh 16px; overflow-y: auto;
}
.tvm-box {
  width: 100%; max-width: 460px;
  background: var(--card-bg, #fff); border-radius: 12px; padding: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); margin: auto;
}
.tvm-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.tvm-hdr h3 { margin: 0; font-size: 18px; color: var(--text-primary); }
.tvm-close { border: none; background: none; font-size: 18px; cursor: pointer; color: var(--text-muted); }

.tvm-row { margin-bottom: 14px; }
.tvm-row label { display: block; font-size: 13px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; }
.tvm-req { color: #ef4444; }
.tvm-opt { font-weight: 400; font-size: 11px; opacity: 0.7; }
.tvm-row input,
.tvm-row textarea {
  width: 100%; box-sizing: border-box; padding: 9px 11px;
  border: 1px solid var(--input-border); border-radius: 7px;
  background: var(--input-bg); color: var(--input-text); font-size: 14px;
}
.tvm-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

.tvm-toggle { display: flex; gap: 4px; }
.tvm-toggle-btn {
  flex: 1; padding: 8px; border: 1px solid var(--input-border);
  background: var(--input-bg); color: var(--text-muted);
  border-radius: 7px; font-size: 13px; font-weight: 600; cursor: pointer;
}
.tvm-toggle-btn.active { background: #6366f1; border-color: #6366f1; color: #fff; }

.tvm-error {
  padding: 8px 12px; border-radius: 7px; margin-bottom: 12px;
  background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3);
  color: #b91c1c; font-size: 13px;
}
.tvm-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
.tvm-cancel, .tvm-submit { padding: 9px 18px; border-radius: 7px; font-size: 14px; font-weight: 600; cursor: pointer; }
.tvm-cancel { border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-muted); }
.tvm-submit { border: none; background: #6366f1; color: #fff; }
.tvm-submit:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 480px) {
  .tvm-box { padding: 16px; }
  .tvm-grid2 { grid-template-columns: 1fr; gap: 0; }
}
</style>
