<template>
  <teleport to="#modal">
    <Modal v-if="show" @close="$emit('close')">
      <template #header>
        <div class="ana-modal-title">
          <span class="ana-market">{{ holding?.market || '-' }}</span>
          <div>
            <div class="ana-name">{{ holding?.name }}</div>
            <div class="ana-sym">{{ holding?.symbol }} · AI 분석</div>
          </div>
        </div>
      </template>

      <template #body>
        <div v-if="loading" class="ana-loading">
          <div class="spinner ana-spinner"></div>
          <div class="ana-loading-text">{{ loadingText }}</div>
          <div class="ana-loading-hint">최대 30초 정도 소요될 수 있습니다.</div>
        </div>

        <div v-else-if="blocked" class="ana-blocked">
          <div class="ana-blocked-icon">!</div>
          <h4 class="ana-blocked-title">
            {{ allDisabled ? 'AI 분석 비활성화' : 'AI 분석 잠시 이용 불가' }}
          </h4>
          <p class="ana-blocked-desc">
            <template v-if="allDisabled">
              AI provider API 키가 설정되어 있지 않습니다. 관리자에게 문의해주세요.
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

        <div v-else-if="error" class="ana-error">
          {{ error }}
        </div>

        <div v-else-if="report" class="ana-result">
          <template v-if="uiReport">
            <section class="ana-hero-card">
              <div class="ana-score-row">
                <div class="ana-score-ring">
                  <strong>{{ uiReport.summary.score ?? '-' }}</strong>
                  <span>/ 10</span>
                </div>
                <div class="ana-hero-main">
                  <div class="ana-eyebrow">투자 점수</div>
                  <div class="ana-opinion-row">
                    <h4>{{ opinionText(uiReport.summary.opinion) }}</h4>
                    <span :class="['ana-opinion-pill', opinionClass(uiReport.summary.opinion)]">
                      {{ opinionText(uiReport.summary.opinion) }}
                    </span>
                  </div>
                </div>
              </div>
              <p v-if="uiReport.summary.text" class="ana-summary-text">
                {{ uiReport.summary.text }}
              </p>
              <ul v-if="uiReport.summary.points.length" class="ana-key-points">
                <li v-for="point in uiReport.summary.points" :key="point">{{ point }}</li>
              </ul>
            </section>

            <section v-if="uiReport.metrics.length" class="ana-section">
              <div class="ana-section-head">
                <h4>핵심 지표</h4>
                <span>데이터 소스 기준</span>
              </div>
              <div class="ana-metric-list">
                <article v-for="metric in uiReport.metrics" :key="metric.key" class="ana-metric-card">
                  <div class="ana-metric-top">
                    <strong>{{ metric.label }}</strong>
                    <span>{{ metric.source || '데이터' }}</span>
                  </div>
                  <div class="ana-metric-value">{{ metric.value || '데이터 없음' }}</div>
                  <p v-if="metric.comment">{{ metric.comment }}</p>
                </article>
              </div>
            </section>

            <section v-if="uiReport.notes.length" class="ana-section">
              <div class="ana-section-head">
                <h4>분석 체크포인트</h4>
              </div>
              <div class="ana-note-grid">
                <article v-for="note in uiReport.notes" :key="note.title" class="ana-info-card">
                  <h5>{{ note.title }}</h5>
                  <p>{{ note.text }}</p>
                </article>
              </div>
            </section>

            <section v-if="uiReport.risks.length" class="ana-section">
              <div class="ana-section-head">
                <h4>리스크 시나리오</h4>
              </div>
              <div class="ana-risk-grid">
                <article v-for="risk in uiReport.risks" :key="risk.name" class="ana-info-card">
                  <h5>{{ risk.name }}</h5>
                  <p v-if="risk.impact"><strong>영향</strong>{{ risk.impact }}</p>
                  <p v-if="risk.response"><strong>대응</strong>{{ risk.response }}</p>
                </article>
              </div>
            </section>

            <section v-if="uiReport.question" class="ana-question">
              <div class="ana-eyebrow">Critical Question</div>
              <p>{{ uiReport.question }}</p>
            </section>

            <div v-if="uiReport.dataAsOf" class="ana-data-asof">
              데이터 기준일: {{ uiReport.dataAsOf }}
            </div>
          </template>

          <MarkdownView v-else :text="report" />

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
            본 분석은 AI가 생성한 정보 정리이며 투자 자문이 아닙니다.
          </div>
        </div>

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
import MarkdownView from '@/components/common/MarkdownView.vue';
import { apiErrorMessage } from '@/utils/apiError';
import { logger } from '@/utils/logger';

function parseJsonReport(value) {
  if (!value || typeof value !== 'string') return null;
  const jsonText = value.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  if (!jsonText.startsWith('{') && !jsonText.startsWith('[')) return null;
  try {
    return JSON.parse(jsonText);
  } catch (_) {
    return null;
  }
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '';
  if (Array.isArray(value)) return value.map(formatValue).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([key, val]) => {
        const formatted = formatValue(val);
        return formatted ? `${key}: ${formatted}` : '';
      })
      .filter(Boolean)
      .join(' / ');
  }
  return String(value);
}

function pick(obj, keys, fallback = '') {
  if (!obj || typeof obj !== 'object') return fallback;
  const key = keys.find((k) => obj[k] !== undefined && obj[k] !== null && obj[k] !== '');
  return key ? obj[key] : fallback;
}

function normalizeOpinion(value) {
  const raw = String(value || '').toUpperCase();
  if (raw.includes('BUY') || raw.includes('매수')) return 'BUY';
  if (raw.includes('SELL') || raw.includes('매도')) return 'SELL';
  return 'NEUTRAL';
}

function normalizeMetricRows(raw) {
  if (!raw) return [];
  const rows = raw.rows || raw.table || raw.table_data || raw.metrics || raw;
  if (Array.isArray(rows)) return rows;
  if (typeof rows === 'object') {
    return Object.entries(rows).map(([key, value]) => ({
      metric: key,
      value,
    }));
  }
  return [];
}

function buildMetrics(root) {
  const blocks = [
    root.metrics,
    root.metric_table,
    root.metricTable,
    root.analysis_table,
    root.analysisTable,
    root.financial_metrics,
    root.financialMetrics,
    root.valuation_metrics,
    root.valuationMetrics,
  ];

  return blocks
    .flatMap(normalizeMetricRows)
    .map((row, idx) => ({
      key: `metric-${idx}-${formatValue(row).slice(0, 24)}`,
      label: formatValue(pick(row, ['metric', 'indicator', 'name', 'label', '항목'], `지표 ${idx + 1}`)),
      value: formatValue(pick(row, ['value', 'figure', 'result', '수치', '값'], '')),
      source: formatValue(pick(row, ['source', 'data_source', 'dataSource', '출처'], '')),
      comment: formatValue(pick(row, ['comment', 'interpretation', 'analysis', 'note', '의미'], '')),
    }))
    .filter((row) => row.label || row.value);
}

function buildUiReport(report, holding) {
  const parsed = typeof report === 'object' ? report : parseJsonReport(report);
  if (!parsed || typeof parsed !== 'object') return null;

  const root = parsed.stock_analysis ||
    parsed.stockAnalysis ||
    parsed.company_analysis ||
    parsed.companyAnalysis ||
    parsed.analysis ||
    parsed;

  const summaryRoot = root.executive_summary ||
    root.executiveSummary ||
    root.conclusion ||
    root.summary ||
    root.investment_summary ||
    {};

  const score = pick(summaryRoot, ['investment_score', 'investmentScore', 'score', 'rating'], pick(root, ['score'], ''));
  const opinion = normalizeOpinion(pick(summaryRoot, ['opinion', 'investment_opinion', 'investmentOpinion', 'recommendation'], pick(root, ['opinion', 'recommendation'], '')));
  const summaryText = formatValue(pick(summaryRoot, ['summary', 'headline', 'comment', 'text'], ''));
  const points = asArray(pick(summaryRoot, ['key_points', 'keyPoints', 'reasons', 'points'], []))
    .map(formatValue)
    .filter(Boolean)
    .slice(0, 4);

  const notes = [
    ['매크로/산업', root.macro_industry_analysis || root.macroIndustryAnalysis || root.macro_analysis || root.industry_analysis],
    ['재무 건전성', root.financial_health || root.financialHealth || root.financial_analysis || root.financialAnalysis],
    ['가치 평가', root.valuation || root.valuation_analysis || root.valuationAnalysis],
    ['데이터 제한', root.data_limitations || root.dataLimitations || root.data_gap || root.dataGap],
  ]
    .map(([title, value]) => ({ title, text: formatValue(value) }))
    .filter((note) => note.text);

  const risks = asArray(root.risk_scenarios || root.riskScenarios || root.scenarios || root.risks)
    .map((risk, idx) => ({
      name: formatValue(pick(risk, ['scenario_name', 'scenarioName', 'name', 'title'], `시나리오 ${idx + 1}`)),
      impact: formatValue(pick(risk, ['impact', 'effect', 'risk', 'summary'], '')),
      response: formatValue(pick(risk, ['response', 'strategy', ' 대응', 'hedge', 'action'], '')),
    }))
    .filter((risk) => risk.impact || risk.response);

  const metrics = buildMetrics(root);
  const question = formatValue(pick(root, ['critical_question', 'criticalQuestion', 'question'], ''));
  const dataAsOf = formatValue(pick(root, ['api_data_as_of', 'apiDataAsOf', 'data_as_of', 'dataAsOf'], ''));

  if (!score && !summaryText && !points.length && !metrics.length && !notes.length && !risks.length && !question) {
    return null;
  }

  return {
    summary: {
      score,
      opinion,
      text: summaryText || `${holding?.name || '해당 종목'} 분석 결과입니다.`,
      points,
    },
    metrics,
    notes,
    risks,
    question,
    dataAsOf,
  };
}

export default {
  name: 'StockAnalysisModal',
  components: { Modal, MarkdownView },
  props: {
    show: { type: Boolean, required: true },
    holding: { type: Object, default: null },
  },
  emits: ['close', 'analyzed'],
  setup(props, { emit }) {
    const loading = ref(false);
    const error = ref('');
    const blocked = ref(false);
    const report = ref('');
    const sources = ref([]);
    const providerName = ref('');
    const model = ref('');
    const analyzedAt = ref(null);
    const retryAt = ref(null);
    const providersStatus = ref([]);

    const loadingMessages = [
      '현재가와 최근 변동률을 확인하는 중...',
      'KRX·OpenDART 재무 지표를 계산하는 중...',
      'AI가 밸류에이션과 리스크를 정리하는 중...',
    ];
    const loadingMsgIdx = ref(0);
    let loadingTimer = null;
    let tickerTimer = null;
    const now = ref(Date.now());
    const lastFetchAt = ref(0);

    const loadingText = computed(() => loadingMessages[loadingMsgIdx.value]);
    const uiReport = computed(() => buildUiReport(report.value, props.holding));

    function reset() {
      loading.value = false;
      error.value = '';
      blocked.value = false;
      report.value = '';
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
          report.value = data.report || '';
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

    watch(
      () => [props.show, props.holding?.symbol],
      ([showVal, symbol], [prevShow]) => {
        if (showVal && symbol && (!prevShow || prevShow !== showVal)) {
          fetchAnalysis();
        }
      },
    );

    watch(
      () => props.show,
      (showVal) => {
        clearInterval(tickerTimer);
        if (showVal) {
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
    function opinionText(opinion) {
      return {
        BUY: '매수',
        SELL: '매도',
        NEUTRAL: '중립',
      }[opinion] || '중립';
    }
    function opinionClass(opinion) {
      return `op-${String(opinion || 'NEUTRAL').toLowerCase()}`;
    }

    return {
      loading, error, blocked, report, uiReport, sources,
      providerName, model, analyzedAt,
      providersStatus, retryCountdown, cooldownSec, allDisabled,
      loadingText,
      fetchAnalysis,
      formatTime,
      providerStatusLabel, providerStatusCls,
      opinionText, opinionClass,
    };
  },
};
</script>

<style scoped>
.ana-modal-title { display: flex; align-items: center; gap: 10px; }
.ana-market {
  min-width: 34px;
  height: 34px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(224, 177, 94, 0.14);
  border: 1px solid rgba(224, 177, 94, 0.28);
  color: #e0b15e;
  font-size: 12px;
  font-weight: 800;
}
.ana-name { font-weight: 700; color: var(--text-primary); font-size: 1rem; }
.ana-sym { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

.ana-loading {
  padding: 32px 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.ana-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--card-border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: ana-spin 0.8s linear infinite;
}
@keyframes ana-spin { to { transform: rotate(360deg); } }
.ana-loading-text { color: var(--text-secondary); font-size: 14px; }
.ana-loading-hint { color: var(--text-muted); font-size: 12px; }

.ana-blocked {
  text-align: center;
  padding: 24px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ana-blocked-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  margin: 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(224, 177, 94, 0.16);
  color: #e0b15e;
  font-size: 1.2rem;
  font-weight: 900;
}
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
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 1px solid var(--card-border);
  padding-top: 14px;
}
.ana-provider-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px;
  font-size: 12px;
}
.ana-provider-name { color: var(--text-secondary); }
.ana-provider-pill {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 600;
}
.ana-provider-pill.ps-ok { background: rgba(106, 173, 106, 0.18); color: #8fce8f; }
.ana-provider-pill.ps-blocked { background: rgba(196, 90, 90, 0.22); color: #e89a9a; }
.ana-provider-pill.ps-disabled { background: rgba(138, 133, 128, 0.15); color: var(--text-muted); }

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

.ana-result { display: flex; flex-direction: column; gap: 14px; }
.ana-hero-card {
  padding: 16px;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(124, 111, 255, 0.16), rgba(106, 173, 106, 0.08));
  border: 1px solid rgba(124, 111, 255, 0.28);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ana-score-row {
  display: flex;
  align-items: center;
  gap: 14px;
}
.ana-score-ring {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  border: 5px solid rgba(224, 177, 94, 0.55);
  background: rgba(10, 10, 18, 0.38);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.ana-score-ring strong {
  color: #f0ece4;
  font-size: 1.35rem;
  line-height: 1;
}
.ana-score-ring span {
  color: var(--text-muted);
  font-size: 11px;
  margin-top: 2px;
}
.ana-hero-main { min-width: 0; }
.ana-eyebrow {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}
.ana-opinion-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.ana-opinion-row h4 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.05rem;
  line-height: 1.35;
}
.ana-opinion-pill {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}
.ana-opinion-pill.op-buy { color: #8fce8f; background: rgba(106, 173, 106, 0.18); }
.ana-opinion-pill.op-sell { color: #e89a9a; background: rgba(196, 90, 90, 0.20); }
.ana-opinion-pill.op-neutral { color: #e0b15e; background: rgba(224, 177, 94, 0.18); }
.ana-summary-text {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
}
.ana-key-points {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.ana-key-points li {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.45;
}
.ana-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ana-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.ana-section-head h4 {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 800;
}
.ana-section-head span {
  color: var(--text-muted);
  font-size: 11px;
}
.ana-metric-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.ana-metric-card,
.ana-info-card {
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--card-bg-hover);
  border: 1px solid var(--card-border);
}
.ana-metric-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}
.ana-metric-top strong,
.ana-info-card h5 {
  margin: 0;
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.35;
}
.ana-metric-top span {
  color: var(--text-muted);
  font-size: 10px;
  white-space: nowrap;
}
.ana-metric-value {
  margin-top: 8px;
  color: #e0b15e;
  font-size: 15px;
  font-weight: 800;
}
.ana-metric-card p,
.ana-info-card p {
  margin: 7px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.55;
}
.ana-info-card p strong {
  display: inline-block;
  margin-right: 6px;
  color: var(--text-muted);
  font-size: 11px;
}
.ana-note-grid,
.ana-risk-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.ana-question {
  padding: 14px 16px;
  border-radius: 8px;
  background: rgba(224, 177, 94, 0.10);
  border: 1px solid rgba(224, 177, 94, 0.28);
}
.ana-question p {
  margin: 4px 0 0;
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.6;
  font-weight: 600;
}
.ana-data-asof {
  color: var(--text-muted);
  font-size: 11px;
  text-align: right;
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
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

@media (max-width: 640px) {
  .ana-score-row { align-items: flex-start; }
  .ana-score-ring { width: 58px; height: 58px; border-width: 4px; }
  .ana-score-ring strong { font-size: 1.1rem; }
  .ana-metric-list,
  .ana-note-grid,
  .ana-risk-grid { grid-template-columns: 1fr; }
  .ana-meta { flex-direction: column; gap: 2px; }
  .ana-footer-btns { flex-direction: column-reverse; }
  .ana-footer-btns .btn { width: 100%; }
}
</style>
