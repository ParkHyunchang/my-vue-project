export const ACCOUNT_CONFIGS = {
  stock: {
    label: "장기 주식계좌",
    tabIcon: "💰",
    tabLabel: "장기",
    storageKey: "stock_portfolio",
    apiPath: "/api/portfolio/holdings",
    displayCurrencyKey: "stock_displayCurrency",
    sortKey: "stock_sortKey",
    sortDirKey: "stock_sortDir",
    remote: true,
    allowCash: false,
    emptyTitle: "장기 주식계좌 보유 종목이 없습니다",
    emptyDescription: "장기 주식계좌에 담은 국내·미국 종목을 추가하면 장기 포트폴리오 현황을 한눈에 확인할 수 있습니다.",
    aiButtonLabel: "📊 장기 주식계좌 AI 진단",
    aiHint: "장기 보유 종목 시그널 + 코어/위성 전략 진단",
    auditView: "STOCK/HOLDING",
    auditAnalysis: "STOCK/AI-ANALYSIS",
    auditPortfolio: "STOCK/AI-PORTFOLIO",
    analysisNote: "장기 주식계좌입니다. 국내·미국 주식을 장기 보유하는 계좌로, 코어/위성 전략 기준으로 종목별 펀더멘털·밸류에이션 분석을 중심으로 진단하세요.",
  },
  isa: {
    label: "ISA 계좌",
    tabIcon: "🏦",
    tabLabel: "ISA",
    storageKey: "stock_portfolio_isa",
    apiPath: "/api/portfolio/isa/holdings",
    displayCurrencyKey: "stock_isa_displayCurrency",
    sortKey: "stock_isa_sortKey",
    sortDirKey: "stock_isa_sortDir",
    remote: true,
    allowCash: true,
    emptyTitle: "ISA 보유 종목이 없습니다",
    emptyDescription: "ISA 계좌에 담은 종목을 추가하면 중장기 적립식 포트폴리오를 따로 관리할 수 있습니다.",
    aiButtonLabel: "📊 ISA 포트폴리오 AI 진단",
    aiHint: "중장기 적립식 포트폴리오 — 세제혜택 + 적립 전략 진단",
    auditView: "STOCK/ISA",
    auditAnalysis: "STOCK/ISA/AI-ANALYSIS",
    auditPortfolio: "STOCK/ISA/AI-PORTFOLIO",
    analysisNote: "ISA 계좌입니다. 중장기 적립식 운용 전략으로 계속 모아가는 계좌입니다. 서민형 ISA 기본정보는 내부 판단 기준으로만 사용하고, 세제·의무기간 판단에 직접 필요할 때만 언급하세요.",
  },
  general: {
    label: "단기 주식계좌",
    tabIcon: "📈",
    tabLabel: "단기",
    storageKey: "stock_portfolio_general",
    apiPath: "/api/portfolio/general/holdings",
    displayCurrencyKey: "stock_general_displayCurrency",
    sortKey: "stock_general_sortKey",
    sortDirKey: "stock_general_sortDir",
    remote: true,
    allowCash: true,
    emptyTitle: "단기 주식계좌 보유 종목이 없습니다",
    emptyDescription: "단기 주식계좌에 단기매매 중인 종목을 추가하면 매매 포지션 현황을 한눈에 확인할 수 있습니다.",
    aiButtonLabel: "📈 단기 포트폴리오 AI 진단",
    aiHint: "단기매매 포지션 — 익절·손절·모멘텀 시그널 진단",
    auditView: "STOCK/GENERAL",
    auditAnalysis: "STOCK/GENERAL/AI-ANALYSIS",
    auditPortfolio: "STOCK/GENERAL/AI-PORTFOLIO",
    analysisNote: "단기 주식계좌입니다. 1종목당 200~300만원 소액으로 단기 스윙 매매를 하는 계좌입니다. 장기 보유 원칙 없이 모멘텀·뉴스 기반으로 익절·손절을 적극 활용합니다.",
  },
  irp: {
    label: "IRP 계좌",
    tabIcon: "🛡️",
    tabLabel: "IRP",
    storageKey: "stock_portfolio_irp",
    apiPath: "/api/portfolio/irp/holdings",
    displayCurrencyKey: "stock_irp_displayCurrency",
    sortKey: "stock_irp_sortKey",
    sortDirKey: "stock_irp_sortDir",
    remote: true,
    allowCash: true,
    emptyTitle: "IRP 보유 종목이 없습니다",
    emptyDescription: "IRP 계좌에 담은 종목을 추가하면 은퇴 자산 관점의 비중과 리스크를 따로 볼 수 있습니다.",
    aiButtonLabel: "🛡️ IRP 포트폴리오 AI 진단",
    aiHint: "퇴직연금 IRP — 장기 안정성·위험자산 한도 진단",
    auditView: "STOCK/IRP",
    auditAnalysis: "STOCK/IRP/AI-ANALYSIS",
    auditPortfolio: "STOCK/IRP/AI-PORTFOLIO",
    analysisNote: "IRP 계좌입니다. 은퇴자산 장기 적립 계좌로 계속 모아가는 전략입니다. 위험자산 70% 한도와 안전자산 약 30% 기준은 리밸런싱 판단에 직접 필요할 때만 언급하세요.",
  },
};

export const ACCOUNT_ORDER = ["stock", "general", "isa", "irp"];
export const ACCOUNT_TAB_ORDER = ["general", "isa", "irp", "stock"];

export const ACCOUNT_LABELS = ACCOUNT_ORDER.reduce((labels, accountType) => {
  labels[accountType] = ACCOUNT_CONFIGS[accountType].label;
  return labels;
}, {});

export function normalizeAccountType(value) {
  return Object.prototype.hasOwnProperty.call(ACCOUNT_CONFIGS, value) ? value : "stock";
}

export function isCashHolding(holding) {
  return holding?.assetType === "CASH";
}
