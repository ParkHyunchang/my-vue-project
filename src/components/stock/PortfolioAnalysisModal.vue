<template>
  <teleport to="#modal">
    <Modal
      v-if="show"
      @close="$emit('close')"
    >
      <template #header>
        <h3 class="pana-title">
          {{ title }}
        </h3>
      </template>

      <template #body>
        <!-- 로딩 -->
        <div
          v-if="loading"
          class="pana-loading"
        >
          <div class="spinner pana-spinner" />
          <div class="pana-loading-text">
            {{ loadingText }}
          </div>
          <div class="pana-loading-hint">
            리포트 생성에 최대 1분 정도 걸릴 수 있습니다.
          </div>
        </div>

        <!-- 모든 AI 차단됨 -->
        <div
          v-else-if="blocked"
          class="pana-blocked"
        >
          <div class="pana-blocked-icon">
            {{ allDisabled ? '⚙️' : '🔒' }}
          </div>
          <h4>{{ allDisabled ? 'AI 분석 비활성화' : 'AI 분석 잠시 이용 불가' }}</h4>
          <p>
            <template v-if="allDisabled">
              AI provider API 키가 백엔드에 설정되어 있지 않습니다. 관리자에게 문의해주세요.
            </template>
            <template v-else>
              모든 AI 서비스가 일시 한도 초과 상태입니다.
            </template>
          </p>
          <div
            v-if="!allDisabled && retryCountdown"
            class="pana-retry"
          >
            다음 가능: <strong>{{ retryCountdown }}</strong>
          </div>
        </div>

        <!-- 에러 -->
        <div
          v-else-if="error"
          class="pana-error"
        >
          {{ error }}
        </div>

        <!-- 결과 -->
        <div
          v-else-if="report"
          class="pana-result"
        >
          <template v-if="reportSections">
            <template
              v-for="block in reportSections.blocks"
              :key="block.key"
            >
              <MarkdownView
                v-if="block.type === 'markdown'"
                :text="block.text"
              />

              <section
                v-else-if="block.type === 'holdings'"
                class="pana-section"
              >
                <div class="pana-section-head">
                  <h4>{{ block.title }}</h4>
                </div>
                <div class="pana-holdings">
                  <article
                    v-for="h in block.holdings"
                    :key="h.key"
                    :class="['pana-holding-card', `act-${h.actionCode}`]"
                  >
                    <div class="pana-holding-head">
                      <div class="pana-holding-name-wrap">
                        <span
                          v-if="h.tag"
                          class="pana-holding-tag"
                        >{{ h.tag }}</span>
                        <div class="pana-holding-name-col">
                          <div class="pana-holding-name">
                            {{ h.name }}
                          </div>
                          <div
                            v-if="h.ticker"
                            class="pana-holding-sym"
                          >
                            {{ h.ticker }}
                          </div>
                        </div>
                      </div>
                      <span :class="['pana-action-pill', `act-${h.actionCode}`]">{{ h.actionLabel }}</span>
                    </div>

                    <div
                      v-if="h.metrics.length"
                      class="pana-stock-metrics"
                    >
                      <span
                        v-for="m in h.metrics"
                        :key="m.text"
                        :class="m.cls"
                      >{{ m.text }}</span>
                    </div>

                    <div
                      v-if="h.detailFields.length"
                      class="pana-holding-fields"
                    >
                      <div
                        v-for="f in h.detailFields"
                        :key="f.label"
                        class="pana-holding-field"
                      >
                        <span class="pana-holding-field-label">{{ f.label }}</span>
                        <span class="pana-holding-field-value">{{ f.value }}</span>
                      </div>
                    </div>

                    <template v-if="h.reason">
                      <div class="pana-holding-reason-label">
                        AI 판단
                      </div>
                      <p class="pana-holding-reason">
                        {{ h.reason }}
                      </p>
                    </template>
                  </article>
                </div>
              </section>

              <section
                v-else-if="block.type === 'actions'"
                class="pana-section"
              >
                <div class="pana-section-head">
                  <h4>{{ block.title }}</h4>
                </div>
                <ul class="pana-action-cards">
                  <li
                    v-for="(a, idx) in block.actions"
                    :key="a.key"
                    :class="['pana-action-card', a.hasAction ? `act-${a.actionCode}` : '']"
                  >
                    <div class="pana-action-card-head">
                      <span class="pana-action-num">{{ idx + 1 }}</span>
                      <span
                        v-for="m in a.mentions"
                        :key="m.ticker + m.name"
                        class="pana-action-chip"
                      >
                        {{ m.name }}<template v-if="m.ticker"> · {{ m.ticker }}</template>
                      </span>
                      <span
                        v-if="a.hasAction"
                        :class="['pana-action-pill', `act-${a.actionCode}`]"
                      >{{ a.actionLabel }}</span>
                    </div>
                    <p class="pana-action-text">
                      {{ a.text }}
                    </p>
                  </li>
                </ul>
              </section>
            </template>
          </template>

          <MarkdownView
            v-else
            :text="report"
          />

          <section
            v-if="commonCandidates.length"
            class="pana-section"
          >
            <div class="pana-section-head">
              <h4>공통 단기 계좌 편입 후보</h4>
            </div>
            <p class="pana-holding-reason">
              단기와 종합 진단에 같은 후보 데이터가 적용됩니다. 최종 진입 판단은 위 AI 분석의 조건을 확인하세요.
            </p>
            <ul class="pana-action-cards">
              <li
                v-for="candidate in commonCandidates"
                :key="candidate.key"
                class="pana-action-card"
              >
                <div class="pana-action-card-head">
                  <span class="pana-action-chip">{{ candidate.label }}</span>
                </div>
                <p class="pana-action-text">
                  {{ candidate.summary }}
                </p>
              </li>
            </ul>
          </section>

          <div class="pana-meta">
            <span class="pana-provider-tag">{{ providerName }}<span v-if="model"> · {{ model }}</span></span>
            <span
              v-if="analyzedAt"
              class="pana-time"
            >{{ formatTime(analyzedAt) }}</span>
          </div>
          <div class="pana-disclaimer">
            ⚠️ 본 분석은 AI가 생성한 정보 정리이며 투자 자문이 아닙니다.
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
            <template v-if="loading">
              분석 중...
            </template>
            <template v-else-if="cooldownSec > 0">
              {{ cooldownText }} 후 가능
            </template>
            <template v-else>
              다시 진단
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
import { computed, ref, watch } from 'vue';
import axios from '@/axios';
import Modal from '@/components/Modal.vue';
import MarkdownView from '@/components/common/MarkdownView.vue';
import { useAiAnalysis } from '@/composables/useAiAnalysis';
import { logger } from '@/utils/logger';

function parseJsonReport(value) {
  if (!value || typeof value !== 'string') return null;

  const trimmed = value.trim();
  const jsonText = trimmed
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

function pickText(obj, keys) {
  if (!obj || typeof obj !== 'object') return '';
  const key = keys.find((k) => obj[k] !== undefined && obj[k] !== null && obj[k] !== '');
  return key ? obj[key] : '';
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

function stripMarkdownSyntax(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/^```(?:\w+)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
}

function cleanInlineText(value) {
  return stripMarkdownSyntax(value)
    .replace(/^[\s>*•-]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatBulletItems(items, formatter) {
  if (!Array.isArray(items) || items.length === 0) return '';
  return items
    .map((item) => `- ${formatter(item)}`)
    .filter((line) => line.trim() !== '-')
    .join('\n');
}

function jsonReportToMarkdown(json) {
  const data = Array.isArray(json) ? { items: json } : json;
  if (!data || typeof data !== 'object') return '';

  const sections = [];
  const title = pickText(data, ['title', 'headline', 'reportTitle']) || '포트폴리오 AI 진단';
  const overallDiagnosis = data.overallDiagnosis;
  const diagnosisObj = overallDiagnosis && typeof overallDiagnosis === 'object' ? overallDiagnosis : null;
  const summary =
    (diagnosisObj && pickText(diagnosisObj, ['summary', 'overview', 'comment', 'diagnosis'])) ||
    (typeof overallDiagnosis === 'string' ? overallDiagnosis : '') ||
    pickText(data, ['summary', 'overallSummary', 'overall', 'comment', 'diagnosis']);
  const urgentAction = diagnosisObj && pickText(diagnosisObj, [
    'mostUrgentActionItem', 'urgentAction', 'immediateAction', 'actionItem',
  ]);
  const sentiment = pickText(data, ['sentiment', 'marketSentiment']);

  sections.push(`# ${title}`);
  if (summary) sections.push(`> ${summary}`);
  if (urgentAction) sections.push(`**⚠️ 즉시 점검:** ${urgentAction}`);
  if (sentiment) sections.push(`**시장 톤:** ${sentiment}`);

  const grades = data.grades || data.score || data.scores;
  if (grades && typeof grades === 'object') {
    const gradeLines = Object.entries(grades)
      .map(([key, value]) => {
        if (value && typeof value === 'object') {
          const grade = pickText(value, ['grade', 'score', 'rating']);
          const comment = pickText(value, ['comment', 'reason', 'description']);
          return `- **${key}**${grade ? `: ${grade}` : ''}${comment ? ` - ${comment}` : ''}`;
        }
        return `- **${key}**: ${formatValue(value)}`;
      })
      .join('\n');
    if (gradeLines) sections.push(`## 종합 평가\n${gradeLines}`);
  }

  const holdings = data.holdings || data.holdingAnalysis || data.positions || data.stockAnalysis;
  const holdingLines = formatBulletItems(holdings, (item) => {
    const name = pickText(item, ['name', 'stockName', 'symbol', 'ticker']) || formatValue(item);
    const action = pickText(item, ['action', 'recommendation', 'signal']);
    const reason = pickText(item, [
      'reason', 'comment', 'analysis',
      'long_term_assessment', 'short_term_assessment', 'assessment',
      'rationale', 'basis', 'longTermJudgment', 'shortTermJudgment', 'judgment',
    ]);
    const statusObj = item.currentStatus && typeof item.currentStatus === 'object' ? item.currentStatus : null;
    const valuationObj = item.valuation && typeof item.valuation === 'object' ? item.valuation : null;
    const statusText = statusObj
      ? [statusObj.profitLossRate && `수익률 ${statusObj.profitLossRate}`,
        statusObj.dailyChangeRate && `일변동 ${statusObj.dailyChangeRate}`].filter(Boolean).join(' / ')
      : '';
    const valuationText = valuationObj
      ? [valuationObj.per && `PER ${valuationObj.per}`,
        valuationObj.pbr && `PBR ${valuationObj.pbr}`,
        valuationObj.assessment].filter(Boolean).join(' · ')
      : '';
    const metaItems = [action && `**${action}**`, statusText, valuationText].filter(Boolean).join(' · ');
    return `**${name}**${metaItems ? ` — ${metaItems}` : ''}${reason ? ` — ${reason}` : ''}`;
  });
  if (holdingLines) sections.push(`## 보유 종목 진단\n${holdingLines}`);

  const recommendations = data.recommendations || data.recommendedStocks || data.recs;
  const recommendationLines = formatBulletItems(recommendations, (item) => {
    const name = pickText(item, ['name', 'stockName', 'symbol', 'ticker']) || formatValue(item);
    const reason = pickText(item, ['reason', 'rationale', 'comment']);
    const risk = pickText(item, ['risk', 'caution', 'warning']);
    return `**${name}**${reason ? ` - ${reason}` : ''}${risk ? `\n  - 주의: ${risk}` : ''}`;
  });
  if (recommendationLines) sections.push(`## 추천 후보\n${recommendationLines}`);

  const actions = data.priorityActions || data.actions || data.nextSteps;
  const actionLines = formatBulletItems(actions, (item) => formatValue(item));
  if (actionLines) sections.push(`## 우선순위 액션\n${actionLines}`);

  const scenarios = data.scenarios || data.scenario;
  const scenarioLines = Array.isArray(scenarios)
    ? formatBulletItems(scenarios, (item) => formatValue(item))
    : formatValue(scenarios);
  if (scenarioLines) sections.push(`## 시나리오\n${scenarioLines}`);

  const risk = pickText(data, ['risk', 'riskSummary', 'caution']);
  if (risk) sections.push(`## 리스크 체크\n${risk}`);

  const knownKeys = new Set([
    'title', 'headline', 'reportTitle',
    'summary', 'overallSummary', 'overall', 'comment', 'diagnosis', 'overallDiagnosis',
    'sentiment', 'marketSentiment',
    'grades', 'score', 'scores',
    'holdings', 'holdingAnalysis', 'positions', 'stockAnalysis',
    'recommendations', 'recommendedStocks', 'recs',
    'priorityActions', 'actions', 'nextSteps',
    'scenarios', 'scenario',
    'risk', 'riskSummary', 'caution',
  ]);
  const extraEntries = Object.entries(data).filter(([key]) => !knownKeys.has(key));
  const extraLines = extraEntries
    .map(([key, value]) => {
      const formatted = formatValue(value);
      return formatted ? `- **${key}**: ${formatted}` : '';
    })
    .filter(Boolean)
    .join('\n');
  if (extraLines) sections.push(`## 추가 메모\n${extraLines}`);

  return sections.filter(Boolean).join('\n\n');
}

function wrapMarkdownWithBanner(md) {
  if (!md || /^#\s/m.test(md)) return md;
  const firstH2 = md.match(/^##\s+(.+)$/m);
  if (!firstH2) return md;
  const h2Title = firstH2[1].trim();
  const h2Pos = md.indexOf(firstH2[0]);
  const beforeH2 = md.slice(0, h2Pos).trim();
  const afterH2 = md.slice(h2Pos + firstH2[0].length);
  const nextH2Match = afterH2.match(/\n#{1,2}\s+/);
  const summaryRaw = nextH2Match ? afterH2.slice(0, afterH2.indexOf(nextH2Match[0])) : '';
  const rest = nextH2Match ? afterH2.slice(afterH2.indexOf(nextH2Match[0])).trim() : afterH2.trim();
  const summaryText = [beforeH2, summaryRaw.split('\n').map((line) => line.trim()).filter(Boolean).join(' ')]
    .filter(Boolean).join(' ');
  const parts = [`# ${h2Title}`];
  if (summaryText) parts.push(`> ${summaryText}`);
  if (rest) parts.push(rest);
  return parts.join('\n\n');
}

function normalizeReport(value) {
  if (value && typeof value === 'object') return jsonReportToMarkdown(value);
  if (typeof value !== 'string' || !value.trim()) return '';
  if (/^#{1,6}\s/m.test(value)) return wrapMarkdownWithBanner(value);
  const parsed = parseJsonReport(value);
  return parsed ? jsonReportToMarkdown(parsed) : value;
}

function extractHoldingMetrics(text) {
  return String(text || '')
    .split(/[,·]/)
    .map((piece) => piece.trim())
    .filter(Boolean)
    .map((piece) => {
      const match = piece.match(/(-?\+?\d+(?:\.\d+)?)\s*%/);
      let cls = 'is-flat';
      if (match) {
        const num = parseFloat(match[1].replace('+', ''));
        if (num > 0) cls = 'is-up';
        else if (num < 0) cls = 'is-down';
      }
      return { text: piece, cls };
    });
}

function normalizeHoldingActionCode(label) {
  const raw = String(label || '');
  if (/추가매수|추가적립|ADD/i.test(raw)) return 'add';
  if (/전량익절|부분익절|이익실현|TAKE_PROFIT/i.test(raw)) return 'take-profit';
  if (/손절|CUT_LOSS/i.test(raw)) return 'cut-loss';
  if (/비중축소|REDUCE/i.test(raw)) return 'reduce';
  if (/관망|WATCH/i.test(raw)) return 'watch';
  if (/보유|HOLD/i.test(raw)) return 'hold';
  return 'watch';
}

function parseHoldingCards(sectionBody) {
  const chunks = sectionBody
    .split(/\n(?=###\s+)/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  return chunks
    .map((chunk, idx) => {
      const headingMatch = chunk.match(/^###\s+(.+)$/m);
      if (!headingMatch) return null;
      const heading = headingMatch[1].trim();
      const body = chunk.slice(headingMatch[0].length).trim();

      const brackets = [...heading.matchAll(/\[([^\]]+)\]/g)].map((match) => match[1].trim());
      const judgeMatch = heading.match(/판단\s*[:：]\s*(.+)$/);
      const actionLabel = judgeMatch ? judgeMatch[1].trim() : '';
      const nameTicker = brackets[0] || heading.replace(/—.*$/, '').trim();
      const tag = brackets[1] || '';

      const ntMatch = nameTicker.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
      const name = (ntMatch ? ntMatch[1] : nameTicker).trim();
      const ticker = ntMatch ? ntMatch[2].trim() : '';
      if (!name) return null;

      const fields = [...body.matchAll(/^-\s*\*\*([^*]+)\*\*[:：]?\s*(.+)$/gm)]
        .map((match) => ({ label: match[1].trim(), value: match[2].trim() }))
        .filter((field) => field.value);

      const statusField = fields.find((field) => field.label.includes('현황'));
      const reasonField = [...fields].reverse().find((field) => field.label.includes('판단'));
      const detailFields = fields.filter((field) => field !== statusField && field !== reasonField);

      return {
        key: `hc-${idx}-${ticker || name}`,
        name,
        ticker,
        tag,
        actionLabel: actionLabel || '관망',
        actionCode: normalizeHoldingActionCode(actionLabel),
        metrics: statusField ? extractHoldingMetrics(statusField.value) : [],
        detailFields,
        reason: reasonField ? reasonField.value : '',
      };
    })
    .filter(Boolean);
}

const ACTION_CODE_LABELS = {
  add: '추가매수',
  'take-profit': '이익실현',
  'cut-loss': '손절 검토',
  reduce: '비중 축소',
  hold: '보유',
  watch: '관망',
};

function splitActionLines(text) {
  const lines = String(text || '').split('\n').map((line) => line.trim()).filter(Boolean);
  const listLines = lines
    .filter((line) => /^(\d+[.)]|[-*])\s+/.test(line))
    .map((line) => line.replace(/^(\d+[.)]|[-*])\s+/, '').trim());
  return listLines.length ? listLines : lines;
}

function parseActionCards(sectionBody) {
  return splitActionLines(sectionBody)
    .map((line, idx) => {
      const clean = cleanInlineText(line);
      if (!clean) return null;

      const mentions = [...clean.matchAll(/([A-Za-z0-9가-힣][A-Za-z0-9가-힣&.\-\s]{1,40}?)\s*\(([A-Za-z0-9.]{2,12})\)/g)]
        .map((match) => ({ name: match[1].trim(), ticker: match[2].trim() }))
        .filter((mention) => mention.name.length >= 2);

      const actionMatch = clean.match(/\b(CUT_LOSS|TAKE_PROFIT|ADD|HOLD|WATCH|REDUCE)\b/);
      const actionCode = actionMatch ? normalizeHoldingActionCode(actionMatch[1]) : '';

      return {
        key: `pact-${idx}`,
        mentions,
        hasAction: Boolean(actionMatch),
        actionCode: actionCode || 'watch',
        actionLabel: ACTION_CODE_LABELS[actionCode] || '',
        text: clean,
      };
    })
    .filter(Boolean);
}

function splitReportSections(markdown) {
  if (typeof markdown !== 'string' || !markdown.trim()) return null;

  const headingRe = /^##\s+(.+)$/gm;
  const matches = [...markdown.matchAll(headingRe)];
  if (!matches.length) return null;

  const blocks = [];
  const lead = markdown.slice(0, matches[0].index).trim();
  if (lead) blocks.push({ type: 'markdown', key: 'lead', text: lead });

  matches.forEach((match, index) => {
    const heading = match[1].trim();
    const bodyStart = match.index + match[0].length;
    const bodyEnd = index + 1 < matches.length ? matches[index + 1].index : markdown.length;
    const body = markdown.slice(bodyStart, bodyEnd).trim();

    if (/^종목별\s.+분석$/.test(heading) && /^###\s+/m.test(body)) {
      const holdings = parseHoldingCards(body);
      if (holdings.length) {
        blocks.push({ type: 'holdings', key: `blk-${index}`, title: heading, holdings });
        return;
      }
    }

    if (/^우선순위\s*액션$/.test(heading)) {
      const actions = parseActionCards(body);
      if (actions.length) {
        blocks.push({ type: 'actions', key: `blk-${index}`, title: heading, actions });
        return;
      }
    }

    blocks.push({ type: 'markdown', key: `blk-${index}`, text: `## ${heading}\n\n${body}` });
  });

  const hasCardBlock = blocks.some((block) => block.type !== 'markdown');
  return hasCardBlock ? { blocks } : null;
}

export default {
  name: 'PortfolioAnalysisModal',
  components: { Modal, MarkdownView },
  props: {
    show: { type: Boolean, required: true },
    title: { type: String, default: '📊 포트폴리오 AI 진단' },
    portfolioContext: { type: Object, default: null },
  },
  emits: ['close'],
  setup(props) {
    const commonCandidates = ref([]);
    const {
      loading,
      error,
      blocked,
      report,
      providerName,
      model,
      analyzedAt,
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
        '보유 종목의 현재가와 비중을 계산하는 중...',
        'KRX·Yahoo 재무 데이터와 시장 뉴스를 확인하는 중...',
        'AI가 종목별 퀀트·펀더멘털 분석을 정리하는 중...',
      ],
      errorFallback: '포트폴리오 분석 중 오류가 발생했습니다.',
      onError: (err) => logger.error('포트폴리오 AI 진단 실패:', err),
    });
    const reportSections = computed(() => splitReportSections(report.value));

    async function fetchAnalysis() {
      await runAnalysis(
        async () => {
          const context = props.portfolioContext || {};
          const res = await axios.post('/api/portfolio/analyze', {
            portfolio: context,
            accountType: context.accountType || null,
            accountLabel: context.accountLabel || null,
            accountNote: context.accountNote || null,
            holdings: context.holdings || [],
            totalValueKRW: context.totalValueKRW || null,
            exchangeRate: context.exchangeRate || null,
            asOf: context.asOf || null,
            marketFilter: context.marketFilter || null,
          });
          return res.data || {};
        },
        (data) => {
          report.value = normalizeReport(data.report || data);
        },
      );
    }

    async function fetchCommonCandidates() {
      try {
        const [kr, us] = await Promise.all([
          axios.get('/api/stock/swing-candidates/kr/catalysts', { params: { limit: 3 } }),
          axios.get('/api/stock/swing-candidates/us/signals', { params: { limit: 3 } }),
        ]);
        const krItems = (kr.data || []).map((item) => ({
          key: `kr-${item.candidate?.symbol}`,
          label: `${item.candidate?.name || item.candidate?.symbol} · KR`,
          summary: `KRX 등락률 ${item.candidate?.changePercent ?? '-'}%, 거래량 ${item.candidate?.volumeRatio ?? '-'}배 · DART/종목 뉴스 촉매 확인`,
        }));
        const usItems = (us.data || []).map((item) => ({
          key: `us-${item.candidate?.symbol}`,
          label: `${item.candidate?.name || item.candidate?.symbol} · US`,
          summary: `Alpha Vantage 평균 감성 ${item.averageSentiment ?? '-'} · 긍정 감성 뉴스 및 Yahoo 컨센서스 확인`,
        }));
        commonCandidates.value = [...krItems, ...usItems];
      } catch (err) {
        commonCandidates.value = [];
        logger.debug('공통 단기 후보 조회 생략:', err);
      }
    }

    watch(
      () => props.show,
      (showVal, prevShow) => {
        if (showVal && !prevShow) {
          fetchCommonCandidates();
          fetchAnalysis();
        }
      },
    );

    return {
      loading,
      error,
      blocked,
      report,
      commonCandidates,
      reportSections,
      providerName,
      model,
      analyzedAt,
      retryCountdown,
      cooldownSec,
      cooldownText,
      allDisabled,
      loadingText,
      fetchAnalysis,
      formatTime,
    };
  },
};
</script>

<style src="@/assets/css/components/stock/portfolio-analysis-modal.css" scoped></style>
