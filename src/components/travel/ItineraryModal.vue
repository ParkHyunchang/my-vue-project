<template>
  <teleport to="body">
    <div v-if="show" class="tvm-overlay" data-lenis-prevent @click.self="close">
      <div class="tvm-box tvm-box-wide">
        <div class="tvm-hdr">
          <h3>{{ isEdit ? "예정 일정 편집" : "예정 일정 작성" }}</h3>
          <button class="tvm-close" @click="close">✕</button>
        </div>

        <div class="tvm-grid2">
          <div class="tvm-row">
            <label>일정 제목 <span class="tvm-req">*</span></label>
            <input v-model="form.title" type="text" placeholder="예: 오사카 3박4일" />
          </div>
          <div class="tvm-row">
            <label>목적지 <span class="tvm-opt">(선택)</span></label>
            <input v-model="form.destination" type="text" placeholder="예: 오사카" />
          </div>
        </div>

        <div class="tvm-row">
          <label>여행 기간 <span class="tvm-opt">(날짜를 클릭해 출발·도착 선택)</span></label>
          <RangeCalendar v-model="range" :dim-future="false" />
        </div>

        <!-- 일자별 일정 (읽기 전용 — 수정은 아래 AI 채팅으로) -->
        <div v-if="hasItinerary" class="it-view">
          <div v-for="(d, di) in form.days" :key="di" class="it-vday">
            <div class="it-vday-head">
              <span class="it-vday-num">Day {{ di + 1 }}</span>
              <span class="it-vday-theme">{{ d.theme }}</span>
            </div>
            <ul class="it-vitems">
              <li v-for="(it, ii) in visibleItems(d)" :key="ii" class="it-vitem">
                <span class="it-vtime">{{ it.time }}</span>
                <span class="it-vbody">
                  <strong>{{ typeIcon(it.type) }} {{ it.place }}</strong>
                  <span v-if="it.desc" class="it-vdesc">{{ it.desc }}</span>
                </span>
              </li>
            </ul>
          </div>
        </div>
        <div v-else class="it-empty-hint">
          아직 일정이 없습니다. 아래 <strong>AI로 일정 다듬기</strong>에 "오사카 3박4일 짜줘"처럼 입력하면 일정이 채워집니다.
        </div>

        <ItineraryChat
          class="it-chat"
          :plan="chatPlan"
          :destination="form.destination"
          :days="form.days.length"
          @revised="onRevised"
        />

        <div class="tvm-row">
          <label>메모 <span class="tvm-opt">(선택)</span></label>
          <textarea v-model="form.memo" rows="2" placeholder="준비물, 예약 정보 등"></textarea>
        </div>

        <div v-if="errorMsg" class="tvm-error">{{ errorMsg }}</div>

        <div class="tvm-actions">
          <button class="tvm-cancel" @click="close">취소</button>
          <button class="tvm-submit" :disabled="!canSubmit || saving" @click="submit">
            {{ saving ? "저장중…" : (isEdit ? "수정" : "저장") }}
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
import RangeCalendar from "./RangeCalendar.vue";
import ItineraryChat from "./ItineraryChat.vue";
import { typeIcon } from "./itemTypes.js";

export default {
  name: "ItineraryModal",
  components: { RangeCalendar, ItineraryChat },
  props: {
    show: { type: Boolean, required: true },
    item: { type: Object, default: null },
  },
  emits: ["close", "saved"],
  setup(props, { emit }) {
    const form = reactive({
      title: "", destination: "", startDate: null, endDate: null, days: [], memo: "",
    });
    const saving = ref(false);
    const errorMsg = ref("");

    const range = computed({
      get: () => ({ start: form.startDate, end: form.endDate }),
      set: (v) => {
        form.startDate = v.start;
        form.endDate = v.end;
      },
    });

    const isEdit = computed(() => !!props.item);
    const canSubmit = computed(() => form.title.trim().length > 0);

    // AI 채팅 수정에 넘길 현재 일정(plan 형태)
    const chatPlan = computed(() => ({
      title: form.title,
      days: form.days.map((d, i) => ({ day: i + 1, theme: d.theme, items: d.items })),
    }));

    // 표시할 일정이 있는지 (장소가 채워진 항목 또는 테마가 있으면 true)
    const hasItinerary = computed(() =>
      form.days.some(
        (d) => (d.theme && d.theme.trim()) || d.items.some((it) => it.place && it.place.trim())
      )
    );

    function visibleItems(d) {
      return d.items.filter((it) => it.place && it.place.trim());
    }

    function emptyItem() {
      return { time: "오전", type: "관광", place: "", desc: "" };
    }
    function emptyDay() {
      return { theme: "", items: [emptyItem()] };
    }

    function resetForm() {
      Object.assign(form, {
        title: "", destination: "", startDate: null, endDate: null, memo: "",
      });
      form.days = [emptyDay()];
      errorMsg.value = "";
    }

    function fillFrom(item) {
      const src = Array.isArray(item.itinerary) ? item.itinerary : [];
      const days = src.map((d) => ({
        theme: d.theme || "",
        items: Array.isArray(d.items)
          ? d.items.map((it) => ({
              time: it.time || "오전",
              type: it.type || "관광",
              place: it.place || "",
              desc: it.desc || "",
            }))
          : [emptyItem()],
      }));
      Object.assign(form, {
        title: item.title || "",
        destination: item.destination || "",
        startDate: item.startDate || null,
        endDate: item.endDate || null,
        memo: item.memo || "",
      });
      form.days = days.length ? days : [emptyDay()];
      errorMsg.value = "";
    }

    // AI 채팅 수정 결과를 편집 폼에 반영
    function onRevised(newPlan) {
      if (!newPlan || !Array.isArray(newPlan.days)) return;
      const days = newPlan.days.map((d) => ({
        theme: d.theme || "",
        items: Array.isArray(d.items)
          ? d.items.map((it) => ({
              time: it.time || "오전",
              type: it.type || "관광",
              place: it.place || "",
              desc: it.desc || "",
            }))
          : [emptyItem()],
      }));
      form.days = days.length ? days : [emptyDay()];
      if (newPlan.title && !form.title.trim()) form.title = newPlan.title;
    }

    function close() {
      emit("close");
    }

    async function submit() {
      if (!canSubmit.value) return;
      saving.value = true;
      errorMsg.value = "";
      const itinerary = form.days.map((d, idx) => ({
        day: idx + 1,
        theme: d.theme.trim(),
        items: d.items
          .filter((it) => it.place.trim())
          .map((it) => ({
            time: it.time,
            type: it.type,
            place: it.place.trim(),
            desc: it.desc.trim(),
          })),
      }));
      const payload = {
        title: form.title.trim(),
        destination: form.destination.trim() || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        days: itinerary.length,
        itinerary,
        memo: form.memo.trim() || null,
      };
      try {
        if (isEdit.value) {
          await axios.put(`/api/travel/itinerary/${props.item.id}`, payload);
        } else {
          await axios.post("/api/travel/itinerary", payload);
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

    return {
      form, range, saving, errorMsg, isEdit, canSubmit, chatPlan,
      hasItinerary, visibleItems, typeIcon,
      onRevised, close, submit,
    };
  },
};
</script>

<style src="@/assets/css/components/travel/itinerary-modal.css" scoped></style>
