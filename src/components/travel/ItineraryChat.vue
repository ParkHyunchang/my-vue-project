<template>
  <div class="ic">
    <div class="ic-title">
      💬 AI로 일정 다듬기
    </div>
    <p class="ic-hint">
      예: "Day2 오후를 온천 위주로 다시 짜줘" · "Day1 점심은 이치란 라멘으로 정했어"
    </p>

    <div
      v-if="messages.length"
      class="ic-log thin-scrollbar"
    >
      <div
        v-for="(m, i) in messages"
        :key="i"
        :class="['ic-msg', m.role === 'user' ? 'ic-user' : 'ic-bot']"
      >
        {{ m.text }}
      </div>
    </div>

    <div class="ic-input-row">
      <textarea
        v-model="input"
        class="thin-scrollbar"
        :disabled="loading"
        placeholder="어떻게 바꿀지 말해보세요"
        rows="1"
        @keydown.enter.exact.prevent="send"
      />
      <button
        class="ic-send"
        :disabled="!canSend || loading"
        @click="send"
      >
        {{ loading ? "수정 중…" : "보내기" }}
      </button>
    </div>
  </div>
</template>

<script>
import { ref, computed } from "vue";
import axios from "@/axios";

export default {
  name: "ItineraryChat",
  props: {
    plan: { type: Object, required: true }, // { title, summary, days, tips, estimatedBudget }
    destination: { type: String, default: "" },
    days: { type: Number, default: 3 },
  },
  emits: ["revised"],
  setup(props, { emit }) {
    const messages = ref([]);
    const input = ref("");
    const loading = ref(false);

    const canSend = computed(() => input.value.trim().length > 0);

    async function send() {
      const text = input.value.trim();
      if (!text || loading.value) return;
      messages.value.push({ role: "user", text });
      input.value = "";
      loading.value = true;
      try {
        const res = await axios.post("/api/travel/refine", {
          destination: props.destination || null,
          days: props.days,
          plan: props.plan,
          instruction: text,
        });
        const data = res.data || {};
        if (data.blocked) {
          let msg = "지금은 AI 수정이 어려워요(제공자 사용량 한도).";
          if (data.retryAt) msg += ` 다시 가능: ${new Date(data.retryAt).toLocaleString("ko-KR")}`;
          messages.value.push({ role: "assistant", text: msg });
          return;
        }
        if (data.plan) {
          emit("revised", data.plan);
          messages.value.push({ role: "assistant", text: "✅ 요청대로 일정을 다시 짰어요." });
        } else {
          messages.value.push({ role: "assistant", text: "수정 결과를 받지 못했어요. 다시 시도해 주세요." });
        }
      } catch {
        messages.value.push({ role: "assistant", text: "수정에 실패했어요. 다시 시도해 주세요." });
      } finally {
        loading.value = false;
      }
    }

    return { messages, input, loading, canSend, send };
  },
};
</script>

<style src="@/assets/css/components/travel/itinerary-chat.css" scoped></style>
