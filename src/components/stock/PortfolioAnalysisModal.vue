<template>
  <teleport to="#modal">
    <Modal v-if="show" @close="$emit('close')">
      <template #header>
        <h3 class="pana-title">{{ title }}</h3>
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
        <div v-else-if="uiReport || report" class="pana-result">
          <template v-if="uiReport">
            <section v-if="uiReport.health" class="pana-hero-card">
              <div class="pana-score-wrap">
                <div v-if="uiReport.health.score" class="pana-score-ring">
                  <strong>{{ uiReport.health.score || '-' }}</strong>
                  <span v-if="uiReport.health.scoreUnit">{{ uiReport.health.scoreUnit }}</span>
                </div>
                <div v-else class="pana-account-badge">{{ uiReport.account?.badge || 'AI' }}</div>
                <div>
                  <div class="pana-eyebrow">{{ uiReport.account?.heroEyebrow || '포트폴리오 건강 점수' }}</div>
                  <h4 class="pana-hero-title">{{ uiReport.health.prescription || '진단 결과' }}</h4>
                </div>
              </div>
              <p v-if="uiReport.health.summary" class="pana-hero-summary">
                {{ uiReport.health.summary }}
              </p>
            </section>

            <section v-if="uiReport.holdings.length" class="pana-section">
              <div class="pana-section-head">
                <h4 class="pana-section-title">{{ uiReport.account?.holdingTitle || '종목별 액션' }}</h4>
                <span class="pana-section-hint">{{ uiReport.account?.holdingHint || 'AI 판단' }}</span>
              </div>
              <div class="pana-stock-actions">
                <article v-for="item in uiReport.holdings" :key="item.key" class="pana-stock-card">
                  <div class="pana-stock-head">
                    <div class="pana-stock-name">
                      <strong>{{ item.name }}</strong>
                      <span>{{ [item.ticker, item.country, item.sector].filter(Boolean).join(' · ') }}</span>
                    </div>
                    <span :class="['pana-action-badge', actionBadgeClass(item.action)]">
                      {{ actionText(item.action) }}
                    </span>
                  </div>
                  <div class="pana-stock-metrics">
                    <span v-if="item.assetType">{{ item.assetType === 'CASH' ? '현금성 자산' : '주식/ETF' }}</span>
                    <span v-if="item.currentWeight !== null && item.currentWeight !== undefined">
                      현재 {{ formatPercent(item.currentWeight) }}
                    </span>
                    <span v-if="item.proposedWeight !== null && item.proposedWeight !== undefined">
                      제안 {{ formatPercent(item.proposedWeight) }}
                    </span>
                    <span
                      v-if="item.change !== null && item.change !== undefined"
                      :class="weightChangeClass(item.change)"
                    >
                      {{ formatSignedPercent(item.change) }}
                    </span>
                  </div>
                  <p v-if="item.reason" class="pana-stock-reason">{{ item.reason }}</p>
                </article>
              </div>
            </section>

            <section v-if="uiReport.weights.length && hasProposedWeights" class="pana-section">
              <div class="pana-section-head">
                <h4 class="pana-section-title">비중 조정 요약</h4>
                <span class="pana-section-hint">현재 → 제안</span>
              </div>
              <div class="pana-weight-list">
                <div v-for="row in uiReport.weights" :key="row.key" class="pana-weight-row">
                  <div class="pana-weight-top">
                    <div class="pana-weight-main">
                      <strong>{{ row.name }}</strong>
                      <span>{{ [row.ticker, row.country, row.sector].filter(Boolean).join(' · ') }}</span>
                    </div>
                    <div class="pana-weight-values">
                      <span>{{ formatPercent(row.currentWeight) }}</span>
                      <template v-if="row.proposedWeight !== null && row.proposedWeight !== undefined">
                        <span class="pana-arrow">→</span>
                        <strong>{{ formatPercent(row.proposedWeight) }}</strong>
                      </template>
                      <em v-if="row.change !== null && row.change !== undefined" :class="weightChangeClass(row.change)">
                        {{ formatSignedPercent(row.change) }}
                      </em>
                    </div>
                  </div>
                  <p v-if="row.reason" class="pana-weight-reason">{{ row.reason }}</p>
                </div>
              </div>
            </section>

            <section v-if="uiReport.scenarios.length" class="pana-section">
              <div class="pana-section-head">
                <h4 class="pana-section-title">스트레스 테스트</h4>
              </div>
              <div class="pana-scenario-grid">
                <article
                  v-for="scenario in uiReport.scenarios"
                  :key="scenario.name"
                  class="pana-info-card"
                >
                  <h5>{{ scenario.name }}</h5>
                  <p v-if="scenario.impact"><strong>영향</strong>{{ scenario.impact }}</p>
                  <p v-if="scenario.response"><strong>대응</strong>{{ scenario.response }}</p>
                </article>
              </div>
            </section>

            <section v-if="uiReport.actions.length" class="pana-section">
              <div class="pana-section-head">
                <h4 class="pana-section-title">우선순위 액션</h4>
              </div>
              <ol class="pana-action-list">
                <li v-for="(action, idx) in uiReport.actions" :key="idx">
                  <span>{{ idx + 1 }}</span>
                  <p>{{ action }}</p>
                </li>
              </ol>
            </section>

            <section v-if="uiReport.notes.length" class="pana-section">
              <div class="pana-section-head">
                <h4 class="pana-section-title">{{ uiReport.account?.notesTitle || '추가 체크포인트' }}</h4>
              </div>
              <div class="pana-note-grid">
                <article v-for="note in uiReport.notes" :key="note.title" class="pana-info-card">
                  <h5>{{ note.title }}</h5>
                  <p>{{ note.text }}</p>
                </article>
              </div>
            </section>

            <section v-if="uiReport.question" class="pana-question">
              <div class="pana-eyebrow">Critical Question</div>
              <p>{{ uiReport.question }}</p>
            </section>
          </template>
          <MarkdownView v-else :text="report" />

          <div class="pana-meta">
            <span class="pana-provider-tag">{{ providerName }}<span v-if="model"> · {{ model }}</span></span>
            <span v-if="analyzedAt" class="pana-time">{{ formatTime(analyzedAt) }}</span>
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
import MarkdownView from '@/components/common/MarkdownView.vue';
import { apiErrorMessage } from '@/utils/apiError';
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

function parseReportPayload(value) {
  if (value && typeof value === 'object') return value;
  return parseJsonReport(value);
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

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function findValue(obj, keys) {
  if (!obj || typeof obj !== 'object') return '';
  const foundKey = keys.find((key) => Object.prototype.hasOwnProperty.call(obj, key));
  return foundKey ? obj[foundKey] : '';
}

function normalizeRows(rawRows, headers = []) {
  if (!rawRows) return [];
  if (typeof rawRows === 'string') {
    const tokens = rawRows.split(',').map((item) => item.trim()).filter(Boolean);
    const width = headers.length || 7;
    const rows = [];
    for (let i = 0; i < tokens.length; i += width) rows.push(tokens.slice(i, i + width));
    return rows;
  }
  return Array.isArray(rawRows) ? rawRows : [];
}

function rowValue(row, headers, aliases, index) {
  if (Array.isArray(row)) return row[index] ?? '';
  const byAlias = findValue(row, aliases);
  if (byAlias !== '') return byAlias;
  const header = headers[index];
  return header && row ? row[header] : '';
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(num) ? num : null;
}

function normalizeAction(value, change = null) {
  const raw = String(value || '').trim().toUpperCase();
  if (['ADD', 'BUY', '추가매수', '비중 확대', '확대'].some((v) => raw.includes(v))) return 'ADD';
  if (['CUT_LOSS', 'STOP_LOSS', '손절', '손절 검토'].some((v) => raw.includes(v))) return 'CUT_LOSS';
  if (['TAKE_PROFIT', 'PROFIT', '이익실현', '차익실현'].some((v) => raw.includes(v))) return 'TAKE_PROFIT';
  if (['REDUCE', 'TRIM', '축소', '비중 축소', '감소', '줄이기'].some((v) => raw.includes(v))) return 'REDUCE';
  if (['WATCH', '관망', '점검', '주의', '위험', '리밸런싱', '변동성', '공격적'].some((v) => raw.includes(v))) return 'WATCH';
  if (['HOLD', '보유', '유지', '안정', '안전', '양호', '좋음', '장기'].some((v) => raw.includes(v))) return 'HOLD';

  const delta = toNumber(change);
  if (delta !== null) {
    if (delta >= 2) return 'ADD';
    if (delta <= -15) return 'REDUCE';
    if (delta <= -5) return 'REDUCE';
    return 'HOLD';
  }
  return 'WATCH';
}

function actionFromRow(row, headers, change) {
  return normalizeAction(rowValue(row, headers, [
    '액션', 'action', 'recommendation', 'decision', 'signal', 'suggestion',
  ], 7), change);
}

const ACCOUNT_REPORT_UI = {
  stock: {
    badge: 'AI',
    heroEyebrow: '포트폴리오 건강 점수',
    holdingTitle: '종목별 액션',
    holdingHint: 'AI 판단',
    notesTitle: '추가 체크포인트',
  },
  isa: {
    badge: 'ISA',
    heroEyebrow: 'ISA 계좌 진단',
    holdingTitle: '보유 자산별 판단',
    holdingHint: '절세 계좌 관점',
    notesTitle: 'ISA 체크포인트',
  },
  irp: {
    badge: 'IRP',
    heroEyebrow: '퇴직연금 IRP 계좌 진단',
    holdingTitle: '보유 자산별 판단',
    holdingHint: '은퇴자산 관점',
    notesTitle: 'IRP 체크포인트',
  },
};

const ACCOUNT_SECTION_KEYWORDS = [
  '종합 진단', '계좌 종합', '포트폴리오 진단', '요약',
  '위험 점검', '리스크', '스트레스',
  '현금성', '현금',
  '보유 자산별', '보유 종목별', '자산별 판단', '보유 자산', '보유 종목',
  '리밸런싱', '우선순위', '액션',
  '참고', '공지', '고지', '주의', '체크포인트', '메모', '자산 구성',
];

const REPORT_METADATA_KEYS = new Set([
  'blocked', 'retryAt', 'providerName', 'provider', 'model', 'analyzedAt',
  'providersStatus', 'createdAt', 'updatedAt',
]);

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

function normalizeAnalysisAccount(context = {}, rawText = '') {
  const source = [
    context?.accountType,
    context?.accountLabel,
    context?.accountNote,
    rawText,
  ].filter(Boolean).join(' ').toLowerCase();

  if (source.includes('irp') || source.includes('퇴직연금')) return 'irp';
  if (source.includes('isa')) return 'isa';
  return 'stock';
}

function accountReportMeta(type) {
  const normalizedType = type === 'isa' || type === 'irp' ? type : 'stock';
  return {
    type: normalizedType,
    ...ACCOUNT_REPORT_UI[normalizedType],
  };
}

function sectionTitleLooksKnown(title) {
  const normalized = cleanInlineText(title);
  return ACCOUNT_SECTION_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function pushAccountSection(sections, section) {
  const title = cleanInlineText(section?.title);
  const text = cleanInlineText(section?.text);
  if (title && text) sections.push({ title, text });
}

function extractTextSections(value) {
  const text = stripMarkdownSyntax(value);
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const sections = [];
  let current = null;

  lines.forEach((rawLine) => {
    const line = rawLine.replace(/^\d+[.)]\s*/, '').replace(/^[-*]\s*/, '').trim();
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      pushAccountSection(sections, current);
      current = { title: heading[1], text: '' };
      return;
    }

    const labeled = line.match(/^([^:：]{2,60})[:：]\s*(.+)$/);
    if (labeled && sectionTitleLooksKnown(labeled[1])) {
      pushAccountSection(sections, current);
      current = { title: labeled[1], text: labeled[2] };
      return;
    }

    if (current) {
      current.text = [current.text, line].filter(Boolean).join('\n');
    } else {
      current = { title: '요약', text: line };
    }
  });

  pushAccountSection(sections, current);
  return sections;
}

function extractObjectSections(value) {
  if (!value || typeof value !== 'object') return [];
  if (typeof value.report === 'string' || (value.report && typeof value.report === 'object')) {
    const nestedSections = extractAccountSections(value.report);
    if (nestedSections.length) return nestedSections;
  }

  const root = value.portfolio_analysis || value.portfolioAnalysis || value.analysis || value;
  if (typeof root === 'string') return extractTextSections(root);
  if (!root || typeof root !== 'object') return [];

  // Handle {sections: [{heading, content}]} structure from AI JSON output
  const rawSectionsList = root.sections || root.items || root.checkpoints;
  if (Array.isArray(rawSectionsList) && rawSectionsList.length > 0 &&
      rawSectionsList.some((s) => s && typeof s === 'object' &&
        ('heading' in s || 'content' in s || ('title' in s && 'text' in s)))) {
    const expanded = rawSectionsList
      .map((s) => {
        if (typeof s === 'string') return { title: '요약', text: stripMarkdownSyntax(s).trim() };
        if (!s || typeof s !== 'object') return null;
        const rawTitle = pickText(s, ['heading', 'title', 'name', 'label']) || '';
        const title = cleanInlineText(rawTitle).replace(/^#{1,6}\s+/, '');
        const rawText = pickText(s, ['content', 'text', 'body', 'description']) || '';
        const text = stripMarkdownSyntax(rawText).trim();
        return { title, text };
      })
      .filter(Boolean)
      .filter((s) => s.title && s.text);
    if (expanded.length) return expanded;
  }

  return Object.entries(root)
    .filter(([key, val]) => !REPORT_METADATA_KEYS.has(key) && val !== null && val !== undefined && val !== '')
    .map(([key, val]) => ({
      title: cleanInlineText(String(key).replace(/_/g, ' ')),
      text: cleanInlineText(formatValue(val)),
    }))
    .filter((section) => section.title && section.text);
}

function extractAccountSections(value) {
  if (!value) return [];
  if (typeof value === 'string') return extractTextSections(value);
  if (typeof value === 'object') return extractObjectSections(value);
  return [];
}

function sectionIncludes(section, keywords) {
  const title = section?.title || '';
  return keywords.some((keyword) => title.includes(keyword));
}

function findSection(sections, keywords, exclude = new Set()) {
  return sections.find((section) => !exclude.has(section) && sectionIncludes(section, keywords));
}

function splitListItems(text) {
  return stripMarkdownSyntax(text)
    .replace(/\s+\/\s+/g, '\n')
    .replace(/[;；]/g, '\n')
    .split('\n')
    .map((line) => cleanInlineText(line.replace(/^\d+[.)]\s*/, '').replace(/^[-*]\s*/, '')))
    .filter(Boolean);
}

function splitKeyValueItems(text) {
  return splitListItems(text)
    .map((item) => {
      const match = item.match(/^([^:：]{2,50})[:：]\s*(.+)$/);
      return match ? { key: cleanInlineText(match[1]), value: cleanInlineText(match[2]) } : null;
    })
    .filter(Boolean);
}

function normalizeIdentity(value) {
  return String(value || '').replace(/\s+/g, '').toUpperCase();
}

function contextHoldings(context) {
  return Array.isArray(context?.holdings) ? context.holdings : [];
}

function matchContextHolding(name, context) {
  const holdings = contextHoldings(context);
  const normalizedName = normalizeIdentity(name);
  const isCashName = /현금|CASH/i.test(name || '');

  if (isCashName) {
    return holdings.find((holding) =>
      String(holding.assetType || '').toUpperCase() === 'CASH' ||
      /현금|CASH/i.test(holding.name || ''),
    ) || null;
  }

  return holdings.find((holding) => {
    const identities = [holding.name, holding.symbol, holding.ticker]
      .map(normalizeIdentity)
      .filter(Boolean);
    return identities.some((identity) =>
      normalizedName.includes(identity) || identity.includes(normalizedName),
    );
  }) || null;
}

function parseHoldingJudgements(text, context) {
  const parts = stripMarkdownSyntax(text)
    .split(/\n|(?:\s+\/\s+)(?=[^/：:]{2,80}[：:])/)
    .map((part) => cleanInlineText(part))
    .filter(Boolean);

  return parts
    .map((part, idx) => {
      const match = part.match(/^(.{2,80}?)[：:]\s*(.+)$/);
      if (!match) return null;

      const label = cleanInlineText(match[1]);
      const reason = cleanInlineText(match[2]);
      const matchedHolding = matchContextHolding(label, context);
      const assetType = String(matchedHolding?.assetType || (/현금|CASH/i.test(label) ? 'CASH' : 'STOCK')).toUpperCase();

      return {
        key: `account-holding-${matchedHolding?.id || matchedHolding?.symbol || idx}`,
        name: matchedHolding?.name || label,
        ticker: matchedHolding?.symbol || '',
        country: matchedHolding?.market || '',
        sector: '',
        currentWeight: toNumber(matchedHolding?.weightPct ?? matchedHolding?.chartWeightPct),
        proposedWeight: null,
        change: null,
        assetType,
        action: normalizeAction(reason),
        reason,
      };
    })
    .filter(Boolean);
}

function scenarioFromRiskSection(section) {
  const pairs = splitKeyValueItems(section.text);
  const impact = pairs.find((item) => /요인|영향|위험/i.test(item.key))?.value;
  const response = pairs.find((item) => /관리|대응|방어|전략/i.test(item.key))?.value;

  return {
    name: section.title || '위험 점검',
    impact: impact || cleanInlineText(section.text),
    response: response || '',
  };
}

function buildAccountUiReport(raw, context = {}) {
  const rawText = typeof raw === 'string' ? raw : formatValue(raw);
  const accountType = normalizeAnalysisAccount(context, rawText);
  if (accountType !== 'isa' && accountType !== 'irp') return null;

  const sections = extractAccountSections(raw);
  if (!sections.length) return null;

  const meta = accountReportMeta(accountType);
  const summarySection = findSection(sections, ['종합 진단', '계좌 종합', '포트폴리오 진단', '요약']) || sections[0];
  const holdingSection = findSection(sections, ['보유 자산별', '보유 종목별', '자산별 판단', '보유 자산', '보유 종목']);
  const riskSection = findSection(sections, ['위험 점검', '리스크', '스트레스']);
  const cashSection = findSection(sections, ['현금성', '현금']);

  const used = new Set([summarySection, holdingSection, riskSection].filter(Boolean));
  const actionSection = findSection(sections, ['우선순위', '액션'], used) ||
    sections.find((section) => !used.has(section) && sectionIncludes(section, ['리밸런싱']) && section !== cashSection);
  if (actionSection) used.add(actionSection);

  const rawHoldings = holdingSection ? parseHoldingJudgements(holdingSection.text, context) : [];
  const ctxList = contextHoldings(context);
  const anyMatchesContext = !ctxList.length || rawHoldings.some((h) => {
    const n = normalizeIdentity(h.name);
    return ctxList.some((ch) =>
      [ch.name, ch.symbol, ch.ticker].map(normalizeIdentity).filter(Boolean)
        .some((id) => n.includes(id) || id.includes(n)));
  });
  const holdings = anyMatchesContext ? rawHoldings : [];
  const actions = actionSection ? splitListItems(actionSection.text) : [];
  const scenarios = riskSection ? [scenarioFromRiskSection(riskSection)].filter((scenario) => scenario.impact || scenario.response) : [];
  const notes = sections
    .filter((section) => !used.has(section) && section.text)
    .map((section) => ({ title: section.title, text: section.text }))
    .slice(0, 6);

  if (!summarySection?.text && !holdings.length && !actions.length && !scenarios.length && !notes.length) {
    return null;
  }

  return {
    account: meta,
    health: {
      score: null,
      scoreUnit: '',
      prescription: summarySection?.title || `${meta.badge} AI 진단`,
      summary: summarySection?.text || '',
    },
    holdings,
    weights: [],
    scenarios,
    actions,
    notes,
    question: '',
  };
}

function buildUiReport(json) {
  const root = json?.portfolio_analysis || json?.portfolioAnalysis || json?.analysis || json;
  if (!root || typeof root !== 'object') return null;

  const health = root.portfolio_health_check ||
    root.portfolioHealthCheck ||
    root.health_check ||
    root.healthCheck ||
    root.health;
  const weightBlock = root.portfolio_status_and_proposed_weights ||
    root.portfolioStatusAndProposedWeights ||
    root.portfolio_summary_and_proposal ||
    root.portfolioSummaryAndProposal ||
    root.proposed_weights ||
    root.weights;
  const headers = weightBlock?.table_headers || weightBlock?.headers || [];
  const weightRows = weightBlock?.table ||
    weightBlock?.table_data ||
    weightBlock?.rows ||
    weightBlock;
  const weights = normalizeRows(weightRows, headers)
    .map((row, idx) => ({
      key: `${idx}-${formatValue(row).slice(0, 24)}`,
      name: rowValue(row, headers, ['종목명', 'name', 'stockName', 'stock_name'], 0) || `종목 ${idx + 1}`,
      ticker: rowValue(row, headers, ['티커', 'ticker', 'symbol'], 1),
      country: rowValue(row, headers, ['국가', 'country', 'market'], 2),
      sector: rowValue(row, headers, ['섹터', 'sector'], 3),
      currentWeight: toNumber(rowValue(row, headers, [
        '현재 비중 (%)', '현재비중', 'currentWeight', 'current_weight', 'current_weight_pct',
      ], 4)),
      proposedWeight: toNumber(rowValue(row, headers, [
        '제안 비중 (%)', '제안비중', 'proposedWeight', 'proposed_weight', 'proposed_weight_pct',
      ], 5)),
      change: toNumber(rowValue(row, headers, [
        '변동 (%)', '변동', 'change', 'delta', 'change_pct',
      ], 6)),
      reason: pickText(row, ['조정 이유', 'reason', 'reasonForAdjustment', 'reason_for_adjustment']),
    }))
    .filter((row) => row.name);

  const actionRows = root.holdings ||
    root.holding_actions ||
    root.holdingActions ||
    root.stock_actions ||
    root.stockActions ||
    root.individual_stock_analysis ||
    root.individualStockAnalysis ||
    root.stock_analysis ||
    root.stockAnalysis ||
    root.positions;
  const actionHeaders = actionRows?.table_headers || actionRows?.headers || [];
  const parsedHoldings = normalizeRows(actionRows?.table || actionRows?.table_data || actionRows?.rows || actionRows, actionHeaders)
    .map((row, idx) => {
      const change = toNumber(rowValue(row, actionHeaders, [
        '변동 (%)', '변동', 'change', 'delta', 'change_pct',
      ], 6));
      return {
        key: `act-${idx}-${formatValue(row).slice(0, 24)}`,
        name: rowValue(row, actionHeaders, ['종목명', 'name', 'stockName', 'stock_name'], 0) || `종목 ${idx + 1}`,
        ticker: rowValue(row, actionHeaders, ['티커', 'ticker', 'symbol'], 1),
        country: rowValue(row, actionHeaders, ['국가', 'country', 'market'], 2),
        sector: rowValue(row, actionHeaders, ['섹터', 'sector'], 3),
        currentWeight: toNumber(rowValue(row, actionHeaders, [
          '현재 비중 (%)', '현재비중', 'currentWeight', 'current_weight', 'current_weight_pct',
        ], 4)),
        proposedWeight: toNumber(rowValue(row, actionHeaders, [
          '제안 비중 (%)', '제안비중', 'proposedWeight', 'proposed_weight', 'proposed_weight_pct',
        ], 5)),
        change,
        action: actionFromRow(row, actionHeaders, change),
        reason: pickText(row, [
          '분석', '근거', '조정 이유', 'reason', 'analysis', 'comment',
          'reasonForAdjustment', 'reason_for_adjustment',
        ]),
      };
    })
    .filter((row) => row.name);

  const holdings = parsedHoldings.length > 0
    ? parsedHoldings
    : weights.map((row) => ({
      ...row,
      key: `weight-action-${row.key}`,
      action: normalizeAction('', row.change),
      reason: row.reason || 'AI가 별도 종목 코멘트를 제공하지 않아 제안 비중 변화를 기준으로 액션을 산정했습니다.',
    }));

  const scenarios = asArray(root.stress_test ||
    root.stressTest ||
    root.stress_test_scenarios ||
    root.stressTestScenarios ||
    root.scenarios)
    .map((scenario, idx) => ({
      name: pickText(scenario, ['scenario_name', 'scenarioName', 'name', 'title']) || `시나리오 ${idx + 1}`,
      impact: pickText(scenario, ['impact', 'effect', 'summary']),
      response: pickText(scenario, ['response', 'hedge', 'hedge_plan', 'hedgePlan', 'strategy', 'action']),
    }))
    .filter((scenario) => scenario.impact || scenario.response);

  const actions = asArray(root.action_items || root.actionItems || root.priorityActions || root.actions || root.nextSteps)
    .map((item) => formatValue(item))
    .filter(Boolean);

  const notes = [
    ['리밸런싱 전략', root.rebalancing_strategy || root.rebalancingStrategy],
    ['핵심 리스크', root.key_risks || root.keyRisks || root.risk || root.riskSummary],
    ['투자 관점', root.investment_view || root.investmentView || root.outlook],
    ['데이터 기준일', root.api_data_as_of || root.apiDataAsOf || root.data_as_of || root.dataAsOf],
  ]
    .map(([title, value]) => ({ title, text: formatValue(value) }))
    .filter((note) => note.text);

  const healthCard = health && typeof health === 'object'
    ? {
      score: pickText(health, ['score', 'rating']),
      prescription: pickText(health, ['prescription', 'title', 'diagnosis']),
      summary: formatValue(pickText(health, ['summary', 'comment', 'reason']) || health.key_issues || health.keyIssues),
    }
    : null;

  if (!healthCard && !holdings.length && !weights.length && !scenarios.length && !actions.length && !notes.length) {
    return null;
  }

  return {
    health: healthCard,
    holdings,
    weights,
    scenarios,
    actions,
    notes,
    question: pickText(root, ['critical_question', 'criticalQuestion', 'question']),
  };
}

function contextHoldingActions(context) {
  return (context?.holdings || [])
    .filter((h) => h && h.name)
    .map((h, idx) => {
      const assetType = String(h.assetType || 'STOCK').toUpperCase();
      return {
        key: `ctx-action-${h.id || h.symbol || idx}`,
        name: h.name,
        ticker: h.symbol,
        country: h.market,
        sector: '',
        currentWeight: toNumber(h.weightPct ?? h.chartWeightPct),
        proposedWeight: null,
        change: null,
        assetType,
        action: 'WATCH',
        reason: assetType === 'CASH'
          ? 'AI가 현금성 자산에 대한 별도 판단을 제공하지 않았습니다. 리밸런싱 여력으로 표시합니다.'
          : 'AI가 이 종목에 대한 개별 액션을 제공하지 않았습니다. 현재 비중과 최신 뉴스 확인 후 관망으로 표시합니다.',
      };
    });
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
  const title = pickText(data, ['title', 'headline']) || '포트폴리오 AI 진단';
  const summary = pickText(data, ['summary', 'overallSummary', 'overall', 'comment', 'diagnosis']);
  const sentiment = pickText(data, ['sentiment', 'marketSentiment']);

  sections.push(`# ${title}`);
  if (summary) sections.push(`> ${summary}`);
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

  const holdings = data.holdings || data.holdingAnalysis || data.positions;
  const holdingLines = formatBulletItems(holdings, (item) => {
    const name = pickText(item, ['name', 'stockName', 'symbol', 'ticker']) || formatValue(item);
    const action = pickText(item, ['action', 'recommendation', 'signal']);
    const reason = pickText(item, ['reason', 'comment', 'analysis']);
    return `**${name}**${action ? ` (${action})` : ''}${reason ? ` - ${reason}` : ''}`;
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

  const extraEntries = Object.entries(data).filter(([key]) => ![
    'title', 'headline', 'summary', 'overallSummary', 'overall', 'comment', 'diagnosis',
    'sentiment', 'marketSentiment', 'grades', 'score', 'scores', 'holdings',
    'holdingAnalysis', 'positions', 'recommendations', 'recommendedStocks', 'recs',
    'priorityActions', 'actions', 'nextSteps', 'scenarios', 'scenario', 'risk',
    'riskSummary', 'caution',
  ].includes(key));
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

function normalizeReport(value) {
  if (value && typeof value === 'object') return jsonReportToMarkdown(value);
  const parsed = parseJsonReport(value);
  return parsed ? jsonReportToMarkdown(parsed) : (value || '');
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
    const loading = ref(false);
    const error = ref('');
    const blocked = ref(false);
    const result = ref(null);     // (구버전) 구조화 결과 — 자유리포트 전환 후 미사용
    const report = ref('');
    const uiReport = ref(null);
    const providerName = ref('');
    const model = ref('');
    const analyzedAt = ref(null);
    const retryAt = ref(null);
    const providersStatus = ref([]);

    const loadingMessages = [
      '보유 종목의 현재가와 비중을 계산하는 중...',
      'KRX·Yahoo 재무 데이터와 시장 뉴스를 확인하는 중...',
      'AI가 종목별 액션과 리밸런싱 전략을 정리하는 중...',
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
      report.value = '';
      uiReport.value = null;
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
        });
        const data = res.data || {};
        if (data.blocked) {
          blocked.value = true;
          retryAt.value = data.retryAt ? new Date(data.retryAt) : null;
          providersStatus.value = data.providersStatus || [];
        } else {
          const parsedReport = parseReportPayload(data.report);
          const parsedUiReport = buildUiReport(parsedReport || data) ||
            buildAccountUiReport(parsedReport || data.report || data, context);
          if (parsedUiReport && parsedUiReport.holdings.length === 0) {
            parsedUiReport.holdings = contextHoldingActions(context);
          }
          uiReport.value = parsedUiReport;
          report.value = uiReport.value ? '' : normalizeReport(data.report || data);
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
    const hasProposedWeights = computed(() =>
      (uiReport.value?.weights || []).some((row) => row.proposedWeight !== null && row.proposedWeight !== undefined),
    );

    const gradeItems = computed(() => {
      const g = result.value?.grades;
      if (!g) return [];
      return [
        { key: 'diversification', label: '분산', ...(g.diversification || {}) },
        { key: 'risk', label: '리스크', ...(g.risk || {}) },
        { key: 'growth', label: '성장성', ...(g.growth || {}) },
      ].filter((x) => x.grade || x.comment);
    });
    const hasGrades = computed(() => gradeItems.value.length > 0);

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
        ADD: '비중 확대',
        TAKE_PROFIT: '이익실현',
        HOLD: '보유',
        CUT_LOSS: '손절 검토',
        WATCH: '관망',
      }[a] || '보유';
    }
    function actionIcon(a) {
      return {
        ADD: '➕',
        TAKE_PROFIT: '💰',
        HOLD: '✋',
        CUT_LOSS: '🚪',
        WATCH: '👀',
      }[a] || '✋';
    }
    function actionCls(a) {
      return ('act-' + (a || 'HOLD').toLowerCase()).replace('_', '-');
    }
    function gradeCls(g) {
      const c = (g || '').trim().toUpperCase().charAt(0);
      if (c === 'A' || c === 'B') return 'grade-good';
      if (c === 'C') return 'grade-mid';
      if (c === 'D' || c === 'F' || c === 'E') return 'grade-bad';
      return 'grade-mid';
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
    function formatPercent(value) {
      if (value === null || value === undefined || value === '') return '-';
      return `${Number(value).toFixed(1)}%`;
    }
    function formatSignedPercent(value) {
      if (value === null || value === undefined || value === '') return '';
      const num = Number(value);
      return `${num > 0 ? '+' : ''}${num.toFixed(1)}%`;
    }
    function weightChangeClass(value) {
      const num = Number(value);
      if (!Number.isFinite(num) || num === 0) return 'is-flat';
      return num > 0 ? 'is-up' : 'is-down';
    }
    function actionText(action) {
      return {
        ADD: '추가매수',
        REDUCE: '비중 축소',
        TAKE_PROFIT: '이익실현',
        CUT_LOSS: '손절 검토',
        HOLD: '보유',
        WATCH: '관망',
      }[action] || '관망';
    }
    function actionBadgeClass(action) {
      return `act-${String(action || 'WATCH').toLowerCase().replace('_', '-')}`;
    }

    return {
      loading, error, blocked, result, report, uiReport,
      providerName, model, analyzedAt,
      retryCountdown, cooldownSec, allDisabled, hasProposedWeights,
      loadingText,
      hasGrades, gradeItems, gradeCls,
      fetchAnalysis,
      sentimentCls, sentimentIcon,
      actionLabel, actionIcon, actionCls,
      pnlCls, fmtPnl, formatTime,
      formatPercent, formatSignedPercent, weightChangeClass,
      actionText, actionBadgeClass,
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

.pana-hero-card {
  padding: 16px;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(124, 111, 255, 0.16), rgba(106, 173, 106, 0.08));
  border: 1px solid rgba(124, 111, 255, 0.28);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.pana-score-wrap {
  display: flex;
  align-items: center;
  gap: 14px;
}
.pana-score-ring {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  border: 5px solid rgba(224, 177, 94, 0.55);
  background: rgba(10, 10, 18, 0.38);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.pana-score-ring strong {
  color: #f0ece4;
  font-size: 1.35rem;
  line-height: 1;
}
.pana-score-ring span {
  color: var(--text-muted);
  font-size: 11px;
  margin-top: 2px;
}
.pana-account-badge {
  width: 70px;
  height: 70px;
  border-radius: 18px;
  background: rgba(224, 177, 94, 0.16);
  border: 1px solid rgba(224, 177, 94, 0.36);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
  color: #e0b15e;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: 0.04em;
}
.pana-eyebrow {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}
.pana-hero-title {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.05rem;
  line-height: 1.35;
}
.pana-hero-summary {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
}
.pana-section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.pana-section-hint {
  color: var(--text-muted);
  font-size: 11px;
  white-space: nowrap;
}
.pana-stock-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pana-stock-card {
  padding: 12px 14px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.028);
  border: 1px solid var(--card-border);
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.pana-stock-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}
.pana-stock-name {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.pana-stock-name strong {
  color: var(--text-primary);
  font-size: 14px;
}
.pana-stock-name span {
  color: var(--text-muted);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pana-action-badge {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}
.pana-action-badge.act-add { color: #8fce8f; background: rgba(106, 173, 106, 0.18); }
.pana-action-badge.act-reduce { color: #e0b15e; background: rgba(224, 177, 94, 0.18); }
.pana-action-badge.act-take-profit { color: #a8c8f0; background: rgba(125, 175, 240, 0.18); }
.pana-action-badge.act-cut-loss { color: #e89a9a; background: rgba(196, 90, 90, 0.20); }
.pana-action-badge.act-hold { color: #d8d8e0; background: rgba(138, 133, 128, 0.14); }
.pana-action-badge.act-watch { color: #c9c2e6; background: rgba(124, 111, 255, 0.16); }
.pana-stock-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.pana-stock-metrics span {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(10, 10, 18, 0.28);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 700;
}
.pana-stock-metrics span.is-up { color: #8fce8f; background: rgba(106, 173, 106, 0.12); }
.pana-stock-metrics span.is-down { color: #e89a9a; background: rgba(196, 90, 90, 0.14); }
.pana-stock-metrics span.is-flat { color: var(--text-muted); }
.pana-stock-reason {
  margin: 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.55;
}
.pana-weight-list {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--card-border);
  border-radius: 8px;
  overflow: hidden;
}
.pana-weight-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.025);
}
.pana-weight-row + .pana-weight-row { border-top: 1px solid var(--card-border); }
.pana-weight-top {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}
.pana-weight-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.pana-weight-main strong {
  color: var(--text-primary);
  font-size: 13px;
}
.pana-weight-main span {
  color: var(--text-muted);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pana-weight-values {
  display: grid;
  grid-template-columns: 48px 14px 48px 58px;
  gap: 6px;
  align-items: center;
  justify-items: end;
  color: var(--text-secondary);
  font-size: 12px;
  white-space: nowrap;
}
.pana-weight-values strong { color: var(--text-primary); }
.pana-arrow { color: var(--text-muted); justify-self: center; }
.pana-weight-values em {
  font-style: normal;
  font-weight: 700;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 999px;
}
.pana-weight-values em.is-up { color: #8fce8f; background: rgba(106, 173, 106, 0.14); }
.pana-weight-values em.is-down { color: #e89a9a; background: rgba(196, 90, 90, 0.16); }
.pana-weight-values em.is-flat { color: var(--text-muted); background: rgba(138, 133, 128, 0.12); }
.pana-weight-reason {
  margin: 0;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(10, 10, 18, 0.28);
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.55;
}
.pana-scenario-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 10px;
}
.pana-note-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.pana-info-card {
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--card-bg-hover);
  border: 1px solid var(--card-border);
}
.pana-info-card h5 {
  margin: 0 0 8px;
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.35;
}
.pana-info-card p {
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}
.pana-info-card p strong {
  display: block;
  margin-bottom: 4px;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.pana-action-list {
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  list-style: none;
}
.pana-action-list li {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr);
  gap: 10px;
  align-items: flex-start;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(125, 175, 240, 0.07);
  border: 1px solid rgba(125, 175, 240, 0.16);
}
.pana-action-list span {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(224, 177, 94, 0.22);
  color: #e0b15e;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
}
.pana-action-list p {
  margin: 2px 0 0;
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.55;
}
.pana-question {
  padding: 14px 16px;
  border-radius: 8px;
  background: rgba(224, 177, 94, 0.10);
  border: 1px solid rgba(224, 177, 94, 0.28);
}
.pana-question p {
  margin: 4px 0 0;
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.6;
  font-weight: 600;
}

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
.pana-holding-card.act-add         { border-left-color: #e0b15e; }
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
.pana-action-pill.act-add         { background: rgba(224, 177, 94, 0.22);  color: #e0b15e; }
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
  white-space: nowrap;
}
.pana-rec-source.src-news { background: rgba(125, 175, 240, 0.18); color: #a8c8f0; }
.pana-rec-source.src-held { background: rgba(106, 173, 106, 0.20); color: #8fce8f; }
.pana-rec-badges { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }

.pana-rec-news {
  font-size: 12px;
  color: var(--text-secondary);
  background: rgba(125, 175, 240, 0.08);
  border-left: 2px solid var(--accent);
  border-radius: 4px;
  padding: 6px 10px;
  margin-bottom: 8px;
  line-height: 1.45;
}

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

/* 거시 정합성 */
.pana-macro {
  display: flex; gap: 8px; align-items: flex-start;
  font-size: 13px; color: var(--text-secondary); line-height: 1.5;
  padding: 2px 2px;
}

/* 종합 등급 */
.pana-grades {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.pana-grade-card {
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--card-bg-hover);
  border: 1px solid var(--card-border);
  display: flex; flex-direction: column; gap: 6px;
}
.pana-grade-top { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.pana-grade-label { font-size: 12px; color: var(--text-secondary); font-weight: 600; }
.pana-grade-badge {
  font-size: 13px; font-weight: 800;
  min-width: 24px; height: 24px; padding: 0 6px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 6px;
}
.pana-grade-badge.grade-good { background: rgba(106, 173, 106, 0.20); color: #8fce8f; }
.pana-grade-badge.grade-mid  { background: rgba(224, 177, 94, 0.20);  color: #e0b15e; }
.pana-grade-badge.grade-bad  { background: rgba(196, 90, 90, 0.22);   color: #e89a9a; }
.pana-grade-comment { font-size: 11px; color: var(--text-muted); line-height: 1.45; }

/* 핵심 / 취약 고리 */
.pana-keys {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.pana-key-card {
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--card-bg-hover);
  border-left: 3px solid var(--card-border);
  display: flex; flex-direction: column; gap: 6px;
}
.pana-key-card.key-core { border-left-color: #8fce8f; }
.pana-key-card.key-weak { border-left-color: #e89a9a; }
.pana-key-head { font-size: 12px; font-weight: 700; color: var(--text-secondary); }
.pana-key-name { font-size: 14px; font-weight: 700; color: var(--text-primary); }
.pana-key-sym { font-size: 11px; color: var(--text-muted); font-weight: 500; }
.pana-key-reason { font-size: 12px; color: var(--text-secondary); line-height: 1.5; }

/* 우선순위 액션 */
.pana-actions {
  margin: 0; padding-left: 20px;
  display: flex; flex-direction: column; gap: 6px;
}
.pana-actions li {
  font-size: 13px; color: var(--text-primary); line-height: 1.5;
}

/* 시나리오 */
.pana-scenarios {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.pana-scenario {
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--card-bg-hover);
  border-left: 3px solid var(--card-border);
  display: flex; flex-direction: column; gap: 6px;
}
.pana-scenario.sc-bull { border-left-color: #8fce8f; }
.pana-scenario.sc-bear { border-left-color: #e89a9a; }
.pana-scenario-head { font-size: 13px; font-weight: 700; color: var(--text-primary); }
.pana-scenario-row { font-size: 12px; color: var(--text-secondary); line-height: 1.5; }
.pana-scenario-label {
  display: inline-block; min-width: 44px;
  color: var(--text-muted); font-weight: 600; margin-right: 6px;
}

/* 자기반박 */
.pana-rebuttal {
  font-size: 12px; color: var(--text-secondary); line-height: 1.55;
  padding: 10px 12px;
  background: rgba(125, 175, 240, 0.07);
  border: 1px dashed var(--card-border);
  border-radius: 8px;
}
.pana-rebuttal strong { color: var(--text-primary); }

.pana-footer-btns { display: flex; gap: 8px; justify-content: flex-end; }

@media (max-width: 640px) {
  .pana-score-wrap { align-items: flex-start; }
  .pana-score-ring { width: 58px; height: 58px; border-width: 4px; }
  .pana-account-badge { width: 58px; height: 58px; border-radius: 14px; font-size: 0.9rem; }
  .pana-score-ring strong { font-size: 1.1rem; }
  .pana-stock-head { grid-template-columns: 1fr; align-items: flex-start; }
  .pana-action-badge { width: fit-content; }
  .pana-weight-top { grid-template-columns: 1fr; gap: 8px; }
  .pana-weight-values {
    grid-template-columns: 46px 14px 46px 58px;
    justify-content: start;
  }
  .pana-scenario-grid,
  .pana-note-grid { grid-template-columns: 1fr; }
  .pana-rec-row { flex-direction: column; gap: 2px; }
  .pana-rec-label { min-width: 0; }
  .pana-meta { flex-direction: column; gap: 2px; }
  .pana-footer-btns { flex-direction: column-reverse; }
  .pana-footer-btns .btn { width: 100%; }
  .pana-grades { grid-template-columns: 1fr; }
  .pana-keys { grid-template-columns: 1fr; }
  .pana-scenarios { grid-template-columns: 1fr; }
}
</style>
