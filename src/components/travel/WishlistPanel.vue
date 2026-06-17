<template>
  <div class="wl">
    <div class="wl-head">
      <div class="wl-summary" v-if="items.length">
        가고 싶은 곳 <strong>{{ items.length }}</strong>곳
      </div>
      <button class="wl-add-btn" @click="openAdd">＋ 추가</button>
    </div>

    <div v-if="loading" class="wl-empty">불러오는 중…</div>

    <div v-else-if="items.length === 0" class="wl-empty">
      버킷리스트가 비어 있습니다. <strong>＋ 추가</strong>로 가고 싶은 곳을 담아보세요.
    </div>

    <div v-else class="wl-grid">
      <div v-for="w in items" :key="w.id" class="wl-card">
        <div class="wl-card-top">
          <span :class="['wl-badge', 'wl-p' + (w.priority || 2)]">{{ priorityLabel(w.priority) }}</span>
          <div class="wl-actions">
            <button class="wl-edit" title="수정" @click="openEdit(w)">✏️</button>
            <button class="wl-del" title="삭제" @click="remove(w)">🗑</button>
          </div>
        </div>

        <div class="wl-title">{{ w.title }}</div>
        <div v-if="w.country || w.city" class="wl-region">
          {{ [w.country, w.city].filter(Boolean).join(" · ") }}
        </div>

        <div class="wl-tags">
          <span v-if="w.targetPeriod" class="wl-tag">🗓 {{ w.targetPeriod }}</span>
          <span v-if="w.estBudget" class="wl-tag">💰 {{ formatMoney(w.estBudget) }}</span>
        </div>

        <div v-if="w.memo" class="wl-memo">{{ w.memo }}</div>
      </div>
    </div>

    <WishlistModal :show="showModal" :item="editTarget" @close="closeModal" @saved="onSaved" />
  </div>
</template>

<script>
import { ref, watch, onMounted } from "vue";
import axios from "@/axios";
import WishlistModal from "./WishlistModal.vue";

export default {
  name: "WishlistPanel",
  components: { WishlistModal },
  props: { active: { type: Boolean, default: false } },
  setup(props) {
    const items = ref([]);
    const loading = ref(false);
    const showModal = ref(false);
    const editTarget = ref(null);

    async function load() {
      loading.value = true;
      try {
        const res = await axios.get("/api/travel/wishlist");
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
    function openEdit(w) {
      editTarget.value = w;
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

    async function remove(w) {
      if (!confirm(`'${w.title}'을(를) 버킷리스트에서 삭제할까요?`)) return;
      try {
        await axios.delete(`/api/travel/wishlist/${w.id}`);
        await load();
      } catch {
        alert("삭제에 실패했습니다.");
      }
    }

    function priorityLabel(p) {
      return { 1: "⭐ 꼭 가고싶음", 2: "보통", 3: "언젠가" }[p || 2];
    }

    function formatMoney(manwon) {
      if (!manwon) return "-";
      const eok = Math.floor(manwon / 10000);
      const rest = manwon % 10000;
      let out = "";
      if (eok > 0) out += `${eok}억`;
      if (rest > 0) out += `${eok > 0 ? " " : ""}${rest.toLocaleString()}만`;
      return out || `${manwon}만`;
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

    // 부모(travel.vue)에서 AI 플래너가 담은 직후 새로고침할 수 있도록 노출
    return {
      items, loading, showModal, editTarget,
      openAdd, openEdit, closeModal, onSaved, remove,
      priorityLabel, formatMoney, reload: load,
    };
  },
};
</script>

<style scoped>
.wl-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px; flex-wrap: wrap; gap: 8px;
}
.wl-summary { font-size: 14px; color: var(--text-muted); }
.wl-add-btn {
  padding: 9px 16px; border: none; border-radius: 7px;
  background: #6366f1; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer;
}
.wl-empty { padding: 40px; text-align: center; color: var(--text-muted); font-size: 14px; }

.wl-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}
.wl-card {
  border: 1px solid var(--card-border); border-radius: 10px;
  background: var(--card-bg); padding: 14px;
}
.wl-card-top { display: flex; align-items: center; justify-content: space-between; }
.wl-badge { font-size: 11px; font-weight: 700; padding: 2px 9px; border-radius: 10px; }
.wl-p1 { background: #fee2e2; color: #b91c1c; }
.wl-p2 { background: #e0e7ff; color: #3730a3; }
.wl-p3 { background: #f1f5f9; color: #475569; }
.wl-actions { display: flex; gap: 2px; }
.wl-edit, .wl-del { border: none; background: none; cursor: pointer; font-size: 14px; opacity: 0.6; padding: 2px 4px; }
.wl-edit:hover, .wl-del:hover { opacity: 1; }

.wl-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin-top: 8px; }
.wl-region { font-size: 12px; color: var(--text-muted); margin-top: 2px; }

.wl-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; }
.wl-tag {
  font-size: 11px; padding: 2px 8px; border-radius: 6px;
  background: rgba(99, 102, 241, 0.08); color: var(--text-muted);
  border: 1px solid var(--card-border);
}
.wl-memo {
  margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--card-border);
  font-size: 12px; color: var(--text-muted); white-space: pre-wrap;
}

@media (max-width: 640px) {
  .wl-grid { grid-template-columns: 1fr; }
}
</style>
