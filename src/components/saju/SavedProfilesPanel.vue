<template>
  <div class="sp">
    <div
      v-if="items.length"
      class="sp-head"
    >
      <div class="sp-summary">
        저장된 사주 <strong>{{ items.length }}</strong>건
      </div>
    </div>

    <div
      v-if="loading"
      class="sp-empty"
    >
      불러오는 중…
    </div>

    <div
      v-else-if="items.length === 0"
      class="sp-empty"
    >
      저장된 사주가 없습니다. <strong>사주 보기</strong> 탭에서 생년월일을 입력해보세요.
    </div>

    <div
      v-else
      class="sp-list"
    >
      <div
        v-for="p in items"
        :key="p.id"
        class="sp-card"
      >
        <div
          class="sp-card-top"
          @click="toggleExpand(p.id)"
        >
          <div class="sp-card-info">
            <div class="sp-label">
              {{ p.label }}
            </div>
            <div class="sp-birth">
              {{ birthText(p) }}
            </div>
          </div>
          <div class="sp-card-actions">
            <button
              class="sp-btn"
              title="재해석"
              :disabled="busyId === p.id"
              @click.stop="reanalyze(p)"
            >
              {{ busyId === p.id ? "⏳" : "🔄" }}
            </button>
            <button
              class="sp-btn sp-del"
              title="삭제"
              :disabled="busyId === p.id"
              @click.stop="remove(p)"
            >
              🗑
            </button>
            <span class="sp-expand-icon">{{ expandedId === p.id ? "▲" : "▼" }}</span>
          </div>
        </div>

        <div
          v-if="expandedId === p.id"
          class="sp-card-body"
        >
          <PaljaDisplay :palja="p.paljaJson" />

          <div
            v-if="reanalyzeBlocked[p.id]"
            class="sp-error"
          >
            ⚠️ 지금은 AI 해석이 어렵습니다(제공자 사용량 한도). 잠시 후 다시 시도하세요.
          </div>
          <MarkdownView
            v-else-if="p.lastReportMarkdown"
            :text="p.lastReportMarkdown"
          />
          <div
            v-else
            class="sp-no-report"
          >
            아직 AI 해석 리포트가 없습니다. <strong>🔄 재해석</strong>을 눌러보세요.
          </div>

          <p
            v-if="p.analyzedAt"
            class="sp-meta"
          >
            해석 시각: {{ formatTime(p.analyzedAt) }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, watch, onMounted } from "vue";
import { fetchSajuProfiles, reanalyzeSajuProfile, deleteSajuProfile } from "@/api/sajuApi";
import PaljaDisplay from "./PaljaDisplay.vue";
import MarkdownView from "@/components/common/MarkdownView.vue";

export default {
  name: "SavedProfilesPanel",
  components: { PaljaDisplay, MarkdownView },
  props: { active: { type: Boolean, default: false } },
  setup(props) {
    const items = ref([]);
    const loading = ref(false);
    const expandedId = ref(null);
    const busyId = ref(null);
    const reanalyzeBlocked = reactive({});

    async function load() {
      loading.value = true;
      try {
        const res = await fetchSajuProfiles();
        items.value = Array.isArray(res.data) ? res.data : [];
      } catch {
        items.value = [];
      } finally {
        loading.value = false;
      }
    }

    function toggleExpand(id) {
      expandedId.value = expandedId.value === id ? null : id;
    }

    async function reanalyze(p) {
      if (busyId.value) return;
      busyId.value = p.id;
      delete reanalyzeBlocked[p.id];
      try {
        const res = await reanalyzeSajuProfile(p.id);
        const data = res.data || {};
        if (data.palja) p.paljaJson = data.palja;
        if (data.blocked) {
          reanalyzeBlocked[p.id] = true;
        } else {
          p.lastReportMarkdown = data.report;
          p.analyzedAt = data.analyzedAt;
        }
        expandedId.value = p.id;
      } catch {
        alert("재해석에 실패했습니다.");
      } finally {
        busyId.value = null;
      }
    }

    async function remove(p) {
      if (busyId.value) return;
      if (!confirm(`'${p.label}' 사주를 삭제할까요?`)) return;
      busyId.value = p.id;
      try {
        await deleteSajuProfile(p.id);
        if (expandedId.value === p.id) expandedId.value = null;
        await load();
      } catch {
        alert("삭제에 실패했습니다.");
      } finally {
        busyId.value = null;
      }
    }

    function birthText(p) {
      const timePart =
        p.timeUnknown || !p.birthTime ? "(시간 모름)" : String(p.birthTime).slice(0, 5);
      if (p.calendarType === "LUNAR" && p.lunarYear) {
        const y = p.lunarYear;
        const m = String(p.lunarMonth).padStart(2, "0");
        const d = String(p.lunarDay).padStart(2, "0");
        const leapText = p.leapMonth ? "윤" : "평";
        return `음력 ${y}-${m}-${d}(${leapText}) → 양력 ${p.birthDate || ""} ${timePart}`;
      }
      return `${p.birthDate || ""} ${timePart}`;
    }

    function formatTime(dateStr) {
      if (!dateStr) return "";
      return new Date(dateStr).toLocaleString("ko-KR", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    watch(
      () => props.active,
      (isActive) => {
        if (isActive && items.value.length === 0) load();
      }
    );

    onMounted(() => {
      if (props.active) load();
    });

    // 부모(saju.vue)에서 새 사주가 저장된 직후 새로고침할 수 있도록 노출
    return {
      items, loading, expandedId, busyId, reanalyzeBlocked,
      toggleExpand, reanalyze, remove, birthText, formatTime,
      reload: load,
    };
  },
};
</script>

<style src="@/assets/css/components/saju/saved-profiles-panel.css" scoped></style>
