<template>
  <teleport to="body">
    <div v-if="show" class="tvm-overlay" data-lenis-prevent @click.self="close">
      <div class="tvm-box">
        <div class="tvm-hdr">
          <h3>{{ isEdit ? "여행 기록 수정" : "여행 기록 추가" }}</h3>
          <button class="tvm-close" @click="close">✕</button>
        </div>

        <div class="tvm-row">
          <label>장소명 <span class="tvm-req">*</span></label>
          <input v-model="form.title" type="text" placeholder="예: 도톤보리" />
        </div>

        <!-- 위치 검색 + 지도 -->
        <div class="tvm-row">
          <label>위치 <span class="tvm-opt">(검색하거나 지도를 클릭해 핀 지정)</span></label>
          <div class="tvm-geo">
            <input
              v-model="geoQuery"
              type="text"
              placeholder="지명 검색 (예: 오사카 도톤보리)"
              @keyup.enter="geocode"
            />
            <button type="button" class="tvm-geo-btn" :disabled="geoLoading" @click="geocode">
              {{ geoLoading ? "검색중…" : "검색" }}
            </button>
          </div>
          <ul v-if="geoResults.length" class="tvm-geo-list">
            <li v-for="(r, i) in geoResults" :key="i" @click="pickGeo(r)">{{ r.display_name }}</li>
          </ul>
          <div ref="mapEl" class="tvm-map"></div>
          <div class="tvm-coords">
            <span v-if="form.lat != null && form.lng != null">
              📍 {{ form.lat.toFixed(4) }}, {{ form.lng.toFixed(4) }}
              <button type="button" class="tvm-clear" @click="clearPin">핀 제거</button>
            </span>
            <span v-else class="tvm-opt">핀 미지정 (지도에 표시되지 않음)</span>
          </div>
        </div>

        <div class="tvm-grid2">
          <div class="tvm-row">
            <label>국가 <span class="tvm-opt">(선택)</span></label>
            <input v-model="form.country" type="text" placeholder="예: 일본" />
          </div>
          <div class="tvm-row">
            <label>도시·지역 <span class="tvm-opt">(선택)</span></label>
            <input v-model="form.city" type="text" placeholder="예: 오사카" />
          </div>
        </div>

        <div class="tvm-row">
          <label>여행 기간 <span class="tvm-opt">(날짜를 클릭해 {{ startLabel }}·{{ endLabel }} 선택)</span></label>
          <RangeCalendar v-model="range" :start-label="startLabel" :end-label="endLabel" />
        </div>

        <div class="tvm-row">
          <label>별점 <span class="tvm-opt">(선택)</span></label>
          <div class="tvm-rating">
            <button
              v-for="n in 5"
              :key="n"
              type="button"
              :class="['tvm-star', { on: n <= (form.rating || 0) }]"
              @click="setRating(n)"
            >★</button>
          </div>
        </div>

        <div class="tvm-row">
          <label>메모 <span class="tvm-opt">(선택)</span></label>
          <textarea v-model="form.memo" rows="2" placeholder="기억에 남는 점, 맛집 등"></textarea>
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
import { reactive, ref, computed, watch, onBeforeUnmount, nextTick } from "vue";
import axios from "@/axios";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { lenis } from "@/assets/js/smooth.js";
import RangeCalendar from "./RangeCalendar.vue";

export default {
  name: "VisitedModal",
  components: { RangeCalendar },
  props: {
    show: { type: Boolean, required: true },
    item: { type: Object, default: null },
  },
  emits: ["close", "saved"],
  setup(props, { emit }) {
    const form = reactive({
      title: "", country: "", city: "",
      lat: null, lng: null, startDate: null, endDate: null, rating: null, memo: "",
    });
    const saving = ref(false);
    const errorMsg = ref("");

    // RangeCalendar v-model 바인딩 (form.startDate/endDate와 동기화)
    const range = computed({
      get: () => ({ start: form.startDate, end: form.endDate }),
      set: (v) => {
        form.startDate = v.start;
        form.endDate = v.end;
      },
    });

    const geoQuery = ref("");
    const geoResults = ref([]);
    const geoLoading = ref(false);

    const mapEl = ref(null);
    let map = null;
    let marker = null;

    const isEdit = computed(() => !!props.item);
    const canSubmit = computed(() => form.title.trim().length > 0);

    // 국가가 한국이 아니면 해외로 보고 출국/귀국, 국내(또는 미입력)면 출발/도착
    const DOMESTIC = ["한국", "대한민국", "korea", "south korea", "republic of korea", "kr"];
    const isOverseas = computed(() => {
      const c = (form.country || "").trim().toLowerCase();
      return c.length > 0 && !DOMESTIC.includes(c);
    });
    const startLabel = computed(() => (isOverseas.value ? "출국" : "출발"));
    const endLabel = computed(() => (isOverseas.value ? "귀국" : "도착"));

    function pinIcon() {
      return L.divIcon({
        className: "tvm-pin",
        html: '<div style="font-size:24px;line-height:1">📍</div>',
        iconSize: [28, 28],
        iconAnchor: [14, 26],
      });
    }

    function setMarker(lat, lng, fly) {
      form.lat = lat;
      form.lng = lng;
      if (!map) return;
      if (marker) marker.setLatLng([lat, lng]);
      else marker = L.marker([lat, lng], { icon: pinIcon() }).addTo(map);
      if (fly) map.setView([lat, lng], 7);
    }

    function clearPin() {
      form.lat = null;
      form.lng = null;
      if (marker) {
        marker.remove();
        marker = null;
      }
    }

    function ensureMap() {
      if (map || !mapEl.value) return;
      map = L.map(mapEl.value, { scrollWheelZoom: true }).setView([20, 130], 2);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: "© OpenStreetMap",
      }).addTo(map);
      map.on("click", (e) => setMarker(e.latlng.lat, e.latlng.lng, false));
      if (form.lat != null && form.lng != null) setMarker(form.lat, form.lng, true);
    }

    async function geocode() {
      const q = geoQuery.value.trim();
      if (!q) return;
      geoLoading.value = true;
      geoResults.value = [];
      try {
        // 백엔드 프록시(/api/travel/geocode)를 통해 OSM Nominatim 검색
        const res = await axios.get("/api/travel/geocode", { params: { q } });
        geoResults.value = Array.isArray(res.data) ? res.data : [];
      } catch {
        errorMsg.value = "위치 검색에 실패했습니다.";
      } finally {
        geoLoading.value = false;
      }
    }

    function pickGeo(r) {
      const lat = parseFloat(r.lat);
      const lng = parseFloat(r.lon);
      setMarker(lat, lng, true);
      // 국가/도시 자동 채움 (비어 있을 때만)
      const parts = (r.display_name || "").split(",").map((s) => s.trim());
      if (!form.country && parts.length) form.country = parts[parts.length - 1];
      if (!form.city && parts.length) form.city = parts[0];
      geoResults.value = [];
      geoQuery.value = r.display_name?.split(",")[0] || geoQuery.value;
    }

    function setRating(n) {
      form.rating = form.rating === n ? null : n;
    }

    function resetForm() {
      Object.assign(form, {
        title: "", country: "", city: "",
        lat: null, lng: null, startDate: null, endDate: null, rating: null, memo: "",
      });
      geoQuery.value = "";
      geoResults.value = [];
      errorMsg.value = "";
    }

    function fillFrom(item) {
      Object.assign(form, {
        title: item.title || "",
        country: item.country || "",
        city: item.city || "",
        lat: item.lat ?? null,
        lng: item.lng ?? null,
        startDate: item.startDate || null,
        endDate: item.endDate || null,
        rating: item.rating ?? null,
        memo: item.memo || "",
      });
      geoQuery.value = "";
      geoResults.value = [];
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
        lat: form.lat,
        lng: form.lng,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        rating: form.rating || null,
        memo: form.memo.trim() || null,
      };
      try {
        if (isEdit.value) {
          await axios.put(`/api/travel/visited/${props.item.id}`, payload);
        } else {
          await axios.post("/api/travel/visited", payload);
        }
        emit("saved");
      } catch (e) {
        errorMsg.value =
          e.response?.data?.message || e.response?.data || "저장에 실패했습니다.";
      } finally {
        saving.value = false;
      }
    }

    function destroyMap() {
      if (map) {
        map.remove();
        map = null;
        marker = null;
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
      async (s) => {
        setBgScrollLock(s);
        if (s) {
          if (props.item) fillFrom(props.item);
          else resetForm();
          await nextTick();
          ensureMap();
          if (map) setTimeout(() => map.invalidateSize(), 50);
        } else {
          destroyMap();
        }
      },
      { immediate: true }
    );
    onBeforeUnmount(() => {
      setBgScrollLock(false);
      destroyMap();
    });

    return {
      form, range, saving, errorMsg, isEdit, canSubmit,
      startLabel, endLabel,
      geoQuery, geoResults, geoLoading, mapEl,
      geocode, pickGeo, clearPin, setRating, close, submit,
    };
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
  width: 100%; max-width: 480px;
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

.tvm-geo { display: flex; gap: 6px; }
.tvm-geo input { flex: 1; }
.tvm-geo-btn {
  padding: 8px 14px; border: 1px solid #6366f1; border-radius: 7px;
  background: var(--input-bg); color: #6366f1; font-size: 13px; font-weight: 600;
  cursor: pointer; white-space: nowrap;
}
.tvm-geo-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.tvm-geo-list {
  list-style: none; margin: 6px 0 0; padding: 4px;
  border: 1px solid var(--card-border); border-radius: 8px;
  background: var(--card-bg); max-height: 160px; overflow-y: auto;
}
.tvm-geo-list li {
  padding: 7px 9px; border-radius: 6px; font-size: 12.5px;
  cursor: pointer; color: var(--text-primary);
}
.tvm-geo-list li:hover { background: rgba(99, 102, 241, 0.1); }

.tvm-map {
  width: 100%; height: 220px; margin-top: 8px;
  border: 1px solid var(--card-border); border-radius: 8px; z-index: 0;
}
.tvm-coords { margin-top: 6px; font-size: 12px; color: var(--text-muted); }
.tvm-clear {
  margin-left: 8px; border: none; background: none; cursor: pointer;
  color: #ef4444; font-size: 12px; text-decoration: underline;
}

.tvm-rating { display: flex; gap: 2px; }
.tvm-star {
  border: none; background: none; cursor: pointer; font-size: 22px;
  color: var(--card-border); padding: 0 1px; line-height: 1;
}
.tvm-star.on { color: #f59e0b; }

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
