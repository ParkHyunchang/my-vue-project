<template>
  <div class="vs">
    <div class="vs-head">
      <div
        class="vs-summary"
        v-if="items.length"
      >
        다녀온 곳 <strong>{{ items.length }}</strong>곳
        <span v-if="countryCount"> · {{ countryCount }}개 국가</span>
      </div>
      <button
        class="vs-add-btn"
        @click="openAdd"
      >
        ＋ 기록 추가
      </button>
    </div>

    <!-- 지도 -->
    <div class="vs-map-wrap">
      <div
        ref="mapEl"
        class="vs-map"
      />
      <div
        v-if="!hasPins"
        class="vs-map-empty"
      >
        위치가 있는 기록이 없습니다. 기록을 추가하면 지도에 핀으로 표시됩니다.
      </div>
    </div>

    <div
      v-if="loading"
      class="vs-empty"
    >
      불러오는 중…
    </div>
    <div
      v-else-if="items.length === 0"
      class="vs-empty"
    >
      아직 여행 기록이 없습니다. <strong>＋ 기록 추가</strong>로 다녀온 곳을 남겨보세요.
    </div>

    <div
      v-else
      class="vs-grid"
    >
      <div
        v-for="t in items"
        :key="t.id"
        class="vs-card"
        @click="focusPin(t)"
      >
        <div class="vs-card-top">
          <span
            v-if="t.rating"
            class="vs-stars"
          >{{ "★".repeat(t.rating) }}<span class="vs-stars-off">{{ "★".repeat(5 - t.rating) }}</span></span>
          <span
            v-else
            class="vs-stars vs-stars-off"
          >☆</span>
          <div class="vs-actions">
            <button
              class="vs-edit"
              title="수정"
              @click.stop="openEdit(t)"
            >
              ✏️
            </button>
            <button
              class="vs-del"
              title="삭제"
              @click.stop="remove(t)"
            >
              🗑
            </button>
          </div>
        </div>

        <div class="vs-title">
          {{ t.title }}
        </div>
        <div
          v-if="t.country || t.city"
          class="vs-region"
        >
          {{ [t.country, t.city].filter(Boolean).join(" · ") }}
        </div>
        <div
          v-if="t.startDate"
          class="vs-date"
        >
          🗓 {{ dateRange(t) }}
        </div>
        <div
          v-if="t.memo"
          class="vs-memo"
        >
          {{ t.memo }}
        </div>
      </div>
    </div>

    <VisitedModal
      :show="showModal"
      :item="editTarget"
      @close="closeModal"
      @saved="onSaved"
    />
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import axios from "@/axios";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import VisitedModal from "./VisitedModal.vue";

export default {
  name: "VisitedPanel",
  components: { VisitedModal },
  props: { active: { type: Boolean, default: false } },
  setup(props) {
    const items = ref([]);
    const loading = ref(false);
    const showModal = ref(false);
    const editTarget = ref(null);

    const mapEl = ref(null);
    let map = null;
    let markerLayer = null;
    let initialized = false;

    const pinned = computed(() => items.value.filter((t) => t.lat != null && t.lng != null));
    const hasPins = computed(() => pinned.value.length > 0);
    const countryCount = computed(
      () => new Set(items.value.map((t) => t.country).filter(Boolean)).size
    );

    function pinIcon() {
      return L.divIcon({
        className: "vs-pin",
        html: '<div class="vs-pin-dot">📍</div>',
        iconSize: [28, 28],
        iconAnchor: [14, 26],
      });
    }

    function ensureMap() {
      if (map || !mapEl.value) return;
      map = L.map(mapEl.value, { scrollWheelZoom: true, attributionControl: true })
        .setView([20, 130], 2);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: "© OpenStreetMap",
      }).addTo(map);
      markerLayer = L.layerGroup().addTo(map);
    }

    function renderPins() {
      if (!map || !markerLayer) return;
      markerLayer.clearLayers();
      const latlngs = [];
      pinned.value.forEach((t) => {
        const m = L.marker([t.lat, t.lng], { icon: pinIcon() }).addTo(markerLayer);
        const place = [t.country, t.city].filter(Boolean).join(" · ");
        m.bindPopup(
          `<strong>${escapeHtml(t.title)}</strong>` +
            (place ? `<br/><small>${escapeHtml(place)}</small>` : "") +
            (t.startDate ? `<br/><small>🗓 ${escapeHtml(dateRange(t))}</small>` : "")
        );
        latlngs.push([t.lat, t.lng]);
      });
      if (latlngs.length === 1) {
        map.setView(latlngs[0], 6);
      } else if (latlngs.length > 1) {
        map.fitBounds(L.latLngBounds(latlngs).pad(0.2));
      }
    }

    function escapeHtml(s) {
      return String(s || "").replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
      );
    }

    // 출발~도착 표기. 당일(또는 도착 없음)이면 출발일만, 같은 해 다른 날이면 뒤를 MM-DD로 축약
    function dateRange(t) {
      const s = t.startDate;
      const e = t.endDate;
      if (!s) return "";
      if (!e || e === s) return s;
      const endShort = s.slice(0, 4) === e.slice(0, 4) ? e.slice(5) : e;
      return `${s} ~ ${endShort}`;
    }

    function focusPin(t) {
      if (t.lat == null || t.lng == null || !map) return;
      map.setView([t.lat, t.lng], 8, { animate: true });
      window.scrollTo({ top: mapEl.value.offsetTop - 80, behavior: "smooth" });
    }

    async function load() {
      loading.value = true;
      try {
        const res = await axios.get("/api/travel/visited");
        items.value = Array.isArray(res.data) ? res.data : [];
      } catch {
        items.value = [];
      } finally {
        loading.value = false;
        await nextTick();
        ensureMap();
        if (map) {
          map.invalidateSize();
          renderPins();
        }
      }
    }

    function openAdd() {
      editTarget.value = null;
      showModal.value = true;
    }
    function openEdit(t) {
      editTarget.value = t;
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

    async function remove(t) {
      if (!confirm(`'${t.title}' 기록을 삭제할까요?`)) return;
      try {
        await axios.delete(`/api/travel/visited/${t.id}`);
        await load();
      } catch {
        alert("삭제에 실패했습니다.");
      }
    }

    watch(
      () => props.active,
      async (isActive) => {
        if (!isActive) return;
        if (!initialized) {
          initialized = true;
          await load();
        } else {
          await nextTick();
          ensureMap();
          if (map) {
            map.invalidateSize();
            renderPins();
          }
        }
      }
    );

    onMounted(() => {
      if (props.active && !initialized) {
        initialized = true;
        load();
      }
    });

    onBeforeUnmount(() => {
      if (map) {
        map.remove();
        map = null;
      }
    });

    return {
      items, loading, showModal, editTarget, mapEl,
      hasPins, countryCount,
      openAdd, openEdit, closeModal, onSaved, remove, focusPin, dateRange,
    };
  },
};
</script>

<style src="@/assets/css/components/travel/visited-panel.css" scoped></style>

<style src="@/assets/css/components/travel/visited-panel-global.css"></style>
