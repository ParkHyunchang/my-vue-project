<template>
  <teleport to="body">
    <div v-if="show" class="ra-overlay" @click.self="close">
      <div class="ra-box" data-lenis-prevent>
        <div class="ra-hdr">
          <h3>🤖 AI 토지 시황 분석</h3>
          <button class="ra-close" @click="close">✕</button>
        </div>

        <div class="ra-sub">{{ regionName }} · 토지</div>

        <!-- 로딩 -->
        <div v-if="loading" class="ra-loading">
          <div class="ra-spinner"></div>
          <span>토지 실거래 데이터를 모아 AI가 분석 중입니다…</span>
        </div>

        <div v-else-if="resp && resp.noData" class="ra-msg">
          최근 6개월 토지 실거래 내역이 없어 분석할 수 없습니다.
        </div>

        <div v-else-if="errorMsg" class="ra-msg ra-err">{{ errorMsg }}</div>

        <template v-else-if="resp">
          <!-- 결정적 통계 (항상 표시) -->
          <div v-if="resp.stats" class="ra-stats">
            <div class="ra-stat-grid">
              <div class="ra-stat">
                <span class="ra-stat-k">평균 단가</span>
                <span class="ra-stat-v">{{ unit(resp.stats.avgPricePerM2) }}</span>
              </div>
              <div class="ra-stat">
                <span class="ra-stat-k">최저</span>
                <span class="ra-stat-v">{{ unit(resp.stats.minPricePerM2) }}</span>
              </div>
              <div class="ra-stat">
                <span class="ra-stat-k">최고</span>
                <span class="ra-stat-v">{{ unit(resp.stats.maxPricePerM2) }}</span>
              </div>
              <div class="ra-stat">
                <span class="ra-stat-k">거래건수</span>
                <span class="ra-stat-v">{{ resp.stats.totalCount }}건</span>
              </div>
              <div class="ra-stat">
                <span class="ra-stat-k">단가 추세</span>
                <span :class="['ra-stat-v', trendClass(resp.stats.trendLabel)]">
                  {{ resp.stats.trendLabel }} ({{ resp.stats.trendPct > 0 ? '+' : '' }}{{ resp.stats.trendPct }}%)
                </span>
              </div>
            </div>

            <div v-if="resp.stats.zoneBuckets?.length" class="ra-buckets">
              <div class="ra-buckets-title">용도지역별 평균 단가</div>
              <div v-for="b in resp.stats.zoneBuckets" :key="'z-' + b.label" class="ra-bucket">
                <span class="ra-bucket-label">{{ b.label }}</span>
                <span class="ra-bucket-count">{{ b.count }}건</span>
                <span class="ra-bucket-price">{{ unit(b.avgPricePerM2) }}</span>
              </div>
            </div>

            <div v-if="resp.stats.jimokBuckets?.length" class="ra-buckets">
              <div class="ra-buckets-title">지목별 평균 단가</div>
              <div v-for="b in resp.stats.jimokBuckets" :key="'j-' + b.label" class="ra-bucket">
                <span class="ra-bucket-label">{{ b.label }}</span>
                <span class="ra-bucket-count">{{ b.count }}건</span>
                <span class="ra-bucket-price">{{ unit(b.avgPricePerM2) }}</span>
              </div>
            </div>
          </div>

          <!-- AI 분석 차단 -->
          <div v-if="resp.blocked" class="ra-msg ra-warn">
            AI 분석이 일시적으로 제한되었습니다 (요청 한도). 위 통계는 실제 실거래 집계입니다.
            <span v-if="retryText"> {{ retryText }}</span>
          </div>

          <!-- AI 결과 -->
          <div v-else-if="resp.result" class="ra-ai">
            <div class="ra-ai-head">
              <span :class="['ra-trend', trendClass(resp.result.trend)]">{{ resp.result.trend }}</span>
              <span class="ra-headline">{{ resp.result.headline }}</span>
            </div>

            <div v-if="resp.result.priceLevel" class="ra-pricelevel">💰 {{ resp.result.priceLevel }}</div>

            <div v-if="resp.result.keywords?.length" class="ra-chips">
              <span v-for="(k, i) in resp.result.keywords" :key="i" class="ra-chip">#{{ k }}</span>
            </div>

            <div v-if="resp.result.watchPoints?.length" class="ra-section">
              <div class="ra-section-title">⚠️ 토지 매입 검토 시 주의점</div>
              <ul>
                <li v-for="(w, i) in resp.result.watchPoints" :key="i">{{ w }}</li>
              </ul>
            </div>

            <p v-if="resp.result.comment" class="ra-comment">{{ resp.result.comment }}</p>

            <div v-if="resp.sources?.length" class="ra-sources">
              <div class="ra-section-title">📰 참고 뉴스</div>
              <a
                v-for="(n, i) in resp.sources"
                :key="i"
                :href="n.link"
                target="_blank"
                rel="noopener noreferrer"
                class="ra-source-link"
              >{{ n.title }}</a>
            </div>

            <div class="ra-foot">
              분석: {{ resp.providerName }} · {{ resp.model }}
              <span class="ra-disclaimer">· 투자 권유가 아닌 정보 정리입니다</span>
            </div>
          </div>
        </template>
      </div>
    </div>
  </teleport>
</template>

<script>
import { ref, computed, watch, onBeforeUnmount } from "vue";
import axios from "@/axios";
import { lenis } from "@/assets/js/smooth.js";

export default {
  name: "LandAnalysisModal",
  props: {
    show: { type: Boolean, required: true },
    lawdCd: { type: String, default: "" },
    regionName: { type: String, default: "" },
  },
  emits: ["close"],
  setup(props, { emit }) {
    const loading = ref(false);
    const resp = ref(null);
    const errorMsg = ref("");

    const retryText = computed(() => {
      if (!resp.value?.retryAt) return "";
      const d = new Date(resp.value.retryAt);
      if (isNaN(d)) return "";
      return `${d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 이후 재시도 가능`;
    });

    async function analyze() {
      loading.value = true;
      resp.value = null;
      errorMsg.value = "";
      try {
        const res = await axios.post("/api/realestate/land/analyze", { lawdCd: props.lawdCd });
        resp.value = res.data;
      } catch (e) {
        errorMsg.value =
          e.response?.data?.error || e.response?.data || "AI 분석 요청에 실패했습니다.";
      } finally {
        loading.value = false;
      }
    }

    function close() {
      emit("close");
    }

    // 단가(원/㎡) → "약 41만원/평"
    function unit(perM2) {
      if (!perM2) return "-";
      const perPyeong = (perM2 * 3.3058) / 10000;
      return `${perPyeong.toLocaleString(undefined, { maximumFractionDigits: 0 })}만원/평`;
    }

    function trendClass(label) {
      if (label === "상승") return "ra-up";
      if (label === "하락") return "ra-down";
      return "ra-flat";
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
        if (s && props.lawdCd) analyze();
      },
      { immediate: true }
    );
    onBeforeUnmount(() => setBgScrollLock(false));

    return { loading, resp, errorMsg, retryText, close, unit, trendClass };
  },
};
</script>

<style scoped>
.ra-overlay {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 10001;
  padding: 16px;
}
.ra-box {
  width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto;
  background: var(--card-bg, #fff); border-radius: 12px; padding: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
.ra-hdr { display: flex; align-items: center; justify-content: space-between; }
.ra-hdr h3 { margin: 0; font-size: 18px; color: var(--text-primary); }
.ra-close { border: none; background: none; font-size: 18px; cursor: pointer; color: var(--text-muted); }
.ra-sub { font-size: 13px; color: var(--text-muted); margin: 4px 0 16px; }

.ra-loading { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px; color: var(--text-muted); font-size: 14px; }
.ra-spinner {
  width: 28px; height: 28px; border: 3px solid var(--card-border);
  border-top-color: #6366f1; border-radius: 50%; animation: ra-spin 0.8s linear infinite;
}
@keyframes ra-spin { to { transform: rotate(360deg); } }

.ra-msg { padding: 14px; border-radius: 8px; font-size: 13px; color: var(--text-muted); text-align: center; }
.ra-err { background: rgba(239, 68, 68, 0.1); color: #b91c1c; }
.ra-warn { background: rgba(251, 191, 36, 0.12); color: #b45309; text-align: left; margin-top: 14px; }

.ra-stats {
  border: 1px solid var(--card-border); border-radius: 10px;
  padding: 14px; margin-bottom: 14px;
}
.ra-stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.ra-stat { display: flex; flex-direction: column; gap: 2px; }
.ra-stat-k { font-size: 11px; color: var(--text-muted); }
.ra-stat-v { font-size: 15px; font-weight: 700; color: var(--text-primary); }
.ra-up { color: #dc2626; }
.ra-down { color: #2563eb; }
.ra-flat { color: var(--text-muted); }

.ra-buckets { margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--card-border); }
.ra-buckets-title { font-size: 12px; color: var(--text-muted); margin-bottom: 6px; }
.ra-bucket { display: flex; align-items: center; gap: 8px; font-size: 13px; padding: 2px 0; }
.ra-bucket-label { flex: 1; color: var(--text-primary); }
.ra-bucket-count { width: 44px; color: var(--text-muted); font-size: 12px; }
.ra-bucket-price { font-weight: 600; color: #4f46e5; white-space: nowrap; }

.ra-ai { margin-top: 4px; }
.ra-ai-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.ra-trend { font-size: 13px; font-weight: 700; padding: 3px 12px; border-radius: 12px; background: rgba(99,102,241,0.12); }
.ra-headline { font-size: 15px; font-weight: 700; color: var(--text-primary); }
.ra-pricelevel { font-size: 14px; color: var(--text-primary); margin-bottom: 12px; }

.ra-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
.ra-chip { font-size: 12px; padding: 3px 10px; border-radius: 12px; background: rgba(99,102,241,0.1); color: #4f46e5; }

.ra-section { margin-bottom: 14px; }
.ra-section-title { font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; }
.ra-section ul { margin: 0; padding-left: 18px; }
.ra-section li { font-size: 13px; color: var(--text-muted); line-height: 1.6; }

.ra-comment {
  font-size: 14px; line-height: 1.6; color: var(--text-primary);
  background: var(--bg-secondary, rgba(0,0,0,0.03)); padding: 12px; border-radius: 8px; margin: 0 0 14px;
}

.ra-sources { margin-bottom: 14px; }
.ra-source-link {
  display: block; font-size: 13px; color: #4f46e5; text-decoration: none;
  padding: 4px 0; line-height: 1.4;
}
.ra-source-link:hover { text-decoration: underline; }

.ra-foot { font-size: 11px; color: var(--text-muted); border-top: 1px solid var(--card-border); padding-top: 10px; }
.ra-disclaimer { opacity: 0.8; }

@media (max-width: 640px) {
  .ra-box { padding: 16px; }
  .ra-stat-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
