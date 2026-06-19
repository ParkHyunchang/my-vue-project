<template>
  <div class="ic">
    <div class="ic-title">💬 AI로 일정 다듬기</div>
    <p class="ic-hint">예: "Day2 오후를 온천 위주로 다시 짜줘" · "Day1 점심은 이치란 라멘으로 정했어"</p>

    <div v-if="messages.length" class="ic-log thin-scrollbar">
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
      ></textarea>
      <button class="ic-send" :disabled="!canSend || loading" @click="send">
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

<style scoped>
.ic {
  border: 1px solid var(--card-border);
  border-radius: 10px;
  background: rgba(99, 102, 241, 0.04);
  padding: 14px;
}
.ic-title { font-size: 14px; font-weight: 700; color: var(--text-primary); }
.ic-hint { margin: 4px 0 10px; font-size: 12px; color: var(--text-muted); }

.ic-log {
  display: flex; flex-direction: column; gap: 6px;
  margin-bottom: 10px; max-height: 200px; overflow-y: auto;
}
.ic-msg {
  font-size: 13px; padding: 7px 11px; border-radius: 10px; max-width: 85%;
  white-space: pre-wrap; word-break: break-word;
}
.ic-user { align-self: flex-end; background: #6366f1; color: #fff; border-bottom-right-radius: 3px; }
.ic-bot {
  align-self: flex-start; background: var(--card-bg);
  border: 1px solid var(--card-border); color: var(--text-primary);
  border-bottom-left-radius: 3px;
}

.ic-input-row { display: flex; gap: 6px; }
.ic-input-row textarea {
  flex: 1; min-width: 0; padding: 9px 11px;
  border: 1px solid var(--input-border); border-radius: 7px;
  background: var(--input-bg); color: var(--input-text); font-size: 14px;
  line-height: 1.4;
  resize: vertical;
  min-height: 38px;
  max-height: 120px;
  overflow-y: auto;
}
.ic-send {
  padding: 9px 16px; border: none; border-radius: 7px;
  background: #6366f1; color: #fff; font-size: 13px; font-weight: 600;
  cursor: pointer; white-space: nowrap;
}
.ic-send:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
