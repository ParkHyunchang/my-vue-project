<template>
  <teleport to="#modal">
    <Modal v-if="show" @close="$emit('close')">
      <template #header>
        <h3 class="pana-title">📊 포트폴리오 AI 진단</h3>
      </template>

      <template #body>
        <!-- 로딩 -->
        <div v-if="loading" class="pana-loading">
          <div class="spinner pana-spinner"></div>
          <div class="pana-loading-text">{{ loadingText }}</div>
          <div class="pana-loading-hint">최대 30초 소요될 수 있습니다.</div>
        </div>

        <!-- 모든 AI 차단됨 -->
        <div v-else-if="blocked" class="pana-blocked">
          <div class="pana-blocked-icon">{{ allDisabled ? '⚙️' : '🔒' }}</div>
          <h4>{{ allDisabled ? 'AI 분석 비활성화' : 'AI 분석 잠시 이용 불가' }}</h4>
          <p>
            <template v-if="allDisabled">
              AI provider API 키가 백엔드에 설정되어 있지 않습니다. 관리자에게 문의해주세요.
            </template>
            <template v-else>
              모든 AI 서비스가 일시 한도 초과 상태입니다.
            </template>
          </p>
          <div v-if="!allDisabled && retryCountdown" class="pana-retry">
            다음 가능: <strong>{{ retryCountdown }}</strong>
          </div>
        </div>

        <!-- 에러 -->
        <div v-else-if="error" class="pana-error">{{ error }}</div>

        <!-- 결과 -->
        <div v-else-if="result" class="pana-result">
          <!-- 1. 종합 요약 -->
          <div class="pana-summary-row">
            <span :class="['pana-sentiment', sentimentCls(result.sentiment)]">
              {{ sentimentIcon(result.sentiment) }} {{ result.sentiment }}
            </span>
            <span class="pana-summary-text">{{ result.summary }}</span>
          </div>

          <!-- 2. 보유 종목 시그널 -->
          <section class="pana-section">
            <h4 class="pana-section-title">🔍 보유 종목 점검</h4>
            <div v-if="!result.holdings?.length" class="pana-empty-mini">
              보유 종목이 없습니다.
            </div>
            <div v-else class="pana-holdings">
              <div
                v-for="h in result.holdings"
                :key="h.symbol"
                :class="['pana-holding-card', actionCls(h.action)]"
              >
                <div class="pana-holding-head">
                  <div class="pana-holding-name-wrap">
                    <span class="pana-flag">{{ h.market === 'KR' ? '🇰🇷' : '🇺🇸' }}</span>
                    <div>
                      <div class="pana-holding-name">{{ h.name }}</div>
                      <div class="pana-holding-sym">{{ h.symbol }}</div>
                    </div>
                  </div>
                  <div class="pana-holding-right">
                    <span :class="['pana-action-pill', actionCls(h.action)]">
                      {{ actionIcon(h.action) }} {{ actionLabel(h.action) }}
                    </span>
                    <span v-if="h.currentPnlPct !== null && h.currentPnlPct !== undefined"
                          :class="['pana-pnl', pnlCls(h.currentPnlPct)]">
                      {{ fmtPnl(h.currentPnlPct) }}
                    </span>
                  </div>
                </div>
                <div class="pana-holding-reason">{{ h.reason }}</div>
                <div v-if="h.newsHint" class="pana-holding-news">
                  📰 {{ h.newsHint }}
                </div>
              </div>
            </div>
          </section>

          <!-- 3. 추천 종목 -->
          <section v-if="result.recommendations?.length" class="pana-section">
            <h4 class="pana-section-title">💡 추천 종목</h4>
            <div class="pana-recs">
              <div
                v-for="(r, idx) in result.recommendations"
                :key="r.symbol + idx"
                class="pana-rec-card"
              >
                <div class="pana-rec-head">
                  <div>
                    <div class="pana-rec-name">
                      <span class="pana-flag">{{ r.market === 'KR' ? '🇰🇷' : '🇺🇸' }}</span>
                      {{ r.name }}
                      <span class="pana-rec-sym">{{ r.symbol }}</span>
                    </div>
                  </div>
                  <span :class="['pana-rec-source', r.source === 'TOP10' ? 'src-top10' : 'src-free']">
                    {{ r.source === 'TOP10' ? '시총 Top10' : 'AI 자유 추천' }}
                  </span>
                </div>
                <div class="pana-rec-row">
                  <span class="pana-rec-label">추천 이유</span>
                  <span class="pana-rec-text">{{ r.reason }}</span>
                </div>
                <div v-if="r.risks" class="pana-rec-row">
                  <span class="pana-rec-label">리스크</span>
                  <span class="pana-rec-text">{{ r.risks }}</span>
                </div>
                <div v-if="r.fitForPortfolio" class="pana-rec-row">
                  <span class="pana-rec-label">포트폴리오 적합도</span>
                  <span class="pana-rec-text">{{ r.fitForPortfolio }}</span>
                </div>
                <div v-if="r.source === 'FREE'" class="pana-rec-warn">
                  ⚠️ AI 자유 추천 종목은 실재성·정확성이 검증되지 않을 수 있습니다.
                </div>
              </div>
            </div>
          </section>

          <!-- 4. 메타 + 디스클레이머 -->
          <div class="pana-meta">
            <span class="pana-provider-tag">{{ providerName }}<span v-if="model"> · {{ model }}</span></span>
            <span v-if="analyzedAt" class="pana-time">{{ formatTime(analyzedAt) }}</span>
          </div>
          <div class="pana-disclaimer">
            ⚠️ {{ result.disclaimer || '본 분석은 AI가 생성한 정보 정리이며 투자 자문이 아닙니다.' }}
          </div>
        </div>
      </template>

      <template #footer>
        <div class="pana-footer-btns">
          <button
            type="button"
            class="btn btn-primary"
            :disabled="loading || cooldownSec > 0"
            @click="fetchAnalysis"
          >
            <template v-if="loading">분석 중...</template>
            <template v-else-if="cooldownSec > 0">{{ cooldownSec }}초 후 가능</template>
            <template v-else>다시 진단</template>
          </button>
          <button type="button" class="btn btn-primary" @click="$emit('close')">닫기</button>
        </div>
      </template>
    </Modal>
  </teleport>
</template>

<script>
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import axios from '@/axios';
import Modal from '@/components/Modal.vue';
import { apiErrorMessage } from '@/utils/apiError';
import { logger } from '@/utils/logger';

export default {
  name: 'PortfolioAnalysisModal',
  components: { Modal },
  props: {
    show: { type: Boolean, required: true },
  },
  emits: ['close'],
  setup(props) {
    const loading = ref(false);
    const error = ref('');
    const blocked = ref(false);
    const result = ref(null);
    const providerName = ref('');
    const model = ref('');
    const analyzedAt = ref(null);
    const retryAt = ref(null);
    const providersStatus = ref([]);

    const loadingMessages = [
      '보유 종목 시세를 확인하는 중...',
      '시총 Top10·시장 뉴스를 모으는 중...',
      'AI 가 포트폴리오를 분석하는 중...',
    ];
    const loadingMsgIdx = ref(0);
    let loadingTimer = null;
    let tickerTimer = null;
    const now = ref(Date.now());
    const lastFetchAt = ref(0);

    const loadingText = computed(() => loadingMessages[loadingMsgIdx.value]);

    function reset() {
      loading.value = false;
      error.value = '';
      blocked.value = false;
      result.value = null;
      providerName.value = '';
      model.value = '';
      analyzedAt.value = null;
      retryAt.value = null;
      providersStatus.value = [];
    }

    async function fetchAnalysis() {
      reset();
      loading.value = true;
      loadingMsgIdx.value = 0;
      clearInterval(loadingTimer);
      loadingTimer = setInterval(() => {
        loadingMsgIdx.value = (loadingMsgIdx.value + 1) % loadingMessages.length;
      }, 3500);

      try {
        const res = await axios.post('/api/portfolio/analyze');
        const data = res.data || {};
        if (data.blocked) {
          blocked.value = true;
          retryAt.value = data.retryAt ? new Date(data.retryAt) : null;
          providersStatus.value = data.providersStatus || [];
        } else {
          result.value = data;
          providerName.value = data.providerName || '';
          model.value = data.model || '';
          analyzedAt.value = data.analyzedAt ? new Date(data.analyzedAt) : new Date();
          providersStatus.value = data.providersStatus || [];
        }
      } catch (err) {
        logger.error('포트폴리오 AI 진단 실패:', err);
        error.value = apiErrorMessage(err, '포트폴리오 분석 중 오류가 발생했습니다.');
      } finally {
        loading.value = false;
        clearInterval(loadingTimer);
        loadingTimer = null;
        lastFetchAt.value = Date.now();
      }
    }

    // 모달이 열릴 때 자동 분석
    watch(
      () => props.show,
      (showVal, prevShow) => {
        if (showVal && !prevShow) fetchAnalysis();
      },
    );

    // 모달이 열려있는 동안 1초 ticker
    watch(
      () => props.show,
      (show) => {
        clearInterval(tickerTimer);
        if (show) {
          now.value = Date.now();
          tickerTimer = setInterval(() => { now.value = Date.now(); }, 1000);
        }
      },
      { immediate: true },
    );

    const retryCountdown = computed(() => {
      if (!retryAt.value) return null;
      const diff = retryAt.value.getTime() - now.value;
      if (diff <= 0) return '곧 가능';
      const totalSec = Math.floor(diff / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      if (h > 0) return `${h}시간 ${String(m).padStart(2, '0')}분`;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    });

    const cooldownSec = computed(() => {
      if (!lastFetchAt.value) return 0;
      const elapsed = Math.floor((now.value - lastFetchAt.value) / 1000);
      return Math.max(0, 30 - elapsed);
    });

    const allDisabled = computed(() =>
      providersStatus.value.length > 0 &&
      providersStatus.value.every((ps) => !ps.enabled),
    );

    onBeforeUnmount(() => {
      clearInterval(loadingTimer);
      clearInterval(tickerTimer);
    });

    function sentimentCls(s) {
      if (s === '긍정') return 'sentiment-positive';
      if (s === '부정') return 'sentiment-negative';
      return 'sentiment-neutral';
    }
    function sentimentIcon(s) {
      if (s === '긍정') return '😊';
      if (s === '부정') return '😟';
      return '😐';
    }
    function actionLabel(a) {
      return {
        TAKE_PROFIT: '이익실현',
        HOLD: '보유',
        CUT_LOSS: '손절 검토',
        WATCH: '관망',
      }[a] || '보유';
    }
    function actionIcon(a) {
      return {
        TAKE_PROFIT: '💰',
        HOLD: '✋',
        CUT_LOSS: '🚪',
        WATCH: '👀',
      }[a] || '✋';
    }
    function actionCls(a) {
      return ('act-' + (a || 'HOLD').toLowerCase()).replace('_', '-');
    }
    function pnlCls(v) {
      if (v === null || v === undefined) return '';
      if (v > 0) return 'pnl-pos';
      if (v < 0) return 'pnl-neg';
      return '';
    }
    function fmtPnl(v) {
      if (v === null || v === undefined) return '';
      return (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
    }
    function formatTime(d) {
      if (!d) return '';
      return d.toLocaleString('ko-KR', {
        month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    }

    return {
      loading, error, blocked, result,
      providerName, model, analyzedAt,
      retryCountdown, cooldownSec, allDisabled,
      loadingText,
      fetchAnalysis,
      sentimentCls, sentimentIcon,
      actionLabel, actionIcon, actionCls,
      pnlCls, fmtPnl, formatTime,
    };
  },
};
</script>

<style scoped>
.pana-title { margin: 0; color: var(--text-primary); }

/* 로딩 */
.pana-loading {
  padding: 32px 12px;
  text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
}
.pana-spinner {
  width: 32px; height: 32px;
  border: 3px solid var(--card-border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: pana-spin 0.8s linear infinite;
}
@keyframes pana-spin { to { transform: rotate(360deg); } }
.pana-loading-text { color: var(--text-secondary); font-size: 14px; }
.pana-loading-hint { color: var(--text-muted); font-size: 12px; }

/* 차단 */
.pana-blocked {
  text-align: center;
  padding: 24px 12px;
  display: flex; flex-direction: column; gap: 10px;
}
.pana-blocked-icon { font-size: 2rem; }
.pana-blocked h4 { margin: 0; color: var(--text-primary); font-size: 1rem; }
.pana-blocked p { margin: 0; color: var(--text-secondary); font-size: 13px; }
.pana-retry {
  margin-top: 4px;
  padding: 8px 14px;
  background: var(--card-bg-hover);
  border-radius: 8px;
  display: inline-block;
  align-self: center;
  color: var(--text-primary);
  font-size: 13px;
}
.pana-retry strong { color: var(--accent); }

.pana-error {
  padding: 16px;
  background: var(--danger-bg);
  border: 1px solid var(--danger-color);
  color: var(--danger-color);
  border-radius: 8px;
  font-size: 13px;
}

/* 결과 */
.pana-result { display: flex; flex-direction: column; gap: 18px; }

.pana-summary-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 12px 14px;
  background: var(--card-bg-hover);
  border-left: 3px solid var(--accent);
  border-radius: 6px;
}
.pana-sentiment {
  font-size: 13px;
  padding: 4px 12px;
  border-radius: 999px;
  font-weight: 700;
  white-space: nowrap;
}
.pana-sentiment.sentiment-positive { background: rgba(106, 173, 106, 0.18); color: #8fce8f; }
.pana-sentiment.sentiment-negative { background: rgba(196, 90, 90, 0.22);   color: #e89a9a; }
.pana-sentiment.sentiment-neutral  { background: rgba(125, 175, 240, 0.15); color: #a8c8f0; }
.pana-summary-text { color: var(--text-primary); font-weight: 600; font-size: 14px; }

.pana-section { display: flex; flex-direction: column; gap: 8px; }
.pana-section-title {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 700;
  letter-spacing: 0.02em;
}
.pana-empty-mini { font-size: 12px; color: var(--text-muted); padding: 8px 0; }

/* 보유 종목 카드 */
.pana-holdings { display: flex; flex-direction: column; gap: 8px; }
.pana-holding-card {
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--card-bg-hover);
  border-left: 3px solid var(--card-border);
}
.pana-holding-card.act-take-profit { border-left-color: #8fce8f; }
.pana-holding-card.act-hold        { border-left-color: #a8c8f0; }
.pana-holding-card.act-cut-loss    { border-left-color: #e89a9a; }
.pana-holding-card.act-watch       { border-left-color: var(--accent); }

.pana-holding-head {
  display: flex; justify-content: space-between; align-items: flex-start;
  gap: 10px; flex-wrap: wrap;
}
.pana-holding-name-wrap {
  display: flex; gap: 8px; align-items: center;
}
.pana-flag { font-size: 1.1rem; }
.pana-holding-name { font-weight: 700; color: var(--text-primary); font-size: 14px; }
.pana-holding-sym  { font-size: 11px; color: var(--text-muted); }
.pana-holding-right {
  display: flex; flex-direction: column; align-items: flex-end; gap: 4px;
}

.pana-action-pill {
  font-size: 11px; padding: 2px 8px; border-radius: 999px; font-weight: 600;
  white-space: nowrap;
}
.pana-action-pill.act-take-profit { background: rgba(106, 173, 106, 0.22); color: #8fce8f; }
.pana-action-pill.act-hold        { background: rgba(125, 175, 240, 0.18); color: #a8c8f0; }
.pana-action-pill.act-cut-loss    { background: rgba(196, 90, 90, 0.25);   color: #e89a9a; }
.pana-action-pill.act-watch       { background: var(--accent-dim);          color: var(--accent-light); }

.pana-pnl {
  font-size: 12px; font-weight: 700;
}
.pana-pnl.pnl-pos { color: #8fce8f; }
.pana-pnl.pnl-neg { color: #e89a9a; }

.pana-holding-reason {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.5;
}
.pana-holding-news {
  margin-top: 6px;
  font-size: 11px;
  color: var(--text-muted);
  font-style: italic;
}

/* 추천 종목 */
.pana-recs { display: flex; flex-direction: column; gap: 10px; }
.pana-rec-card {
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--card-bg-hover);
  border: 1px solid var(--card-border);
}
.pana-rec-head {
  display: flex; justify-content: space-between; align-items: center;
  gap: 10px; margin-bottom: 8px; flex-wrap: wrap;
}
.pana-rec-name {
  font-weight: 700; color: var(--text-primary); font-size: 14px;
  display: inline-flex; align-items: center; gap: 6px;
}
.pana-rec-sym { font-size: 11px; color: var(--text-muted); font-weight: 500; }
.pana-rec-source {
  font-size: 10px; padding: 2px 8px; border-radius: 999px; font-weight: 600;
}
.pana-rec-source.src-top10 { background: rgba(125, 175, 240, 0.18); color: #a8c8f0; }
.pana-rec-source.src-free  { background: var(--accent-dim);         color: var(--accent-light); }

.pana-rec-row {
  display: flex; gap: 8px; font-size: 12px; margin-top: 4px;
  color: var(--text-secondary); line-height: 1.5;
}
.pana-rec-label {
  flex-shrink: 0; color: var(--text-muted); font-weight: 600;
  min-width: 90px;
}
.pana-rec-text { flex: 1; }
.pana-rec-warn {
  margin-top: 8px;
  font-size: 11px;
  color: var(--text-muted);
  font-style: italic;
  border-top: 1px dashed var(--card-border);
  padding-top: 6px;
}

/* 메타 / 디스클레이머 */
.pana-meta {
  display: flex; justify-content: space-between;
  font-size: 11px; color: var(--text-muted);
  border-top: 1px solid var(--card-border);
  padding-top: 8px;
}
.pana-provider-tag { font-weight: 600; }
.pana-disclaimer {
  font-size: 11px; color: var(--text-muted);
  text-align: center; font-style: italic;
}

.pana-footer-btns { display: flex; gap: 8px; justify-content: flex-end; }

@media (max-width: 640px) {
  .pana-rec-row { flex-direction: column; gap: 2px; }
  .pana-rec-label { min-width: 0; }
  .pana-meta { flex-direction: column; gap: 2px; }
  .pana-footer-btns { flex-direction: column-reverse; }
  .pana-footer-btns .btn { width: 100%; }
}
</style>
