<template>
  <teleport to="body">
    <div v-if="show" class="ra-overlay" @click.self="close">
      <div class="ra-box" data-lenis-prevent>
        <div class="ra-hdr">
          <h3>🤖 AI 시황 분석</h3>
          <button class="ra-close" @click="close">✕</button>
        </div>

        <div class="ra-sub">{{ regionName }} · {{ dealLabel }}</div>

        <!-- 로딩 -->
        <div v-if="loading" class="ra-loading">
          <div class="ra-spinner"></div>
          <span>실거래 데이터를 모아 AI가 분석 중입니다…</span>
        </div>

        <!-- 데이터 없음 -->
        <div v-else-if="resp && resp.noData" class="ra-msg">
          최근 6개월 실거래 내역이 없어 분석할 수 없습니다.
        </div>

        <!-- 오류 -->
        <div v-else-if="errorMsg" class="ra-msg ra-err">{{ errorMsg }}</div>

        <template v-else-if="resp">
          <!-- 결정적 통계 (항상 표시) -->
          <div v-if="resp.stats" class="ra-stats">
            <div class="ra-stat-grid">
              <div class="ra-stat">
                <span class="ra-stat-k">평균</span>
                <span class="ra-stat-v">{{ money(resp.stats.avgPrice) }}</span>
              </div>
              <div class="ra-stat">
                <span class="ra-stat-k">최저</span>
                <span class="ra-stat-v">{{ money(resp.stats.minPrice) }}</span>
              </div>
              <div class="ra-stat">
                <span class="ra-stat-k">최고</span>
                <span class="ra-stat-v">{{ money(resp.stats.maxPrice) }}</span>
              </div>
              <div class="ra-stat">
                <span class="ra-stat-k">거래건수</span>
                <span class="ra-stat-v">{{ resp.stats.totalCount }}건</span>
              </div>
              <div class="ra-stat">
                <span class="ra-stat-k">추세</span>
                <span :class="['ra-stat-v', trendClass(resp.stats.trendLabel)]">
                  {{ resp.stats.trendLabel }} ({{ resp.stats.trendPct > 0 ? '+' : '' }}{{ resp.stats.trendPct }}%)
                </span>
              </div>
              <div v-if="dealType === 'MONTHLY' && resp.stats.avgMonthlyRent" class="ra-stat">
                <span class="ra-stat-k">평균 월세</span>
                <span class="ra-stat-v">{{ resp.stats.avgMonthlyRent }}만원</span>
              </div>
            </div>

            <div v-if="resp.stats.areaBuckets?.length" class="ra-buckets">
              <div class="ra-buckets-title">평형(전용면적)별 평균</div>
              <div v-for="b in resp.stats.areaBuckets" :key="b.label" class="ra-bucket">
                <span class="ra-bucket-label">{{ b.label }}</span>
                <span class="ra-bucket-count">{{ b.count }}건</span>
                <span class="ra-bucket-price">{{ money(b.avgPrice) }}</span>
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

            <div v-if="resp.result.priceLevel" class="ra-pricelevel">
              💰 {{ resp.result.priceLevel }}
            </div>

            <div v-if="resp.result.keywords?.length" class="ra-chips">
              <span v-for="(k, i) in resp.result.keywords" :key="i" class="ra-chip">#{{ k }}</span>
            </div>

            <div v-if="resp.result.watchPoints?.length" class="ra-section">
              <div class="ra-section-title">⚠️ 매수 검토 시 주의점</div>
              <ul>
                <li v-for="(w, i) in resp.result.watchPoints" :key="i">{{ w }}</li>
              </ul>
            </div>

            <p v-if="resp.result.comment" class="ra-comment">{{ resp.result.comment }}</p>

            <!-- 참고 뉴스 -->
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
  name: "RealEstateAnalysisModal",
  props: {
    show: { type: Boolean, required: true },
    lawdCd: { type: String, default: "" },
    dealType: { type: String, default: "SALE" },
    regionName: { type: String, default: "" },
  },
  emits: ["close"],
  setup(props, { emit }) {
    const loading = ref(false);
    const resp = ref(null);
    const errorMsg = ref("");

    const dealLabel = computed(
      () => ({ SALE: "매매", JEONSE: "전세", MONTHLY: "월세" }[props.dealType] || props.dealType)
    );

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
        const res = await axios.post("/api/realestate/analyze", {
          lawdCd: props.lawdCd,
          dealType: props.dealType,
        });
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

    function money(manwon) {
      if (!manwon) return "-";
      const eok = Math.floor(manwon / 10000);
      const rest = manwon % 10000;
      let out = "";
      if (eok > 0) out += `${eok}억`;
      if (rest > 0) out += `${eok > 0 ? " " : ""}${rest.toLocaleString()}만`;
      return out || `${manwon}만`;
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

    return { loading, resp, errorMsg, dealLabel, retryText, close, money, trendClass };
  },
};
</script>

<style src="@/assets/css/components/realestate/analysis-modal.css" scoped></style>
