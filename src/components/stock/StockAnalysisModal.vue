<template>
  <teleport to="#modal">
    <Modal
      v-if="show"
      @close="$emit('close')"
    >
      <template #header>
        <div class="ana-modal-title">
          <span class="ana-market">{{ holding?.market || '-' }}</span>
          <div>
            <div class="ana-name">
              {{ holding?.name }}
            </div>
            <div class="ana-sym">
              {{ holding?.symbol }} · AI 분석
            </div>
          </div>
        </div>
      </template>

      <template #body>
        <div
          v-if="loading"
          class="ana-loading"
        >
          <div class="spinner ana-spinner" />
          <div class="ana-loading-text">
            {{ loadingText }}
          </div>
          <div class="ana-loading-hint">
            최대 30초 정도 소요될 수 있습니다.
          </div>
        </div>

        <div
          v-else-if="blocked"
          class="ana-blocked"
        >
          <div class="ana-blocked-icon">
            !
          </div>
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
          <div
            v-if="!allDisabled && retryCountdown"
            class="ana-retry-time"
          >
            다음 가능: <strong>{{ retryCountdown }}</strong>
          </div>
          <div
            v-if="providersStatus?.length"
            class="ana-providers"
          >
            <div
              v-for="ps in providersStatus"
              :key="ps.name"
              class="ana-provider-row"
            >
              <span class="ana-provider-name">{{ ps.name }}</span>
              <span :class="['ana-provider-pill', providerStatusCls(ps)]">
                {{ providerStatusLabel(ps) }}
              </span>
            </div>
          </div>
        </div>

        <div
          v-else-if="error"
          class="ana-error"
        >
          {{ error }}
        </div>

        <div
          v-else-if="report"
          class="ana-result"
        >
          <template v-if="uiReport">
            <section class="ana-hero-card">
              <div class="ana-score-row">
                <div class="ana-score-ring">
                  <strong>{{ uiReport.summary.score ?? '-' }}</strong>
                  <span>/ 10</span>
                </div>
                <div class="ana-hero-main">
                  <div class="ana-eyebrow">
                    투자 점수
                  </div>
                  <div class="ana-opinion-row">
                    <h4>{{ opinionText(uiReport.summary.opinion) }}</h4>
                    <span :class="['ana-opinion-pill', opinionClass(uiReport.summary.opinion)]">
                      {{ opinionText(uiReport.summary.opinion) }}
                    </span>
                  </div>
                </div>
              </div>
              <p
                v-if="uiReport.summary.text"
                class="ana-summary-text"
              >
                {{ uiReport.summary.text }}
              </p>
              <ul
                v-if="uiReport.summary.points.length"
                class="ana-key-points"
              >
                <li
                  v-for="point in uiReport.summary.points"
                  :key="point"
                >
                  {{ point }}
                </li>
              </ul>
            </section>

            <section
              v-if="uiReport.metrics.length"
              class="ana-section"
            >
              <div class="ana-section-head">
                <h4>핵심 지표</h4>
                <span>데이터 소스 기준</span>
              </div>
              <div class="ana-metric-list">
                <article
                  v-for="metric in uiReport.metrics"
                  :key="metric.key"
                  class="ana-metric-card"
                >
                  <div class="ana-metric-top">
                    <strong>{{ metric.label }}</strong>
                    <span>{{ metric.source || '데이터' }}</span>
                  </div>
                  <div class="ana-metric-value">
                    {{ metric.value || '데이터 없음' }}
                  </div>
                  <p v-if="metric.comment">
                    {{ metric.comment }}
                  </p>
                </article>
              </div>
            </section>

            <section
              v-if="uiReport.notes.length"
              class="ana-section"
            >
              <div class="ana-section-head">
                <h4>분석 체크포인트</h4>
              </div>
              <div class="ana-note-grid">
                <article
                  v-for="note in uiReport.notes"
                  :key="note.title"
                  class="ana-info-card"
                >
                  <h5>{{ note.title }}</h5>
                  <p>{{ note.text }}</p>
                </article>
              </div>
            </section>

            <section
              v-if="uiReport.risks.length"
              class="ana-section"
            >
              <div class="ana-section-head">
                <h4>리스크 시나리오</h4>
              </div>
              <div class="ana-risk-grid">
                <article
                  v-for="risk in uiReport.risks"
                  :key="risk.name"
                  class="ana-info-card"
                >
                  <h5>{{ risk.name }}</h5>
                  <p v-if="risk.impact">
                    <strong>영향</strong>{{ risk.impact }}
                  </p>
                  <p v-if="risk.response">
                    <strong>대응</strong>{{ risk.response }}
                  </p>
                </article>
              </div>
            </section>

            <section
              v-if="uiReport.question"
              class="ana-question"
            >
              <div class="ana-eyebrow">
                Critical Question
              </div>
              <p>{{ uiReport.question }}</p>
            </section>

            <div
              v-if="uiReport.dataAsOf"
              class="ana-data-asof"
            >
              데이터 기준일: {{ uiReport.dataAsOf }}
            </div>
          </template>

          <MarkdownView
            v-else
            :text="report"
          />

          <div
            v-if="sources?.length"
            class="ana-sources"
          >
            <div class="ana-sources-title">
              참고 뉴스
            </div>
            <ul class="ana-sources-list">
              <li
                v-for="(s, i) in sources"
                :key="i"
              >
                <a
                  :href="s.link"
                  target="_blank"
                  rel="noopener noreferrer"
                >{{ s.title }}</a>
              </li>
            </ul>
          </div>

          <div class="ana-meta">
            <span class="ana-provider-tag">{{ providerName }}<span v-if="model"> · {{ model }}</span></span>
            <span
              v-if="analyzedAt"
              class="ana-time"
            >{{ formatTime(analyzedAt) }}</span>
          </div>

          <div class="ana-disclaimer">
            본 분석은 AI가 생성한 정보 정리이며 투자 자문이 아닙니다.
          </div>
        </div>

        <div
          v-else
          class="ana-empty"
        >
          분석을 준비 중입니다...
        </div>
      </template>

      <template #footer>
        <div class="ana-footer-btns">
          <button
            type="button"
            class="btn btn-primary"
            :disabled="loading || cooldownSec > 0"
            @click="fetchAnalysis"
          >
            <template v-if="loading">
              분석 중...
            </template>
            <template v-else-if="cooldownSec > 0">
              {{ cooldownText }} 후 가능
            </template>
            <template v-else>
              다시 분석
            </template>
          </button>
          <button
            type="button"
            class="btn btn-primary"
            @click="$emit('close')"
          >
            닫기
          </button>
        </div>
      </template>
    </Modal>
  </teleport>
</template>

<script>
import { ref, computed, watch } from 'vue';
import axios from '@/axios';
import Modal from '@/components/Modal.vue';
import MarkdownView from '@/components/common/MarkdownView.vue';
import { useAiAnalysis } from '@/composables/useAiAnalysis';
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
    const sources = ref([]);
    const {
      loading,
      error,
      blocked,
      report,
      providerName,
      model,
      analyzedAt,
      providersStatus,
      retryCountdown,
      cooldownSec,
      cooldownText,
      allDisabled,
      loadingText,
      runAnalysis,
      formatTime,
    } = useAiAnalysis({
      show: () => props.show,
      loadingMessages: [
        '현재가와 최근 변동률을 확인하는 중...',
        'KRX·OpenDART 재무 지표를 계산하는 중...',
        'AI가 밸류에이션과 리스크를 정리하는 중...',
      ],
      errorFallback: 'AI 분석 중 오류가 발생했습니다.',
      onError: (err) => logger.error('AI 분석 실패:', err),
      resetExtra: () => { sources.value = []; },
    });
    const uiReport = computed(() => buildUiReport(report.value, props.holding));

    async function fetchAnalysis() {
      if (!props.holding) return;
      await runAnalysis(
        async () => {
          const res = await axios.post('/api/stock/analyze', {
            symbol: props.holding.symbol,
            market: props.holding.market,
          });
          return res.data || {};
        },
        (data) => {
          report.value = data.report || '';
          sources.value = data.sources || [];
          emit('analyzed');
        },
      );
    }

    watch(
      () => [props.show, props.holding?.symbol],
      ([showVal, symbol], [prevShow]) => {
        if (showVal && symbol && (!prevShow || prevShow !== showVal)) {
          fetchAnalysis();
        }
      },
    );

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
      providersStatus, retryCountdown, cooldownSec, cooldownText, allDisabled,
      loadingText,
      fetchAnalysis,
      formatTime,
      providerStatusLabel, providerStatusCls,
      opinionText, opinionClass,
    };
  },
};
</script>

<style src="@/assets/css/components/stock/stock-analysis-modal.css" scoped></style>
