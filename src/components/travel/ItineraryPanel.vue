<template>
  <div class="ip">
    <div class="ip-head">
      <div class="ip-summary" v-if="items.length">
        예정 일정 <strong>{{ items.length }}</strong>건
      </div>
      <button class="ip-add-btn" @click="openAdd">＋ 일정 작성</button>
    </div>

    <div v-if="loading" class="ip-empty">불러오는 중…</div>

    <div v-else-if="items.length === 0" class="ip-empty">
      예정 일정이 없습니다. AI 플래너에서 <strong>📅 예정 일정으로 저장</strong>하거나
      <strong>＋ 일정 작성</strong>으로 직접 만들어보세요.
    </div>

    <div v-else class="ip-grid">
      <div v-for="it in items" :key="it.id" class="ip-card" @click="openEdit(it)">
        <div class="ip-card-top">
          <span v-if="ddayLabel(it)" :class="['ip-dday', ddayClass(it)]">{{ ddayLabel(it) }}</span>
          <span v-else class="ip-dday ip-dday-none">예정</span>
          <div class="ip-actions">
            <button class="ip-edit" title="편집" @click.stop="openEdit(it)">✏️</button>
            <button class="ip-del" title="삭제" @click.stop="remove(it)">🗑</button>
          </div>
        </div>

        <div class="ip-title">{{ it.title }}</div>
        <div class="ip-meta">
          <span v-if="it.destination">📍 {{ it.destination }}</span>
          <span v-if="it.startDate">🗓 {{ dateRange(it) }}</span>
        </div>

        <div class="ip-stat">
          <span class="ip-chip">{{ dayCount(it) }}일</span>
          <span class="ip-chip">{{ itemCount(it) }}개 일정</span>
        </div>

        <div v-if="firstThemes(it)" class="ip-preview">{{ firstThemes(it) }}</div>
      </div>
    </div>

    <ItineraryModal :show="showModal" :item="editTarget" @close="closeModal" @saved="onSaved" />
  </div>
</template>

<script>
import { ref, watch, onMounted } from "vue";
import axios from "@/axios";
import ItineraryModal from "./ItineraryModal.vue";

export default {
  name: "ItineraryPanel",
  components: { ItineraryModal },
  props: { active: { type: Boolean, default: false } },
  setup(props) {
    const items = ref([]);
    const loading = ref(false);
    const showModal = ref(false);
    const editTarget = ref(null);

    async function load() {
      loading.value = true;
      try {
        const res = await axios.get("/api/travel/itinerary");
        items.value = Array.isArray(res.data) ? res.data : [];
      } catch {
        items.value = [];
      } finally {
        loading.value = false;
      }
    }

    function openAdd() {
      editTarget.value = null;
      showModal.value = true;
    }
    function openEdit(it) {
      editTarget.value = it;
      showModal.value = true;
    }
    function closeModal() {
      showModal.value = false;
      editTarget.value = null;
    }
    function onSaved() {
      closeModal();
      load();
    }

    async function remove(it) {
      if (!confirm(`'${it.title}' 예정 일정을 삭제할까요?`)) return;
      try {
        await axios.delete(`/api/travel/itinerary/${it.id}`);
        await load();
      } catch {
        alert("삭제에 실패했습니다.");
      }
    }

    function parseIso(s) {
      const [y, m, d] = s.split("-").map(Number);
      return new Date(y, m - 1, d);
    }

    function ddayLabel(it) {
      if (!it.startDate) return "";
      const t0 = new Date();
      t0.setHours(0, 0, 0, 0);
      const diff = Math.round((parseIso(it.startDate) - t0) / 86400000);
      if (diff > 0) return `D-${diff}`;
      if (diff === 0) return "D-DAY";
      return `${-diff}일 지남`;
    }
    function ddayClass(it) {
      if (!it.startDate) return "";
      const t0 = new Date();
      t0.setHours(0, 0, 0, 0);
      const diff = Math.round((parseIso(it.startDate) - t0) / 86400000);
      if (diff < 0) return "ip-dday-past";
      if (diff <= 7) return "ip-dday-soon";
      return "";
    }

    function dateRange(it) {
      const s = it.startDate;
      const e = it.endDate;
      if (!s) return "";
      if (!e || e === s) return s;
      const endShort = s.slice(0, 4) === e.slice(0, 4) ? e.slice(5) : e;
      return `${s} ~ ${endShort}`;
    }

    function dayCount(it) {
      if (Array.isArray(it.itinerary)) return it.itinerary.length;
      return it.days || 0;
    }
    function itemCount(it) {
      if (!Array.isArray(it.itinerary)) return 0;
      return it.itinerary.reduce((sum, d) => sum + (Array.isArray(d.items) ? d.items.length : 0), 0);
    }
    function firstThemes(it) {
      if (!Array.isArray(it.itinerary)) return "";
      return it.itinerary
        .map((d) => d.theme)
        .filter(Boolean)
        .slice(0, 3)
        .join(" · ");
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

    return {
      items, loading, showModal, editTarget,
      openAdd, openEdit, closeModal, onSaved, remove,
      ddayLabel, ddayClass, dateRange, dayCount, itemCount, firstThemes,
      reload: load,
    };
  },
};
</script>

<style scoped>
.ip-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px; flex-wrap: wrap; gap: 8px;
}
.ip-summary { font-size: 14px; color: var(--text-muted); }
.ip-add-btn {
  padding: 9px 16px; border: none; border-radius: 7px;
  background: #6366f1; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer;
}
.ip-empty { padding: 40px; text-align: center; color: var(--text-muted); font-size: 14px; line-height: 1.7; }

.ip-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 14px;
}
.ip-card {
  border: 1px solid var(--card-border); border-radius: 10px;
  background: var(--card-bg); padding: 14px; cursor: pointer;
}
.ip-card:hover { border-color: #6366f1; }
.ip-card-top { display: flex; align-items: center; justify-content: space-between; }
.ip-dday {
  font-size: 12px; font-weight: 800; padding: 2px 10px; border-radius: 10px;
  background: #e0e7ff; color: #3730a3;
}
.ip-dday-soon { background: #fee2e2; color: #b91c1c; }
.ip-dday-past { background: #f1f5f9; color: #64748b; }
.ip-dday-none { background: #f1f5f9; color: #64748b; }
.ip-actions { display: flex; gap: 2px; }
.ip-edit, .ip-del { border: none; background: none; cursor: pointer; font-size: 14px; opacity: 0.6; padding: 2px 4px; }
.ip-edit:hover, .ip-del:hover { opacity: 1; }

.ip-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin-top: 8px; }
.ip-meta { display: flex; flex-wrap: wrap; gap: 10px; font-size: 12px; color: var(--text-muted); margin-top: 4px; }

.ip-stat { display: flex; gap: 6px; margin-top: 10px; }
.ip-chip {
  font-size: 11px; padding: 2px 8px; border-radius: 6px;
  background: rgba(99, 102, 241, 0.08); color: var(--text-muted);
  border: 1px solid var(--card-border);
}
.ip-preview {
  margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--card-border);
  font-size: 12px; color: var(--text-muted);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

@media (max-width: 640px) {
  .ip-grid { grid-template-columns: 1fr; }
}
</style>
