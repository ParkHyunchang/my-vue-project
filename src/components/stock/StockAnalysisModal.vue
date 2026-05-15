<template>
  <teleport to="#modal">
    <Modal v-if="show" @close="$emit('close')">
      <template #header>
        <div class="ana-modal-title">
          <span class="ana-flag">{{ holding?.market === 'KR' ? '🇰🇷' : '🇺🇸' }}</span>
          <div>
            <div class="ana-name">{{ holding?.name }}</div>
            <div class="ana-sym">{{ holding?.symbol }} · ✨ AI 분석</div>
          </div>
        </div>
      </template>

      <template #body>
        <!-- 로딩 -->
        <div v-if="loading" class="ana-loading">
          <div class="spinner ana-spinner"></div>
          <div class="ana-loading-text">{{ loadingText }}</div>
          <div class="ana-loading-hint">최대 30초 소요될 수 있습니다.</div>
        </div>

        <!-- 모든 AI 차단됨 -->
        <div v-else-if="blocked" class="ana-blocked">
          <div class="ana-blocked-icon">{{ allDisabled ? '⚙️' : '🔒' }}</div>
          <h4 class="ana-blocked-title">
            {{ allDisabled ? 'AI 분석 비활성화' : 'AI 분석 잠시 이용 불가' }}
          </h4>
          <p class="ana-blocked-desc">
            <template v-if="allDisabled">
              AI provider API 키가 백엔드에 설정되어 있지 않습니다. 관리자에게 문의해주세요.
            </template>
            <template v-else>
              모든 AI 서비스가 일시 한도 초과 상태입니다.
            </template>
          </p>
          <div v-if="!allDisabled && retryCountdown" class="ana-retry-time">
            다음 가능: <strong>{{ retryCountdown }}</strong>
          </div>
          <div v-if="providersStatus?.length" class="ana-providers">
            <div v-for="ps in providersStatus" :key="ps.name" class="ana-provider-row">
              <span class="ana-provider-name">{{ ps.name }}</span>
              <span :class="['ana-provider-pill', providerStatusCls(ps)]">
                {{ providerStatusLabel(ps) }}
              </span>
            </div>
          </div>
        </div>

        <!-- 에러 -->
        <div v-else-if="error" class="ana-error">
          {{ error }}
        </div>

        <!-- 결과 -->
        <div v-else-if="result" class="ana-result">
          <div class="ana-headline-row">
            <span :class="['ana-sentiment', sentimentCls(result.sentiment)]">
              {{ sentimentIcon(result.sentiment) }} {{ result.sentiment }}
            </span>
            <span class="ana-headline">{{ result.headline }}</span>
          </div>

          <div v-if="result.keywords?.length" class="ana-keywords">
            <span v-for="k in result.keywords" :key="k" class="ana-kw-chip"># {{ k }}</span>
          </div>

          <div class="ana-split">
            <div class="ana-half ana-positives">
              <h5>✅ 호재</h5>
              <ul v-if="result.positives?.length">
                <li v-for="p in result.positives" :key="p">{{ p }}</li>
              </ul>
              <p v-else class="ana-empty-mini">언급된 호재 없음</p>
            </div>
            <div class="ana-half ana-risks">
              <h5>⚠️ 리스크</h5>
              <ul v-if="result.risks?.length">
                <li v-for="r in result.risks" :key="r">{{ r }}</li>
              </ul>
              <p v-else class="ana-empty-mini">언급된 리스크 없음</p>
            </div>
          </div>

          <div v-if="result.comment" class="ana-comment">{{ result.comment }}</div>

          <div v-if="sources?.length" class="ana-sources">
            <div class="ana-sources-title">참고 뉴스</div>
            <ul class="ana-sources-list">
              <li v-for="(s, i) in sources" :key="i">
                <a :href="s.link" target="_blank" rel="noopener noreferrer">{{ s.title }}</a>
              </li>
            </ul>
          </div>

          <div class="ana-meta">
            <span class="ana-provider-tag">{{ providerName }}<span v-if="model"> · {{ model }}</span></span>
            <span v-if="analyzedAt" class="ana-time">{{ formatTime(analyzedAt) }}</span>
          </div>

          <div class="ana-disclaimer">
            ⚠️ 본 분석은 AI가 생성한 정보 정리이며 투자 자문이 아닙니다.
          </div>
        </div>

        <!-- 초기 (show 직후) -->
        <div v-else class="ana-empty">분석을 준비 중입니다...</div>
      </template>

      <template #footer>
        <div class="ana-footer-btns">
          <button
            type="button"
            class="btn btn-primary"
            :disabled="loading || cooldownSec > 0"
            @click="fetchAnalysis"
          >
            <template v-if="loading">분석 중...</template>
            <template v-else-if="cooldownSec > 0">{{ cooldownSec }}초 후 가능</template>
            <template v-else>다시 분석</template>
          </button>
          <button type="button" class="btn btn-primary" @click="$emit('close')">
            닫기
          </button>
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
  name: 'StockAnalysisModal',
  components: { Modal },
  props: {
    show: { type: Boolean, required: true },
    holding: { type: Object, default: null }, // { name, symbol, market, ... }
  },
  emits: ['close', 'analyzed'],
  setup(props, { emit }) {
    const loading = ref(false);
    const error = ref('');
    const blocked = ref(false);
    const result = ref(null);
    const sources = ref([]);
    const providerName = ref('');
    const model = ref('');
    const analyzedAt = ref(null);
    const retryAt = ref(null);
    const providersStatus = ref([]);

    const loadingMessages = [
      '최신 뉴스를 수집하는 중...',
      '시세를 확인하는 중...',
      'AI 가 분석하는 중...',
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
      sources.value = [];
      providerName.value = '';
      model.value = '';
      analyzedAt.value = null;
      retryAt.value = null;
      providersStatus.value = [];
    }

    async function fetchAnalysis() {
      if (!props.holding) return;
      reset();
      loading.value = true;
      loadingMsgIdx.value = 0;
      clearInterval(loadingTimer);
      loadingTimer = setInterval(() => {
        loadingMsgIdx.value = (loadingMsgIdx.value + 1) % loadingMessages.length;
      }, 3500);

      try {
        const res = await axios.post('/api/stock/analyze', {
          symbol: props.holding.symbol,
          market: props.holding.market,
        });
        const data = res.data || {};
        if (data.blocked) {
          blocked.value = true;
          retryAt.value = data.retryAt ? new Date(data.retryAt) : null;
          providersStatus.value = data.providersStatus || [];
        } else {
          result.value = data.result || null;
          sources.value = data.sources || [];
          providerName.value = data.providerName || '';
          model.value = data.model || '';
          analyzedAt.value = data.analyzedAt ? new Date(data.analyzedAt) : new Date();
          providersStatus.value = data.providersStatus || [];
          emit('analyzed');
        }
      } catch (err) {
        logger.error('AI 분석 실패:', err);
        error.value = apiErrorMessage(err, 'AI 분석 중 오류가 발생했습니다.');
      } finally {
        loading.value = false;
        clearInterval(loadingTimer);
        loadingTimer = null;
        lastFetchAt.value = Date.now();
      }
    }

    // 모달이 열릴 때 / 종목이 바뀔 때 자동 분석
    watch(
      () => [props.show, props.holding?.symbol],
      ([showVal, symbol], [prevShow]) => {
        if (showVal && symbol && (!prevShow || prevShow !== showVal)) {
          fetchAnalysis();
        }
      },
    );

    // 모달이 열려있는 동안 1초 ticker (다음 가능 시각 카운트다운 + 쿨다운 양쪽에 사용)
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

    // 분당 한도 보호용 30초 쿨다운 (다시 분석 버튼만 적용)
    const cooldownSec = computed(() => {
      if (!lastFetchAt.value) return 0;
      const elapsed = Math.floor((now.value - lastFetchAt.value) / 1000);
      return Math.max(0, 30 - elapsed);
    });

    // provider 모두 미설정 상태 (한도 초과와 구분)
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
    function formatTime(date) {
      if (!date) return '';
      return date.toLocaleString('ko-KR', {
        month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    }
    function providerStatusLabel(ps) {
      if (!ps.enabled) return '미설정';
      if (ps.blocked) return '한도 초과';
      return '정상';
    }
    function providerStatusCls(ps) {
      if (!ps.enabled) return 'ps-disabled';
      if (ps.blocked) return 'ps-blocked';
      return 'ps-ok';
    }

    return {
      loading, error, blocked, result, sources,
      providerName, model, analyzedAt,
      providersStatus, retryCountdown, cooldownSec, allDisabled,
      loadingText,
      fetchAnalysis,
      sentimentCls, sentimentIcon,
      formatTime,
      providerStatusLabel, providerStatusCls,
    };
  },
};
</script>

<style scoped>
.ana-modal-title { display: flex; align-items: center; gap: 10px; }
.ana-flag { font-size: 1.3rem; }
.ana-name { font-weight: 700; color: var(--text-primary); font-size: 1rem; }
.ana-sym { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

/* ── 로딩 ── */
.ana-loading {
  padding: 32px 12px;
  text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
}
.ana-spinner {
  width: 32px; height: 32px;
  border: 3px solid var(--card-border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: ana-spin 0.8s linear infinite;
}
@keyframes ana-spin { to { transform: rotate(360deg); } }
.ana-loading-text { color: var(--text-secondary); font-size: 14px; }
.ana-loading-hint { color: var(--text-muted); font-size: 12px; }

/* ── 차단됨 ── */
.ana-blocked {
  text-align: center;
  padding: 24px 12px;
  display: flex; flex-direction: column; gap: 10px;
}
.ana-blocked-icon { font-size: 2rem; }
.ana-blocked-title { margin: 0; color: var(--text-primary); font-size: 1rem; }
.ana-blocked-desc { margin: 0; color: var(--text-secondary); font-size: 13px; }
.ana-retry-time {
  margin-top: 4px;
  padding: 8px 14px;
  background: var(--card-bg-hover);
  border-radius: 8px;
  display: inline-block;
  align-self: center;
  color: var(--text-primary);
  font-size: 13px;
}
.ana-retry-time strong { color: var(--accent); font-weight: 700; }
.ana-providers {
  margin-top: 14px;
  display: flex; flex-direction: column; gap: 6px;
  border-top: 1px solid var(--card-border);
  padding-top: 14px;
}
.ana-provider-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 4px 4px;
  font-size: 12px;
}
.ana-provider-name { color: var(--text-secondary); }
.ana-provider-pill {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 600;
}
.ana-provider-pill.ps-ok       { background: rgba(106, 173, 106, 0.18); color: #8fce8f; }
.ana-provider-pill.ps-blocked  { background: rgba(196, 90, 90, 0.22); color: #e89a9a; }
.ana-provider-pill.ps-disabled { background: rgba(138, 133, 128, 0.15); color: var(--text-muted); }

/* ── 에러 ── */
.ana-error {
  padding: 16px;
  background: var(--danger-bg);
  border: 1px solid var(--danger-color);
  color: var(--danger-color);
  border-radius: 8px;
  font-size: 13px;
}
.ana-empty {
  padding: 24px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

/* ── 결과 ── */
.ana-result { display: flex; flex-direction: column; gap: 14px; }

.ana-headline-row {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
}
.ana-sentiment {
  font-size: 13px;
  padding: 4px 12px;
  border-radius: 999px;
  font-weight: 700;
  white-space: nowrap;
}
.ana-sentiment.sentiment-positive { background: rgba(106, 173, 106, 0.18); color: #8fce8f; }
.ana-sentiment.sentiment-negative { background: rgba(196, 90, 90, 0.22);   color: #e89a9a; }
.ana-sentiment.sentiment-neutral  { background: rgba(125, 175, 240, 0.15); color: #a8c8f0; }
.ana-headline { color: var(--text-primary); font-weight: 600; font-size: 14px; }

.ana-keywords { display: flex; flex-wrap: wrap; gap: 6px; }
.ana-kw-chip {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--card-bg-hover);
  color: var(--text-secondary);
}

.ana-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.ana-half {
  background: var(--card-bg-hover);
  border-radius: 8px;
  padding: 10px 12px;
}
.ana-half h5 {
  margin: 0 0 6px;
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 700;
}
.ana-half ul { margin: 0; padding-left: 18px; }
.ana-half li { font-size: 12px; color: var(--text-secondary); line-height: 1.5; }
.ana-empty-mini { margin: 0; font-size: 11px; color: var(--text-muted); }

.ana-comment {
  padding: 12px 14px;
  background: var(--card-bg-hover);
  border-left: 3px solid var(--accent);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.6;
}

.ana-sources {
  border-top: 1px solid var(--card-border);
  padding-top: 12px;
}
.ana-sources-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.ana-sources-list { margin: 0; padding-left: 18px; }
.ana-sources-list li { font-size: 12px; margin-bottom: 2px; }
.ana-sources-list a {
  color: var(--text-secondary);
  text-decoration: none;
}
.ana-sources-list a:hover { color: var(--accent); text-decoration: underline; }

.ana-meta {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-muted);
  border-top: 1px solid var(--card-border);
  padding-top: 8px;
}
.ana-provider-tag { font-weight: 600; }

.ana-disclaimer {
  font-size: 11px;
  color: var(--text-muted);
  text-align: center;
  font-style: italic;
}

.ana-footer-btns {
  display: flex; gap: 8px; justify-content: flex-end;
}

@media (max-width: 640px) {
  .ana-split { grid-template-columns: 1fr; }
  .ana-meta { flex-direction: column; gap: 2px; }
  .ana-footer-btns { flex-direction: column-reverse; }
  .ana-footer-btns .btn { width: 100%; }
}
</style>
