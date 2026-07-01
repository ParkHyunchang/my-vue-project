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
        <div v-else-if="report" class="pana-result">
          <MarkdownView :text="report" />

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

const STRUCTURED_KEY_LABELS = {
  add: '추가매수 후보',
  additional: '추가매수 후보',
  additionalBuy: '추가매수 후보',
  additional_buy: '추가매수 후보',
  buyCandidates: '추가매수 후보',
  buy_candidates: '추가매수 후보',
  addCandidates: '추가매수 후보',
  add_candidates: '추가매수 후보',
  cutLoss: '손절/축소 검토 후보',
  cut_loss: '손절/축소 검토 후보',
  reduce: '손절/축소 검토 후보',
  reduceCandidates: '손절/축소 검토 후보',
  reduce_candidates: '손절/축소 검토 후보',
  sellCandidates: '손절/축소 검토 후보',
  sell_candidates: '손절/축소 검토 후보',
  trimCandidates: '손절/축소 검토 후보',
  trim_candidates: '손절/축소 검토 후보',
  none: '해당 없음',
};

function humanizeKey(key) {
  const raw = String(key || '').trim();
  if (!raw) return '';
  return STRUCTURED_KEY_LABELS[raw] ||
    raw
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .trim();
}

function formatStructuredItem(item) {
  if (item === null || item === undefined || item === '') return '';
  if (typeof item !== 'object') return String(item);
  if (Array.isArray(item)) return formatStructuredText(item);

  const name = item.name || item.assetName || item.stockName || item.symbol || item.ticker || item.title || '';
  const symbol = item.symbol || item.ticker || '';
  const action = item.action || item.decision || item.recommendation || item.signal || '';
  const reason = item.reason || item.rationale || item.comment || item.analysis || item.basis || '';
  const risk = item.risk || item.risks || item.caution || item.warning || '';
  const source = item.source || item.newsBasis || item.news_basis || item.dataBasis || item.data_basis || '';

  if (name || reason || action || risk || source) {
    const label = [name, symbol && !String(name).includes(symbol) ? `(${symbol})` : '']
      .filter(Boolean)
      .join(' ')
      .trim();
    const details = [action, reason, risk ? `주의: ${formatValue(risk)}` : '', source ? `근거: ${formatValue(source)}` : '']
      .map(formatValue)
      .filter(Boolean);
    return [label || '후보', details.join(' - ')].filter(Boolean).join(': ');
  }

  return Object.entries(item)
    .map(([key, value]) => {
      const formatted = formatStructuredText(value);
      return formatted ? `${humanizeKey(key)}: ${formatted}` : '';
    })
    .filter(Boolean)
    .join(' / ');
}

function formatStructuredText(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value !== 'object') return String(value);
  if (Array.isArray(value)) {
    return value
      .map(formatStructuredItem)
      .filter(Boolean)
      .map((line) => (/^[-*]\s+/.test(line) ? line : `- ${line}`))
      .join('\n');
  }

  return Object.entries(value)
    .map(([key, val]) => {
      const label = humanizeKey(key);
      if (Array.isArray(val)) {
        const formatted = formatStructuredText(val);
        return formatted ? `${label}:\n${formatted}` : '';
      }
      if (val && typeof val === 'object') {
        const formatted = formatStructuredItem(val);
        return formatted ? `${label}: ${formatted}` : '';
      }
      const formatted = formatStructuredText(val);
      return formatted ? `${label}: ${formatted}` : '';
    })
    .filter(Boolean)
    .join('\n');
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
  if (['ADD', 'BUY', '추가매수', '추가 매수', '비중 확대', '확대'].some((v) => raw.includes(v))) return 'ADD';
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
    '판단', '액션', 'action', 'recommendation', 'decision', 'signal', 'suggestion',
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
    heroEyebrow: 'ISA 계좌 종합 진단',
    holdingTitle: '보유 자산별 판단',
    holdingHint: 'ISA 관점',
    notesTitle: 'ISA 체크포인트',
  },
  isa_infinite: {
    badge: 'ISA',
    heroEyebrow: '무한매수법 사이클 진단',
    holdingTitle: '보유 자산별 판단',
    holdingHint: '무한매수법 관점',
    notesTitle: '무한매수법 체크포인트',
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
  '종합 진단', '계좌 종합', '포트폴리오 진단', '요약', '사이클 종합', '무한매수법',
  '위험 점검', '리스크', '스트레스', '구조적',
  '현금성', '현금',
  '보유 자산별', '보유 종목별', '자산별 판단', '보유 자산', '보유 종목',
  '리밸런싱', '우선순위', '액션', '매수 전략',
  '추천', '후보', '추가매수', '손절', '축소',
  '시장 환경', '나스닥', '참고', '공지', '고지', '주의', '체크포인트', '메모', '자산 구성',
];

const REPORT_METADATA_KEYS = new Set([
  'blocked', 'retryAt', 'providerName', 'provider', 'model', 'analyzedAt',
  'providersStatus', 'createdAt', 'updatedAt',
]);

function stripMarkdownSyntax(value) {
  const source = value && typeof value === 'object' ? formatStructuredText(value) : String(value || '');
  return source
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

function cleanBlockText(value) {
  return stripMarkdownSyntax(value)
    .split('\n')
    .map((line) => line.replace(/^[\s>*•]+/, '').trim())
    .filter(Boolean)
    .join('\n')
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
  if (source.includes('isa_infinite') || source.includes('무한매수법')) return 'isa_infinite';
  if (source.includes('isa')) return 'isa';
  return 'stock';
}

function accountReportMeta(type) {
  const normalizedType = ['isa', 'isa_infinite', 'irp'].includes(type) ? type : 'stock';
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
  const text = cleanBlockText(section?.text);
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
      text: cleanBlockText(formatValue(val)),
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

function noteTextLines(text) {
  const normalized = cleanBlockText(text)
    .replace(/\s+(?=(?:추가매수 후보|손절\/축소 검토 후보|손절·축소 검토 후보|손절 검토 후보|축소 검토 후보)[:：])/g, '\n')
    .replace(/\n\s*\/\s*(?=\n|$)/g, '\n')
    .replace(/\s+\/\s+(?=(?:[-*]\s*)?[A-Za-z0-9가-힣][^:\n]{1,80}[:：])/g, '\n')
    .replace(/([:：])\s*[-*]\s+/g, '$1\n- ')
    .replace(/\s+[-*]\s+(?=[A-Za-z0-9가-힣][^:\n]{1,80}[:：])/g, '\n- ')
    .replace(/\s+[-*]\s+(?=[A-Za-z0-9가-힣].{1,80}\([^)]+\)[:：]?)/g, '\n- ');
  return normalized
    .split('\n')
    .map((line) => line.trim().replace(/^\/\s+/, '- '))
    .filter((line) => line && !/^\/+$/.test(line));
}

function isNoteSubheading(line) {
  return /^(추가매수 후보|손절\/축소 검토 후보|손절·축소 검토 후보|손절 검토 후보|축소 검토 후보)[:：]?$/.test(String(line || '').trim());
}

function isNoteBullet(line) {
  return /^[-*]\s+/.test(String(line || '').trim());
}

function noteLineText(line) {
  return String(line || '').trim().replace(/^[-*]\s+/, '');
}

function normalizeIdentity(value) {
  return String(value || '').replace(/\s+/g, '').toUpperCase();
}

function contextHoldings(context) {
  return Array.isArray(context?.holdings) ? context.holdings : [];
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function insertContextHoldingBreaks(text, context) {
  const labels = contextHoldings(context)
    .flatMap((holding) => [holding.name, holding.symbol])
    .map((label) => String(label || '').trim())
    .filter((label) => label.length >= 3)
    .sort((a, b) => b.length - a.length);

  return labels.reduce((out, label) => {
    const suffix = /^[A-Z0-9.-]+$/i.test(label)
      ? '\\s*[:：]'
      : '(?:\\s*\\([^)]+\\))?\\s*[:：]';
    const pattern = new RegExp(`([^\\n])\\s+(${escapeRegExp(label)}${suffix})`, 'gi');
    return out.replace(pattern, '$1\n$2');
  }, String(text || ''));
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

function signedPctText(value) {
  const num = toNumber(value);
  if (num === null) return null;
  return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
}

function pctText(value) {
  const num = toNumber(value);
  if (num === null) return null;
  return `${num.toFixed(1)}%`;
}

function accountRiskSnapshot(context) {
  return contextHoldings(context).reduce((acc, holding) => {
    const weight = toNumber(holding.weightPct ?? holding.chartWeightPct);
    if (weight === null) return acc;
    if (String(holding.assetType || '').toUpperCase() === 'CASH') acc.cashPct += weight;
    else acc.riskyPct += weight;
    return acc;
  }, { riskyPct: 0, cashPct: 0 });
}

function fallbackActionForHolding(holding, accountType, riskSnapshot) {
  const assetType = String(holding.assetType || 'STOCK').toUpperCase();
  const weight = toNumber(holding.weightPct ?? holding.chartWeightPct);
  const pnl = toNumber(holding.pnlPct);
  const change = toNumber(holding.changePercent);
  const basis = [
    weight !== null ? `현재 비중 ${pctText(weight)}` : '',
    pnl !== null ? `평가손익률 ${signedPctText(pnl)}` : '',
    change !== null ? `일변동률 ${signedPctText(change)}` : '',
  ].filter(Boolean).join(', ') || '현재 비중/손익률 데이터 부족';

  if (assetType === 'CASH') {
    const role = accountType === 'irp'
      ? 'IRP의 안전자산/대기자금 역할'
      : '리밸런싱 재원과 방어적 완충 역할';
    return { action: 'WATCH', reason: `${basis}. 현금성 자산은 ${role}로 보며, 개별 매수 액션보다 전체 비중 점검 대상입니다.` };
  }

  const weak = (pnl !== null && pnl <= -8) || (change !== null && change <= -3);
  const lowWeight = weight !== null && weight <= 7;
  const positive = (pnl !== null && pnl >= 0) || (change !== null && change >= 0.8);
  const resilient = (pnl !== null && pnl >= -3) || (change !== null && change >= -1) || holding.core;

  if (weak) {
    return { action: 'WATCH', reason: `${basis}. 손익 또는 단기 변동성이 약해 추가매수보다 뉴스와 회복 흐름 확인이 우선입니다.` };
  }

  if (lowWeight && positive) {
    if (accountType === 'irp' && (riskSnapshot.riskyPct >= 70 || riskSnapshot.cashPct < 30)) {
      return { action: 'WATCH', reason: `${basis}. 추가매수 후보지만 IRP 위험자산 70% 한도와 안전자산 30% 기준상 안전자산 비중 확인이 먼저입니다.` };
    }
    return { action: 'ADD', reason: `${basis}. 비중은 낮고 흐름은 양호해 소액 추가매수 후보로 분류합니다.` };
  }

  if (resilient) {
    return { action: 'HOLD', reason: `${basis}. 현재 보유 상태를 유지하면서 비중과 뉴스 흐름을 점검하는 쪽이 적절합니다.` };
  }

  return { action: 'WATCH', reason: `${basis}. 방향성이 뚜렷하지 않아 추가매수보다 관망으로 분류합니다.` };
}

function holdingJudgementFromParts(label, reason, context, idx, actionValue = '') {
  const matchedHolding = matchContextHolding(label, context);
  const assetType = String(matchedHolding?.assetType || (/현금|CASH/i.test(label) ? 'CASH' : 'STOCK')).toUpperCase();
  const cleanReason = truncateHoldingReason(reason, context, matchedHolding?.name || label);

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
    action: normalizeAction(actionValue || cleanReason),
    reason: cleanReason,
  };
}

function truncateHoldingReason(reason, context, currentLabel = '') {
  let text = cleanInlineText(reason);
  const markers = [
    '추가매수 후보', '손절/축소 검토 후보', '손절·축소 검토 후보',
    '손절 검토 후보', '축소 검토 후보', 'IRP 체크포인트', 'ISA 체크포인트',
  ];
  markers.forEach((marker) => {
    const idx = text.indexOf(marker);
    if (idx > 12) text = text.slice(0, idx).trim();
  });

  const current = normalizeIdentity(currentLabel);
  contextHoldings(context).forEach((holding) => {
    const names = [holding.name, holding.symbol].filter(Boolean);
    names.forEach((name) => {
      if (normalizeIdentity(name) === current) return;
      const pattern = new RegExp(`\\s+${escapeRegExp(name)}(?:\\s*\\([^)]+\\))?\\s*[:：]`, 'i');
      const match = text.match(pattern);
      if (match && match.index > 12) text = text.slice(0, match.index).trim();
    });
  });
  return text;
}

function headerIndex(headers, keywords) {
  const idx = headers.findIndex((header) => {
    const normalized = cleanInlineText(header).toLowerCase();
    return keywords.some((keyword) => normalized.includes(String(keyword).toLowerCase()));
  });
  return idx >= 0 ? idx : null;
}

function parseHoldingTableJudgements(text, context) {
  const rows = stripMarkdownSyntax(text)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.includes('|'));
  if (!rows.length) return [];

  let headers = null;
  const parsed = [];
  rows.forEach((line) => {
    const cells = line.split('|').map((cell) => cleanInlineText(cell)).filter(Boolean);
    if (cells.length < 2 || cells.every((cell) => /^:?-{2,}:?$/.test(cell))) return;

    if (!headers && cells.some((cell) => /자산|종목|티커|판단|액션|근거|설명/i.test(cell))) {
      headers = cells;
      return;
    }

    const nameIdx = headers ? (headerIndex(headers, ['자산', '종목', '이름', 'name']) ?? 0) : 0;
    const tickerIdx = headers ? headerIndex(headers, ['티커', 'symbol', 'ticker']) : null;
    const actionIdx = headers ? headerIndex(headers, ['판단', '액션', 'action']) : null;
    const reasonIdx = headers ? headerIndex(headers, ['근거', '설명', 'reason', 'comment']) : null;

    const name = cells[nameIdx] || cells[0];
    const ticker = tickerIdx !== null ? cells[tickerIdx] : '';
    const action = actionIdx !== null ? cells[actionIdx] : cells.find((cell) => /보유|추가매수|추가 매수|관망/i.test(cell)) || '';
    const reason = reasonIdx !== null ? cells[reasonIdx] : cells[cells.length - 1];
    const label = ticker && !name.includes(ticker) ? `${name} (${ticker})` : name;
    if (label && reason) parsed.push(holdingJudgementFromParts(label, `${action ? `${action} - ` : ''}${reason}`, context, parsed.length, action));
  });

  return parsed;
}

function parseHoldingJudgements(text, context) {
  const tableRows = parseHoldingTableJudgements(text, context);
  if (tableRows.length) return tableRows;

  const prepared = insertContextHoldingBreaks(stripMarkdownSyntax(text), context)
    .replace(/\s+(?=(?:추가매수 후보|손절\/축소 검토 후보|손절·축소 검토 후보|손절 검토 후보|축소 검토 후보)[:：])/g, '\n')
    .replace(/\s+(?=(?:[A-Za-z0-9가-힣][A-Za-z0-9가-힣\s&+·./-]{1,80}(?:\s*\([^)]+\))?|CASH-[A-Za-z0-9-]+)[:：]\s*(?:보유|추가매수|추가 매수|관망|손절|축소|ADD|HOLD|WATCH|CUT|REDUCE))/g, '\n');

  return prepared
    .split(/\n|(?:\s+\/\s+)(?=[^/：:]{2,80}[：:])/)
    .map((part) => cleanInlineText(part))
    .filter(Boolean);
}

function parsedHoldingItems(text, context) {
  return parseHoldingJudgements(text, context)
    .map((part, idx) => {
      const match = part.match(/^(.{2,80}?)[：:]\s*(.+)$/);
      if (!match) return null;

      const label = cleanInlineText(match[1]);
      const reason = cleanInlineText(match[2]);
      return holdingJudgementFromParts(label, reason, context, idx);
    })
    .filter(Boolean);
}

function isContextHoldingItem(item, context) {
  const holdings = contextHoldings(context);
  if (!holdings.length) return true;
  return Boolean(matchContextHolding([item?.name, item?.ticker].filter(Boolean).join(' '), context));
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
  // 새 per-stock 마크다운 형식(### [종목명]) → MarkdownView로 폴백
  if (/###\s+\[/.test(rawText)) return null;
  const accountType = normalizeAnalysisAccount(context, rawText);
  if (accountType !== 'irp' && accountType !== 'isa' && accountType !== 'isa_infinite') return null;

  const sections = extractAccountSections(raw);
  if (!sections.length) return null;

  const meta = accountReportMeta(accountType);
  const summarySection = findSection(sections, ['종합 진단', '계좌 종합', '포트폴리오 진단', '요약', '사이클 종합', '무한매수법 사이클']) || sections[0];
  const holdingSection = findSection(sections, ['보유 자산별', '보유 종목별', '자산별 판단', '보유 자산', '보유 종목']);
  const riskSection = findSection(sections, ['위험 점검', '리스크', '스트레스', '구조적 리스크']);
  const cashSection = findSection(sections, ['현금성', '현금']);

  const used = new Set([summarySection, holdingSection, riskSection].filter(Boolean));
  const actionSection = findSection(sections, ['우선순위', '액션', '매수 전략'], used) ||
    sections.find((section) => !used.has(section) && sectionIncludes(section, ['리밸런싱']) && section !== cashSection);
  if (actionSection) used.add(actionSection);

  const rawHoldings = holdingSection ? parsedHoldingItems(holdingSection.text, context) : [];
  const ctxList = contextHoldings(context);
  const anyMatchesContext = !ctxList.length || rawHoldings.some((h) => {
    const n = normalizeIdentity(h.name);
    return ctxList.some((ch) =>
      [ch.name, ch.symbol, ch.ticker].map(normalizeIdentity).filter(Boolean)
        .some((id) => n.includes(id) || id.includes(n)));
  });
  const holdings = anyMatchesContext
    ? rawHoldings.filter((item) => isContextHoldingItem(item, context))
    : [];
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
  const accountType = normalizeAnalysisAccount(context, '');
  const riskSnapshot = accountRiskSnapshot(context);
  return (context?.holdings || [])
    .filter((h) => h && h.name)
    .map((h, idx) => {
      const assetType = String(h.assetType || 'STOCK').toUpperCase();
      const fallback = fallbackActionForHolding(h, accountType, riskSnapshot);
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
        action: fallback.action,
        reason: `AI 개별 판단이 없어 보유 데이터 기준으로 임시 산정했습니다. ${fallback.reason}`,
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

  // 제목 — reportTitle 포함
  const title = pickText(data, ['title', 'headline', 'reportTitle']) || '포트폴리오 AI 진단';

  // 종합 진단 — overallDiagnosis 객체 또는 단순 문자열 필드
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

  // 종합 등급
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

  // 보유 종목 진단 — stockAnalysis 포함
  const holdings = data.holdings || data.holdingAnalysis || data.positions || data.stockAnalysis;
  const holdingLines = formatBulletItems(holdings, (item) => {
    const name = pickText(item, ['name', 'stockName', 'symbol', 'ticker']) || formatValue(item);
    const action = pickText(item, ['action', 'recommendation', 'signal']);
    const reason = pickText(item, [
      'reason', 'comment', 'analysis',
      'long_term_assessment', 'short_term_assessment', 'assessment',
      'rationale', 'basis', 'longTermJudgment', 'shortTermJudgment', 'judgment',
    ]);
    // currentStatus / valuation 서브 객체 처리 (stockAnalysis 형식)
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

  // 추천 후보
  const recommendations = data.recommendations || data.recommendedStocks || data.recs;
  const recommendationLines = formatBulletItems(recommendations, (item) => {
    const name = pickText(item, ['name', 'stockName', 'symbol', 'ticker']) || formatValue(item);
    const reason = pickText(item, ['reason', 'rationale', 'comment']);
    const risk = pickText(item, ['risk', 'caution', 'warning']);
    return `**${name}**${reason ? ` - ${reason}` : ''}${risk ? `\n  - 주의: ${risk}` : ''}`;
  });
  if (recommendationLines) sections.push(`## 추천 후보\n${recommendationLines}`);

  // 우선순위 액션
  const actions = data.priorityActions || data.actions || data.nextSteps;
  const actionLines = formatBulletItems(actions, (item) => formatValue(item));
  if (actionLines) sections.push(`## 우선순위 액션\n${actionLines}`);

  // 시나리오
  const scenarios = data.scenarios || data.scenario;
  const scenarioLines = Array.isArray(scenarios)
    ? formatBulletItems(scenarios, (item) => formatValue(item))
    : formatValue(scenarios);
  if (scenarioLines) sections.push(`## 시나리오\n${scenarioLines}`);

  // 리스크
  const risk = pickText(data, ['risk', 'riskSummary', 'caution']);
  if (risk) sections.push(`## 리스크 체크\n${risk}`);

  // 나머지 — 인식된 키 제외
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

// ## 헤딩은 있지만 # 헤딩이 없는 마크다운(ISA/단기/IRP)을 배너+요약 구조로 변환
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
  const summaryText = [beforeH2, summaryRaw.split('\n').map((l) => l.trim()).filter(Boolean).join(' ')]
    .filter(Boolean).join(' ');
  const parts = [`# ${h2Title}`];
  if (summaryText) parts.push(`> ${summaryText}`);
  if (rest) parts.push(rest);
  return parts.join('\n\n');
}

function normalizeReport(value) {
  if (value && typeof value === 'object') return jsonReportToMarkdown(value);
  if (typeof value !== 'string' || !value.trim()) return '';
  // 마크다운(## 헤딩 포함)이면 배너 래핑 후 반환
  if (/^#{1,6}\s/m.test(value)) return wrapMarkdownWithBanner(value);
  const parsed = parseJsonReport(value);
  return parsed ? jsonReportToMarkdown(parsed) : value;
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

    const loadingMessagesDefault = [
      '보유 종목의 현재가와 비중을 계산하는 중...',
      'KRX·Yahoo 재무 데이터와 시장 뉴스를 확인하는 중...',
      'AI가 종목별 퀀트·펀더멘털 분석을 정리하는 중...',
    ];
    const loadingMessages = computed(() => loadingMessagesDefault);
    const loadingMsgIdx = ref(0);
    let loadingTimer = null;
    let tickerTimer = null;
    const now = ref(Date.now());
    const lastFetchAt = ref(0);

    const loadingText = computed(() => loadingMessages.value[loadingMsgIdx.value]);

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
        loadingMsgIdx.value = (loadingMsgIdx.value + 1) % loadingMessages.value.length;
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
          marketFilter: context.marketFilter || null,
        });
        const data = res.data || {};
        if (data.blocked) {
          blocked.value = true;
          retryAt.value = data.retryAt ? new Date(data.retryAt) : null;
          providersStatus.value = data.providersStatus || [];
        } else {
          uiReport.value = null;
          report.value = normalizeReport(data.report || data);
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
      noteTextLines, isNoteSubheading, isNoteBullet, noteLineText,
    };
  },
};
</script>

<style src="@/assets/css/components/stock/portfolio-analysis-modal.css" scoped></style>
