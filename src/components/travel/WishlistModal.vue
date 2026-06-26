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

<style src="@/assets/css/components/travel/wishlist-modal.css" scoped></style>
