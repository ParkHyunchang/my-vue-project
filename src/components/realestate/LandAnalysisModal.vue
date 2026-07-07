<template>
  <teleport to="body">
    <div
      v-if="show"
      class="ra-overlay"
      @click.self="close"
    >
      <div
        class="ra-box"
        data-lenis-prevent
      >
        <div class="ra-hdr">
          <h3>🤖 AI 토지 시황 분석</h3>
          <button
            class="ra-close"
            @click="close"
          >
            ✕
          </button>
        </div>

        <div class="ra-sub">
          {{ regionName }} · 토지
        </div>

        <!-- 로딩 -->
        <div
          v-if="loading"
          class="ra-loading"
        >
          <div class="ra-spinner" />
          <span>토지 실거래 데이터를 모아 AI가 분석 중입니다…</span>
        </div>

        <div
          v-else-if="resp && resp.noData"
          class="ra-msg"
        >
          최근 6개월 토지 실거래 내역이 없어 분석할 수 없습니다.
        </div>

        <div
          v-else-if="errorMsg"
          class="ra-msg ra-err"
        >
          {{ errorMsg }}
        </div>

        <template v-else-if="resp">
          <!-- 결정적 통계 (항상 표시) -->
          <div
            v-if="resp.stats"
            class="ra-stats"
          >
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

            <div
              v-if="resp.stats.zoneBuckets?.length"
              class="ra-buckets"
            >
              <div class="ra-buckets-title">
                용도지역별 평균 단가
              </div>
              <div
                v-for="b in resp.stats.zoneBuckets"
                :key="'z-' + b.label"
                class="ra-bucket"
              >
                <span class="ra-bucket-label">{{ b.label }}</span>
                <span class="ra-bucket-count">{{ b.count }}건</span>
                <span class="ra-bucket-price">{{ unit(b.avgPricePerM2) }}</span>
              </div>
            </div>

            <div
              v-if="resp.stats.jimokBuckets?.length"
              class="ra-buckets"
            >
              <div class="ra-buckets-title">
                지목별 평균 단가
              </div>
              <div
                v-for="b in resp.stats.jimokBuckets"
                :key="'j-' + b.label"
                class="ra-bucket"
              >
                <span class="ra-bucket-label">{{ b.label }}</span>
                <span class="ra-bucket-count">{{ b.count }}건</span>
                <span class="ra-bucket-price">{{ unit(b.avgPricePerM2) }}</span>
              </div>
            </div>
          </div>

          <!-- AI 분석 차단 -->
          <div
            v-if="resp.blocked"
            class="ra-msg ra-warn"
          >
            AI 분석이 일시적으로 제한되었습니다 (요청 한도). 위 통계는 실제 실거래 집계입니다.
            <span v-if="retryText"> {{ retryText }}</span>
          </div>

          <!-- AI 결과 -->
          <div
            v-else-if="resp.result"
            class="ra-ai"
          >
            <div class="ra-ai-head">
              <span :class="['ra-trend', trendClass(resp.result.trend)]">{{ resp.result.trend }}</span>
              <span class="ra-headline">{{ resp.result.headline }}</span>
            </div>

            <div
              v-if="resp.result.priceLevel"
              class="ra-pricelevel"
            >
              💰 {{ resp.result.priceLevel }}
            </div>

            <div
              v-if="resp.result.keywords?.length"
              class="ra-chips"
            >
              <span
                v-for="(k, i) in resp.result.keywords"
                :key="i"
                class="ra-chip"
              >#{{ k }}</span>
            </div>

            <div
              v-if="resp.result.watchPoints?.length"
              class="ra-section"
            >
              <div class="ra-section-title">
                ⚠️ 토지 매입 검토 시 주의점
              </div>
              <ul>
                <li
                  v-for="(w, i) in resp.result.watchPoints"
                  :key="i"
                >
                  {{ w }}
                </li>
              </ul>
            </div>

            <p
              v-if="resp.result.comment"
              class="ra-comment"
            >
              {{ resp.result.comment }}
            </p>

            <div
              v-if="resp.sources?.length"
              class="ra-sources"
            >
              <div class="ra-section-title">
                📰 참고 뉴스
              </div>
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

<style src="@/assets/css/components/realestate/land-analysis-modal.css" scoped></style>
