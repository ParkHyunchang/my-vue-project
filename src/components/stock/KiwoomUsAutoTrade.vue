<template>
  <section class="us-auto">
    <header class="hero">
      <div><p>KIWOOM US OPEN API</p><h3>🇺🇸 미국주식 자동매매</h3><small>저장한 전략으로 후보를 선별하고, 환전한 USD와 매수 한도 안에서 주문합니다.</small></div>
      <b>실전 계좌</b>
    </header>

    <div
      class="usd-notice"
      :class="{ blocked: usdOnlyBlocked, unknown: !accountFresh }"
    >
      <strong>{{ !accountFresh ? '매수 자금: 계좌 확인 필요' : usdOnlyBlocked ? '매수 차단: 원화주문설정금이 있습니다' : '매수 자금: 환전한 USD 예수금' }}</strong>
      <span v-if="!accountFresh">최신 계좌 정보를 확인하지 못했습니다. 환전 후에는 ‘계좌·체결 동기화’로 금액과 보유 내역을 확인하세요.</span>
      <span v-else-if="usdOnlyBlocked">현재 원화주문설정금 {{ won(summary.cash?.krwOrderSettingAmount) }}원입니다. 자동매매 시작과 실제 매수 주문을 차단합니다.</span>
      <span v-else>미체결 자동매수 예약금을 제외한 USD에서 1%를 수수료 여유로 남깁니다. 실제 주문 직전 외화 주문가능수량을 다시 확인합니다.</span>
      <small>원화주문 서비스: {{ krwOrderStatus.label }} · 실제 매수에는 서비스 해지 확인이 필요합니다.</small>
    </div>
    <p
      v-if="error"
      class="error"
    >
      {{ error }}
    </p>
    <p
      v-if="summary.notice"
      class="account-notice"
    >
      {{ summary.notice }}
      <small v-if="summary.capturedAt">마지막 정상 조회: {{ logTime(summary.capturedAt) }}</small>
    </p>

    <section class="controls">
      <div>
        <strong>{{ executionLabel }}</strong>
        <small>{{ status.marketOpen ? '미국 정규장 운영 중' : '미국 정규장 밖' }} · 주문전송 {{ status.orderEnabled ? '허용' : '잠금' }} · 원화설정금 {{ !accountFresh ? '확인 필요' : usdOnlyBlocked ? '있음(차단)' : '0원' }}</small>
        <small>{{ readinessHint }}</small>
        <small>마지막 화면 갱신: {{ lastRefreshAt ? logTime(lastRefreshAt) : '대기 중' }} · {{ streamConnected ? '실시간 연결' : '주기적으로 상태 확인 중' }}</small>
        <small
          v-if="status.emergencyStopped"
          class="error"
        >안전정지: {{ status.lastApiFailureMessage }}</small>
        <small
          v-if="status.dailyLossTriggered"
          class="error"
        >오늘 손실 한도에 도달해 신규 매수가 차단되었습니다. 시작 버튼으로 해제되지 않으며 매도 감시는 유지됩니다.</small>
        <small
          v-if="refreshError"
          class="error"
        >{{ refreshError }}</small>
      </div>
      <div class="buttons">
        <button
          :disabled="pending || (!status.autoTrading && (!status.configured || !status.orderEnabled || !status.strategyEnabled || !accountFresh || usdOnlyBlocked))"
          :class="{ danger: status.autoTrading }"
          @click="toggle"
        >
          {{ status.autoTrading ? '신규매수 중지' : '신규매수 시작' }}
        </button>
        <button
          :disabled="pending || !status.configured"
          :title="decisionButtonHint"
          @click="runDecision"
        >
          {{ decisionButtonLabel }}
        </button>
        <button
          :disabled="pending || !status.configured"
          @click="refreshAll"
          title="잔고와 체결·취소 상태를 다시 확인합니다. 오래된 미체결 자동주문은 취소 요청할 수 있습니다."
        >
          계좌·체결 동기화
        </button>
      </div>
    </section>
    <p
      v-if="actionNotice"
      class="account-notice"
      role="status"
    >
      {{ actionNotice }}
    </p>

    <section class="market-hours card">
      <header>
        <strong>미국장 자동매매 운영시간</strong><span :class="status.marketOpen ? 'open' : 'closed'">
          {{ status.marketOpen ? '정규장 운영 중' : '장 운영시간 아님' }}
        </span>
      </header>
      <div>
        <p><b>현재 적용:</b> {{ status.marketSeason }} · 정규장 {{ status.regularSessionKst }} (한국시간)</p>
        <p><b>신규매수:</b> {{ status.entrySessionKst }} · 개장 직후 30분과 마감 전 1시간은 진입하지 않습니다.</p>
        <p><b>매도·체결:</b> 정규장 전체에서만 감시·동기화하며 프리마켓과 애프터마켓에는 주문하지 않습니다.</p>
        <p><b>달력:</b> 2026~2028년 NYSE 휴장일과 조기폐장을 반영하고, 이후 연도는 일정 등록 전까지 주문을 차단합니다.</p>
      </div>
    </section>

    <section class="summary">
      <article><small>환전 USD 예수금</small><strong>{{ accountMoney(summary.cash?.availableUsd) }}</strong><span>D+0 기준 · 예약금 차감 전</span></article>
      <article data-testid="order-limit">
        <small>1회 매수 금액 상한</small><strong>{{ accountMoney(summary.perOrderLimitUsd) }}</strong><span>저장한 전략·미체결 예약금 반영</span><span>{{ buyingPower.signalMode === 'TREND' ? 'ATR 위험 한도 적용 전 · 실제 주문은 더 작을 수 있음' : '정수 수량·주문가능수량 적용 전' }}</span>
      </article>
      <article data-testid="managed-positions">
        <small>자동관리 보유 종목</small><strong>{{ accountLoaded ? summary.managedPositionCount : '—' }} / {{ appliedSettings.maxPositions }}종목</strong><span>자동관리 수량 평가액 {{ accountMoney(summary.managedEvaluationUsd) }}</span><span>신규 미체결 {{ buyingPower.pendingPositionCount ?? '—' }}종목도 한도에 포함</span>
      </article>
      <article><small>계좌 전체 주식 평가액</small><strong>{{ accountMoney(summary.stockEvaluationUsd) }}</strong><span>수동 보유 포함 · USD 예수금 제외</span></article>
    </section>
    <section
      class="budget card"
      aria-label="매수 한도 계산 근거"
    >
      <header><strong>매수 한도 계산 근거</strong><span>{{ accountFresh ? '최신 계좌 조회' : accountLoaded ? '이전 조회값 · 재확인 필요' : '계좌 확인 대기' }}</span></header>
      <dl>
        <div><dt>미체결 자동매수 예약금</dt><dd>{{ accountMoney(buyingPower.reservedUsd) }}</dd></div>
        <div><dt>예약금 제외 USD</dt><dd>{{ accountMoney(buyingPower.unreservedUsd) }}</dd></div>
        <div><dt>{{ buyingPower.signalMode === 'TREND' ? '자동매매 기준자산' : '예약금 제외 USD' }} × {{ buyingPower.maxOrderPercent ?? '—' }}%<small v-if="buyingPower.maxOrderPercent > 99">적용 비율은 최대 99%</small></dt><dd>{{ accountMoney(buyingPower.allocationLimitUsd) }}</dd></div>
        <div v-if="buyingPower.signalMode === 'TREND'">
          <dt>거래당 위험 예산 · {{ buyingPower.riskPerTradePercent }}%</dt><dd>{{ accountMoney(buyingPower.riskBudgetUsd) }}</dd>
        </div>
      </dl>
      <p>1회 매수 금액 상한 = 설정 비중 금액과 예약금 제외 USD의 99% 중 작은 금액입니다.</p>
      <p v-if="buyingPower.signalMode === 'TREND'">
        자동매매 기준자산 {{ accountMoney(summary.automatedCapitalUsd) }} = USD 예수금 + 자동관리 수량 평가액. 수동 보유 평가액은 제외합니다. 실제 수량은 금액 상한과 ATR 손절폭에 따른 위험 예산 중 더 작은 한도로 정합니다.
      </p>
      <p v-else>
        기존 조건과 비교 관찰 모드는 USD 비중으로 수량을 정합니다. 비교 관찰 모드의 ATR 신호는 기록에만 사용합니다.
      </p>
      <p>금액 상한은 매수 가능 여부를 뜻하지 않습니다. 보유 종목 수·하루 매수 횟수·진입 조건도 통과해야 합니다.</p>
      <small>계좌 조회: {{ summary.capturedAt ? logTime(summary.capturedAt) : '확인 전' }} · 보유 내역 동기화: {{ buyingPower.holdingsSyncedAt ? logTime(buyingPower.holdingsSyncedAt) : '서버 시작 후 확인 전' }}</small>
    </section>

    <section class="rules card">
      <header>
        <strong>현재 적용 중인 매매 규칙</strong><button
          :disabled="pending || !settingsLoaded"
          @click="openSettings"
        >
          전략 설정
        </button>
      </header>
      <p
        v-if="!settingsLoaded"
        class="holdings-help"
      >
        저장된 전략 설정을 확인하고 있습니다.
      </p>
      <ol v-else>
        <li>매수 판단: {{ signalModeLabel }}. {{ appliedSettings.signalMode === 'OBSERVE' ? '새 신호는 비교 기록만 남기며 기존 조건으로 매수합니다.' : '' }}</li>
        <li v-if="appliedSettings.signalMode === 'TREND'">
          SPY·QQQ와 종목의 상승추세, 20거래일 상대강도, 고가 돌파를 확인합니다. ATR 손절폭과 거래당 {{ appliedSettings.riskPerTradePercent }}% 위험 예산으로 수량을 정합니다.
        </li>
        <li>개장 직후 30분과 마감 전 1시간을 피해 매수합니다.</li>
        <li>S&amp;P 500 또는 NASDAQ-100 편입 종목만 봅니다.</li>
        <li>그중 당일 거래대금 상위 50위 안에 든 종목만 봅니다.</li>
        <li v-if="appliedSettings.fundamentalFilterEnabled">
          Forward PER {{ appliedSettings.maxForwardPe }}배 이하, ROE {{ appliedSettings.minRoePercent }}% 이상만 고릅니다.
        </li>
        <li>오늘 {{ appliedSettings.signalMode === 'TREND' ? 0 : appliedSettings.minChangePercent }}~{{ appliedSettings.maxChangePercent }}% 오른 종목만 고릅니다.</li>
        <li>같은 시간대 예상 거래량 대비 {{ appliedSettings.minVolumeRatio }}배 이상인 종목만 고릅니다.</li>
        <li>매수·매도 1호가 스프레드가 {{ appliedSettings.maxSpreadPercent }}% 이하인 종목만 고릅니다.</li>
        <li>1회 매수 금액 상한은 {{ accountMoney(summary.perOrderLimitUsd) }}입니다. 종목 가격·주문가능수량{{ appliedSettings.signalMode === 'TREND' ? '·ATR 위험 예산' : '' }}에 따라 실제 주문금액은 더 작아질 수 있습니다.</li>
        <li>자동관리 보유와 신규 미체결 매수는 합계 최대 {{ appliedSettings.maxPositions }}종목, 하루 매수는 최대 {{ appliedSettings.dailyMaxBuys }}번입니다.</li>
        <li>{{ appliedSettings.signalMode === 'TREND' ? `ATR 손절폭(최대 ${appliedSettings.stopLossPercent}%)` : `-${appliedSettings.stopLossPercent}% 손절` }}, +{{ appliedSettings.takeProfitPercent }}%부터 자동관리 수량을 나눠 익절하고 최대 {{ appliedSettings.maxHoldingDays }}일(달력일)을 보유합니다.</li>
      </ol>
      <teleport to="body">
        <div
          v-if="showSettings"
          class="amodal-overlay"
          data-lenis-prevent
          @click.self="closeSettings"
        >
          <div
            class="amodal-box us-settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="us-settings-title"
          >
            <div class="amodal-head">
              <div>
                <h2 id="us-settings-title">
                  미국주식 매매 규칙 설정
                </h2>
                <span class="amodal-badge amodal-badge-on">D+0 USD만 사용</span>
              </div>
              <button
                class="amodal-close"
                aria-label="닫기"
                :disabled="pending"
                @click="closeSettings"
              >
                ×
              </button>
            </div>
            <div class="amodal-body">
              <div class="settings-area">
                <div class="easy-guide">
                  <b>전략 설정 미리보기 · 저장 전에는 적용되지 않습니다.</b>
                  <span>아래 예상 한도는 편집 중인 설정 기준입니다. 화면의 현재 적용 규칙과 금액 상한은 저장된 설정을 표시합니다.</span>
                </div>

                <div
                  class="won-order-service"
                  :class="krwOrderStatus.code.toLowerCase()"
                >
                  <div>
                    <small>키움 원화주문 서비스</small>
                    <strong>{{ krwOrderStatus.label }}</strong>
                    <span>{{ krwOrderStatus.message }}</span>
                  </div>
                  <button
                    type="button"
                    :disabled="pending"
                    @click="refreshCashPolicyStatus"
                  >
                    상태 새로고침
                  </button>
                </div>
                <form
                  id="us-strategy-settings"
                  class="strategy-settings amodal-form thin-scrollbar"
                  @submit.prevent="saveSettings"
                >
                  <section class="setting-card">
                    <p class="setting-step">
                      매수 판단 방식
                    </p>
                    <div class="setting-field">
                      <label for="us-signal-mode">추세 전략 적용<span>처음에는 비교 관찰로 신호를 검증하세요. 지수 초과수익이 검증된 전략은 아닙니다.</span></label>
                      <select
                        id="us-signal-mode"
                        v-model="settings.signalMode"
                      >
                        <option value="LEGACY">
                          기존 조건
                        </option>
                        <option value="OBSERVE">
                          기존 조건 + 새 신호 비교 관찰
                        </option>
                        <option value="TREND">
                          추세·상대강도·돌파 적용
                        </option>
                      </select>
                    </div>
                    <div class="setting-field">
                      <label>최소 지수 대비 상대강도<span>최근 20거래일 수익률이 SPY와 QQQ 모두보다 이만큼 높아야 합니다.</span></label>
                      <div class="number-with-unit">
                        <input
                          v-model.number="settings.minRelativeStrengthPercent"
                          :disabled="settings.signalMode === 'LEGACY'"
                          type="number"
                          min="0"
                          max="30"
                          step="0.1"
                        ><em>%p</em>
                      </div>
                    </div>
                    <div class="setting-field">
                      <label>거래당 허용 위험<span>추세 모드에서 자동매매 기준자산에 적용합니다. 위험 예산 미리보기 {{ accountMoney(summary.automatedCapitalUsd == null ? null : summary.automatedCapitalUsd * settings.riskPerTradePercent / 100) }}. 비교 관찰 모드에서는 수량에 적용하지 않습니다. 갭·슬리피지로 실제 손실은 초과할 수 있습니다.</span></label>
                      <div class="number-with-unit">
                        <input
                          v-model.number="settings.riskPerTradePercent"
                          :disabled="settings.signalMode !== 'TREND'"
                          type="number"
                          min="0.1"
                          max="1"
                          step="0.1"
                        ><em>%</em>
                      </div>
                    </div>
                    <div class="setting-field">
                      <label>ATR 손절 거리<span>최근 14거래일 평균 진폭의 배수입니다. 최대 손절률보다 넓으면 매수하지 않습니다.</span></label>
                      <div class="number-with-unit">
                        <input
                          v-model.number="settings.atrStopMultiplier"
                          :disabled="settings.signalMode === 'LEGACY'"
                          type="number"
                          min="1"
                          max="4"
                          step="0.1"
                        ><em>배</em>
                      </div>
                    </div>
                    <div class="setting-field">
                      <label>돌파 후 허용 이격<span>20거래일 고가에서 ATR의 이 배수 이상 올라간 가격은 추격하지 않습니다.</span></label>
                      <div class="number-with-unit">
                        <input
                          v-model.number="settings.maxEntryExtensionAtr"
                          :disabled="settings.signalMode === 'LEGACY'"
                          type="number"
                          min="0.1"
                          max="2"
                          step="0.1"
                        ><em>배</em>
                      </div>
                    </div>
                  </section>
                  <section class="setting-card screen-card">
                    <p class="setting-step">
                      1. 매수 후보 찾기
                    </p>
                    <p class="setting-description">
                      너무 조용한 종목과 이미 급등한 종목을 피하고, 거래가 활발해진 종목만 찾습니다.
                    </p>
                    <div class="setting-field fixed-rule">
                      <label>S&amp;P 500·NASDAQ-100 종목만<span>두 지수 중 하나에 편입된 종목만 후보가 됩니다. 목록 확인 실패 시에는 새로 매수하지 않습니다.</span></label>
                      <div class="fixed-rule-actions">
                        <div
                          class="rule-status"
                          :class="status.indexUniverse?.available ? 'ready' : 'blocked'"
                        >
                          {{ status.indexUniverse?.available ? `적용 중 · ${status.indexUniverse.unionCount}종목` : '목록 확인 필요' }}
                        </div>
                        <button
                          type="button"
                          :disabled="pending"
                          @click="refreshIndexUniverse"
                        >
                          목록 새로고침
                        </button>
                      </div>
                    </div>
                    <div class="setting-field">
                      <label>PER·ROE 기업 필터<span>적자·재무 데이터 누락 종목을 제외하고 기업 품질 기준을 적용합니다.</span></label>
                      <label class="setting-switch"><input
                        v-model="settings.fundamentalFilterEnabled"
                        type="checkbox"
                      ><span>{{ settings.fundamentalFilterEnabled ? '사용' : '미사용' }}</span></label>
                    </div>
                    <div class="setting-field">
                      <label>최대 Forward PER<span>Forward PER가 없으면 Trailing PER를 사용하며, 음수·누락은 제외합니다.</span></label>
                      <div class="number-with-unit">
                        <input
                          v-model.number="settings.maxForwardPe"
                          type="number"
                          min="5"
                          max="100"
                          step="1"
                          :disabled="!settings.fundamentalFilterEnabled"
                        ><em>배</em>
                      </div>
                    </div>
                    <div class="setting-field">
                      <label>최소 ROE<span>최근 자기자본이익률이 이 값 이상인 기업만 고릅니다.</span></label>
                      <div class="number-with-unit">
                        <input
                          v-model.number="settings.minRoePercent"
                          type="number"
                          min="0"
                          max="50"
                          step="0.1"
                          :disabled="!settings.fundamentalFilterEnabled"
                        ><em>%</em>
                      </div>
                    </div>
                    <div class="setting-field">
                      <label>오늘 최소 상승률<span>{{ settings.signalMode === 'TREND' ? '추세 모드는 0% 하한을 사용합니다. 이 값은 기존·관찰 모드용으로 보관됩니다.' : '이만큼 이상 오른 종목부터 후보로 봅니다.' }}</span></label>
                      <div class="number-with-unit">
                        <b>+</b><input
                          v-model.number="settings.minChangePercent"
                          :disabled="settings.signalMode === 'TREND'"
                          type="number"
                          min="0"
                          max="20"
                          step="0.1"
                        ><em>%</em>
                      </div>
                    </div>
                    <div class="setting-field">
                      <label>오늘 최대 상승률<span>이보다 많이 오른 종목은 급등 추격을 피하기 위해 제외합니다.</span></label>
                      <div class="number-with-unit">
                        <b>+</b><input
                          v-model.number="settings.maxChangePercent"
                          type="number"
                          min="0"
                          max="30"
                          step="0.1"
                        ><em>%</em>
                      </div>
                    </div>
                    <div class="setting-field">
                      <label>최소 시간보정 거래량<span>같은 시간대 예상 거래량보다 얼마나 활발한지 계산합니다.</span></label>
                      <div class="number-with-unit">
                        <input
                          v-model.number="settings.minVolumeRatio"
                          type="number"
                          min="0.5"
                          max="5"
                          step="0.1"
                        ><em>배</em>
                      </div>
                    </div>
                    <div class="setting-field">
                      <label>최대 호가 스프레드<span>매도 1호가와 매수 1호가 차이가 이 비율보다 크면 제외합니다.</span></label>
                      <div class="number-with-unit">
                        <input
                          v-model.number="settings.maxSpreadPercent"
                          type="number"
                          min="0.05"
                          max="1"
                          step="0.01"
                        ><em>%</em>
                      </div>
                    </div>
                  </section>

                  <section class="setting-card buy-card">
                    <p class="setting-step">
                      2. 한 번에 살 때
                    </p>
                    <p class="setting-description">
                      미리 환전한 달러 중 한 번에 얼마를 쓰고, 몇 종목까지 살지 정합니다.
                    </p>
                    <div class="setting-field">
                      <label>1회 매수 최대 비중<span>{{ settings.signalMode === 'TREND' ? '자동매매 기준자산(USD 예수금 + 자동관리 수량 평가액)에 적용합니다. ATR 위험 예산으로 실제 수량을 추가 제한합니다.' : '미체결 자동매수 예약금을 제외한 USD에 적용합니다.' }} 편집값 기준 금액 상한 {{ accountMoney(estimatedOrderUsd) }} · 저장 전 미리보기{{ accountFresh ? '' : ' · 계좌 재확인 필요' }}. 비중은 최대 99%까지만 적용됩니다.</span></label>
                      <div class="number-with-unit">
                        <input
                          v-model.number="settings.maxOrderPercent"
                          type="number"
                          min="0.1"
                          max="100"
                          step="0.1"
                        ><em>%</em>
                      </div>
                    </div>
                    <div class="setting-field">
                      <label>동시에 보유할 자동매매 종목<span>자동관리 보유와 미체결 매수 종목을 함께 셉니다. 수동 보유는 제외합니다.</span></label>
                      <div class="number-with-unit">
                        <input
                          v-model.number="settings.maxPositions"
                          type="number"
                          min="1"
                          max="20"
                          step="1"
                        ><em>종목</em>
                      </div>
                    </div>
                    <div class="setting-field">
                      <label>하루에 새로 살 수 있는 횟수<span>체결·미완료·결과 미확인 매수 주문을 셉니다. 전량 미체결 취소와 실패는 제외합니다.</span></label>
                      <div class="number-with-unit">
                        <input
                          v-model.number="settings.dailyMaxBuys"
                          type="number"
                          min="1"
                          max="20"
                          step="1"
                        ><em>번</em>
                      </div>
                    </div>
                    <div class="setting-field">
                      <label>같은 종목을 다시 사기까지 기다릴 기간<span>실제로 체결된 매수에 적용합니다. 전량 미체결 취소는 주문 후 2분 대기만 적용합니다.</span></label>
                      <div class="number-with-unit">
                        <input
                          v-model.number="settings.symbolCooldownDays"
                          type="number"
                          min="1"
                          max="30"
                          step="1"
                        ><em>일</em>
                      </div>
                    </div>
                  </section>

                  <section class="setting-card sell-card">
                    <p class="setting-step">
                      3. 산 주식을 팔 때
                    </p>
                    <p class="setting-description">
                      손실을 줄이고 이익을 나눠 지키는 자동 매도 기준입니다.
                    </p>
                    <div class="setting-field">
                      <label>최대 손절률<span>자동관리 수량만 매도합니다. TREND 진입은 저장한 ATR 손절폭과 현재 최대 손절률 중 작은 값을 사용합니다.</span></label>
                      <div class="number-with-unit negative">
                        <b>-</b><input
                          v-model.number="settings.stopLossPercent"
                          type="number"
                          min="0.1"
                          max="30"
                          step="0.1"
                        ><em>%</em>
                      </div>
                    </div>
                    <div class="setting-field">
                      <label>1차 이익 실현<span>자동매매 원가 대비 이만큼 오르면 자동관리 수량의 절반(정수 내림, 최소 1주)을 팝니다. 부분 체결 후에는 목표 잔량만 처리합니다.</span></label>
                      <div class="number-with-unit">
                        <b>+</b><input
                          v-model.number="settings.takeProfitPercent"
                          type="number"
                          min="0.1"
                          max="100"
                          step="0.1"
                        ><em>%</em>
                      </div>
                    </div>
                    <div class="setting-field">
                      <label>2차 이익 실현<span>남은 수량은 이 수익률에 도달하면 모두 팝니다. 1차보다 큰 값이어야 합니다.</span></label>
                      <div class="number-with-unit">
                        <b>+</b><input
                          v-model.number="settings.takeProfitPercent2"
                          type="number"
                          min="0.1"
                          max="100"
                          step="0.1"
                        ><em>%</em>
                      </div>
                    </div>
                    <div class="setting-field">
                      <label>가장 오래 보유할 기간<span>달력일 기준입니다. 기간이 지난 뒤 정규장 매도 감시에서 자동관리 수량을 정리합니다.</span></label>
                      <div class="number-with-unit">
                        <input
                          v-model.number="settings.maxHoldingDays"
                          type="number"
                          min="1"
                          max="30"
                          step="1"
                        ><em>일</em>
                      </div>
                    </div>
                  </section>

                  <section class="setting-card safety-card">
                    <p class="setting-step">
                      4. 하루 안전장치
                    </p>
                    <p class="setting-description">
                      자동매매 자산의 하루 손실이 커지면 그날의 새 매수를 멈춥니다.
                    </p>
                    <div class="setting-field">
                      <label>오늘 손실률이 이 비율이면 새 매수 멈추기<span>그날 처음 확인한 자동매매용 USD와 자동매매 보유종목 평가액을 기준으로 계산합니다. 0%는 사용하지 않음입니다.</span></label>
                      <div class="number-with-unit negative">
                        <b>-</b><input
                          v-model.number="settings.dailyLossLimitPercent"
                          type="number"
                          min="0"
                          max="30"
                          step="0.1"
                        ><em>%</em>
                      </div>
                    </div>
                  </section>

                  <p
                    v-if="validationError"
                    class="settings-error"
                  >
                    ⚠ {{ validationError }}
                  </p>
                  <p
                    v-if="error"
                    class="settings-error"
                  >
                    ⚠ {{ error }}
                  </p>
                </form>
              </div>
            </div>
            <div class="amodal-foot">
              <span class="settings-unsaved">{{ settingsDirty ? '아직 저장되지 않았습니다' : '' }}</span>
              <div class="amodal-foot-right">
                <button
                  class="amodal-btn amodal-btn-ghost"
                  :disabled="pending"
                  @click="closeSettings"
                >
                  취소
                </button>
                <button
                  class="amodal-btn amodal-btn-primary"
                  type="submit"
                  form="us-strategy-settings"
                  :disabled="pending || !settingsDirty || !!validationError"
                >
                  {{ pending ? '저장 중...' : '저장하기' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </teleport>
    </section>

    <div class="grids">
      <section class="card table-card">
        <header><strong>최근 후보</strong><span>{{ candidates.length }}개</span></header>
        <div class="table-wrap">
          <table>
            <thead><tr><th>종목</th><th>매도 1호가</th><th>등락</th><th>RVOL</th><th>PER</th><th>ROE</th><th>스프레드</th><th>점수</th></tr></thead><tbody>
              <tr
                v-for="item in candidates"
                :key="item.symbol"
              >
                <td><b>{{ item.symbol }}</b><small>{{ item.name }} · {{ item.indexMembership }}</small><small v-if="item.technicalSignal">{{ item.technicalSignal.reason }}<template v-if="item.technicalSignal.relativeStrengthPercent != null"> · 상대강도 {{ signed(item.technicalSignal.relativeStrengthPercent) }}%p</template></small></td><td>${{ money(item.price) }}</td><td class="up">
                  +{{ Number(item.changePercent).toFixed(2) }}%
                </td><td>{{ Number(item.volumeRatio).toFixed(2) }}배</td><td>{{ item.forwardPe == null ? '-' : Number(item.forwardPe).toFixed(1) }}</td><td>{{ item.roePercent == null ? '-' : `${Number(item.roePercent).toFixed(1)}%` }}</td><td>{{ Number(item.spreadPercent).toFixed(2) }}%</td><td>{{ Number(item.score).toFixed(1) }}</td>
              </tr>
              <tr v-if="!candidates.length">
                <td
                  colspan="8"
                  class="empty"
                >
                  아직 조건을 모두 통과한 후보가 없습니다.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="card table-card">
        <header><strong>계좌 보유와 자동관리 수량</strong><span>{{ holdings.length }}종목</span></header>
        <p class="holdings-help">
          자동매수 체결로 확인된 수량만 손절·익절 관리합니다. 수동 보유는 관리 대상이 아니며 같은 종목에 두 수량이 함께 있을 수 있습니다.
        </p>
        <div class="table-wrap">
          <table>
            <thead><tr><th>종목</th><th>자동관리 / 수동</th><th>전체 수량</th><th>현재가</th><th>계좌 수익률</th></tr></thead><tbody>
              <tr
                v-for="item in holdings"
                :key="`${item.exchange}-${item.symbol}`"
              >
                <td><b>{{ item.symbol }}</b><small>{{ item.stockName }}</small></td><td>자동 {{ item.managedQuantity || 0 }}주<small>수동 {{ Math.max(0, item.quantity - (item.managedQuantity || 0)) }}주</small></td><td>{{ item.quantity }}</td><td>${{ money(item.currentPrice) }}</td><td :class="Number(item.profitLossPercent) >= 0 ? 'up' : 'down'">
                  {{ signed(item.profitLossPercent) }}%
                </td>
              </tr>
              <tr v-if="!holdings.length">
                <td
                  colspan="5"
                  class="empty"
                >
                  {{ buyingPower.holdingsSyncedAt ? '동기화된 보유 종목이 없습니다.' : '보유 내역 확인 전입니다. 계좌·체결 동기화를 실행하세요.' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <section class="card logs">
      <header>
        <strong>후보 · 매수 · 매도 로그</strong><button @click="logs = []">
          화면 지우기
        </button>
      </header>
      <div
        ref="logBox"
        class="terminal"
      >
        <p
          v-for="item in logs"
          :key="item.id"
          :class="tone(item.eventType || item.type)"
        >
          <time>{{ logTime(item.createdAt) }}</time><b>[{{ label(item.eventType || item.type) }}]</b> {{ item.message }}
        </p>
        <p
          v-if="!logs.length"
          class="empty"
        >
          후보 산출, 주문 접수, 체결 결과가 여기에 기록됩니다.
        </p>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import axios from '@/axios'

const BASE = '/api/kiwoom/us/auto-trade'
const status = ref({ configured: false, autoTrading: false, orderEnabled: false, marketOpen: false, entryWindow: false, marketSeason: '', regularSessionKst: '', entrySessionKst: '' })
const summary = ref({ cash: { availableUsd: 0, krwOrderSettingAmount: 0, usdOnlyBuyAllowed: true, blockReason: '' }, stockEvaluationUsd: 0, managedEvaluationUsd: 0, perOrderLimitUsd: 0, positionCount: 0, managedPositionCount: 0, krwOrderServiceStatus: { code: 'UNKNOWN', label: '확인 불가', message: '계좌 상태를 불러오는 중입니다.' } })
const settings = ref({ signalMode: 'OBSERVE', minRelativeStrengthPercent: 0, riskPerTradePercent: 0.5, atrStopMultiplier: 2, maxEntryExtensionAtr: 1, fundamentalFilterEnabled: true, maxForwardPe: 50, minRoePercent: 10, minChangePercent: 2, maxChangePercent: 8, minVolumeRatio: 1.2, maxSpreadPercent: 0.15, maxOrderPercent: 10, maxPositions: 3, dailyMaxBuys: 2, symbolCooldownDays: 5, maxHoldingDays: 5, stopLossPercent: 3, takeProfitPercent: 5, takeProfitPercent2: 8, dailyLossLimitPercent: 3 })
const appliedSettings = ref({ ...settings.value })
const accountLoaded = ref(false), accountFailed = ref(false)
const accountFresh = computed(() => accountLoaded.value && !accountFailed.value && summary.value.fresh === true)
const buyingPower = computed(() => summary.value.buyingPower || {})
const accountMoney = value => accountLoaded.value && value != null ? `$${money(value)}` : '—'
const candidates = ref([]), holdings = ref([]), logs = ref([])
const pending = ref(false), error = ref(''), showSettings = ref(false), logBox = ref(null)
const settingsLoaded = ref(false), actionNotice = ref('')
const lastRefreshAt = ref(null), streamConnected = ref(false), refreshError = ref('')
let source, settingsOriginal = '', refreshPromise, refreshTimer, eventRefreshTimer, disposed = false
const money = value => Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const won = value => Number(value || 0).toLocaleString('ko-KR', { maximumFractionDigits: 0 })
const validNumber = (value, min, max) => typeof value === 'number' && !Number.isNaN(value) && value >= min && value <= max
const validInteger = (value, min, max) => Number.isInteger(value) && value >= min && value <= max
const usdOnlyBlocked = computed(() => summary.value.cash?.usdOnlyBuyAllowed === false)
const krwOrderStatus = computed(() => summary.value.krwOrderServiceStatus || { code: 'UNKNOWN', label: '확인 불가', message: '계좌 상태를 확인할 수 없습니다.' })
const signalModeLabel = computed(() => ({ LEGACY: '기존 조건', OBSERVE: '기존 조건 + 새 신호 비교 관찰', TREND: '추세·상대강도·돌파' }[appliedSettings.value.signalMode] || '확인 전'))
const estimatedOrderUsd = computed(() => {
  if (buyingPower.value.reservedUsd == null) return null
  const cash = Math.max(0, Number(summary.value.cash?.availableUsd || 0) - Number(buyingPower.value.reservedUsd))
  const base = settings.value.signalMode === 'TREND' ? Number(summary.value.automatedCapitalUsd || 0) : cash
  return Math.min(cash * 0.99, base * Math.min(Number(settings.value.maxOrderPercent || 0), 99) / 100)
})
const executionLabel = computed(() => !status.value.autoTrading ? '신규 자동매수 중지' : status.value.entryWindow ? '신규 자동매수 활성' : '신규 자동매수 활성 · 진입 시간 대기')
const readinessHint = computed(() => {
  if (!accountFresh.value) return '최신 계좌 확인이 필요합니다. 표시 금액만으로 매수 가능 여부를 판단하지 마세요.'
  if (usdOnlyBlocked.value) return summary.value.cash?.blockReason || '원화주문설정금 때문에 신규 매수가 차단됩니다.'
  if (krwOrderStatus.value.code !== 'CANCELED') return '실제 매수 전 원화주문 서비스 해지 확인이 필요합니다.'
  if (Number(summary.value.perOrderLimitUsd) <= 0) return '설정과 미체결 예약금을 반영한 매수 금액이 없습니다.'
  if (Number(summary.value.managedPositionCount) + Number(buyingPower.value.pendingPositionCount || 0) >= Number(appliedSettings.value.maxPositions)) return '자동관리 보유·신규 미체결 매수가 최대 종목 수에 도달했습니다.'
  return status.value.entryWindow ? '진입 조건과 하루 매수 한도를 통과한 종목만 주문합니다.' : `신규 매수 평가 시간: ${status.value.entrySessionKst || '상태 확인 중'} (한국시간). 정규장에는 자동관리 수량의 매도 감시를 유지합니다.`
})
const decisionButtonLabel = computed(() => status.value.autoTrading ? '후보 확인·매수 판단' : '후보만 확인')
const decisionButtonHint = computed(() => status.value.autoTrading
  ? '자동매매 실행 중이므로 조건을 통과하면 실계좌 매수 주문이 전송될 수 있습니다.'
  : '자동매매가 꺼져 있어 후보만 기록하고 주문은 전송하지 않습니다.')
const settingsDirty = computed(() => showSettings.value && JSON.stringify(settings.value) !== settingsOriginal)
const validationError = computed(() => {
  const s = settings.value
  if (!['LEGACY', 'OBSERVE', 'TREND'].includes(s.signalMode)) return '매수 판단 방식을 선택하세요.'
  if (!validNumber(s.minRelativeStrengthPercent, 0, 30)) return '최소 상대강도는 0~30%p 사이여야 합니다.'
  if (!validNumber(s.riskPerTradePercent, 0.1, 1)) return '거래당 위험은 0.1~1% 사이여야 합니다.'
  if (!validNumber(s.atrStopMultiplier, 1, 4)) return 'ATR 손절 거리는 1~4배 사이여야 합니다.'
  if (!validNumber(s.maxEntryExtensionAtr, 0.1, 2)) return '허용 이격은 ATR의 0.1~2배 사이여야 합니다.'
  if (!validNumber(s.minChangePercent, 0, 20)) return '오늘 최소 상승률은 0부터 20% 사이여야 합니다.'
  if (!validNumber(s.maxChangePercent, s.signalMode === 'TREND' ? 0 : s.minChangePercent, 30)) return '오늘 최대 상승률은 적용 하한 이상, 30% 이하여야 합니다.'
  if (!validNumber(s.maxForwardPe, 5, 100)) return '최대 Forward PER는 5부터 100배 사이여야 합니다.'
  if (!validNumber(s.minRoePercent, 0, 50)) return '최소 ROE는 0부터 50% 사이여야 합니다.'
  if (!validNumber(s.minVolumeRatio, 0.5, 5)) return '시간보정 거래량은 0.5부터 5배 사이여야 합니다.'
  if (!validNumber(s.maxSpreadPercent, 0.05, 1)) return '최대 호가 스프레드는 0.05부터 1% 사이여야 합니다.'
  if (!validNumber(s.maxOrderPercent, 0.1, 100)) return '1회 매수 최대 비중은 0.1부터 100% 사이여야 합니다.'
  if (!validInteger(s.maxPositions, 1, 20)) return '동시에 보유할 종목 수는 1부터 20 사이의 정수여야 합니다.'
  if (!validInteger(s.dailyMaxBuys, 1, 20)) return '하루 매수 횟수는 1부터 20 사이의 정수여야 합니다.'
  if (!validInteger(s.symbolCooldownDays, 1, 30)) return '같은 종목을 다시 사기까지 기다릴 기간은 1부터 30일 사이여야 합니다.'
  if (!validNumber(s.stopLossPercent, 0.1, 30)) return '손절 기준은 0.1부터 30% 사이여야 합니다.'
  if (!validNumber(s.takeProfitPercent, 0.1, 100)) return '1차 이익 실현은 0.1부터 100% 사이여야 합니다.'
  if (!validNumber(s.takeProfitPercent2, s.takeProfitPercent, 100) || s.takeProfitPercent2 === s.takeProfitPercent) return '2차 이익 실현은 1차보다 크고 100% 이하여야 합니다.'
  if (!validInteger(s.maxHoldingDays, 1, 30)) return '가장 오래 보유할 기간은 1부터 30일 사이의 정수여야 합니다.'
  if (!validNumber(s.dailyLossLimitPercent, 0, 30)) return '하루 손실 안전장치는 0부터 30% 사이여야 합니다.'
  return ''
})
const signed = value => `${Number(value || 0) >= 0 ? '+' : ''}${Number(value || 0).toFixed(2)}`
const logTime = value => value ? new Date(value).toLocaleString('ko-KR', { hour12: false }) : new Date().toLocaleTimeString('ko-KR', { hour12: false })
const label = type => ({ CANDIDATE: '후보', CANDIDATE_REJECTED: '후보탈락', DATA_MISSING: '데이터누락', SETTINGS_CHANGED: '설정변경', SCREENING: '조건집계', DECISION_RESULT: '판단결과', BUY_ORDER: '매수주문', BUY_FILLED: '매수체결', SELL_ORDER: '매도주문', SELL_FILLED: '매도체결', BUY_CANCEL: '매수취소요청', SELL_CANCEL: '매도취소요청', ORDER_CANCELED: '취소완료', ORDER_UNKNOWN: '주문확인필요', USD_CASH_BLOCK: 'USD매수차단', ERROR: '오류', START: '시작', STOP: '중지' }[type] || type || '시스템')
const tone = type => type?.includes('BUY') ? 'buy' : type?.includes('SELL') ? 'sell' : type === 'CANDIDATE' ? 'candidate' : ['ERROR', 'USD_CASH_BLOCK', 'DATA_MISSING'].includes(type) ? 'error-line' : 'system'
function pushLog(item) { logs.value.push({ id: `${Date.now()}-${Math.random()}`, ...item }); if (logs.value.length > 300) logs.value.shift(); nextTick(() => { if (logBox.value) logBox.value.scrollTop = logBox.value.scrollHeight }) }
async function loadAll(sync = false, force = false) {
  if (refreshPromise) {
    try { await refreshPromise } catch (e) { if (!sync && !force) throw e }
    if ((!sync && !force) || disposed) return
  }
  if (disposed) return
  refreshPromise = (async () => {
    const { data: currentStatus } = await axios.get(`${BASE}/status`)
    if (disposed) return
    status.value = currentStatus
    let accountError
    try {
      if (currentStatus.configured) {
        const accountResponse = await (sync ? axios.post(`${BASE}/sync`) : axios.get(`${BASE}/summary`))
        if (disposed) return
        summary.value = accountResponse.data.snapshot || accountResponse.data
        accountLoaded.value = !!summary.value.capturedAt
        accountFailed.value = false
        if (sync) {
          actionNotice.value = accountResponse.data.warnings?.length ? accountResponse.data.warnings.join(' · ') : '계좌·체결 동기화를 완료했습니다.'
          status.value = (await axios.get(`${BASE}/status`)).data
        }
      }
    } catch (e) { accountError = e; accountFailed.value = true }
    // Read holdings after manual synchronization; preserve an open settings draft.
    const [settingsRes, auditRes, candidateRes, holdingRes] = await Promise.all([axios.get(`${BASE}/settings`), axios.get(`${BASE}/audit`), axios.get(`${BASE}/candidates`), axios.get(`${BASE}/holdings`)])
    if (disposed) return
    if (!showSettings.value) settings.value = settingsRes.data
    appliedSettings.value = { ...settingsRes.data }
    settingsLoaded.value = true
    if (!lastRefreshAt.value) logs.value = [...auditRes.data].reverse()
    candidates.value = candidateRes.data
    holdings.value = holdingRes.data
    lastRefreshAt.value = new Date().toISOString()
    refreshError.value = ''
    if (accountError) throw accountError
  })()
  try { await refreshPromise } catch (e) { accountFailed.value = true; throw e } finally { refreshPromise = null }
}
async function refreshInBackground() {
  try { await loadAll() } catch (e) { if (!disposed) refreshError.value = `상태 갱신 실패: ${e.response?.data?.message || e.message}` }
}
async function action(fn) { pending.value = true; error.value = ''; try { await fn() } catch (e) { error.value = e.response?.data?.message || e.message || '요청에 실패했습니다.' } finally { pending.value = false } }
async function toggle() { const enabled = !status.value.autoTrading; if (enabled && usdOnlyBlocked.value) { error.value = summary.value.cash?.blockReason || '원화주문설정금이 있어 자동매매를 시작할 수 없습니다.'; return } if (!window.confirm(enabled ? '실계좌 미국주식 신규 매수를 시작할까요? 시작 시 원화주문설정금 0원을 다시 확인하고, 실제 매수 직전에도 D+0 USD 예수금을 재검증합니다.' : '신규 자동매수를 중지할까요? 자동매매 보유종목의 손절·익절 감시와 주문 동기화는 계속됩니다.')) return; await action(async () => { const { data } = await axios.post(`${BASE}/control`, { enabled }); status.value.autoTrading = data.autoTrading; await loadAll(false, true) }) }
async function runDecision() {
  if (status.value.autoTrading && !window.confirm('현재 자동매매가 실행 중입니다. 조건을 통과한 후보가 있으면 실계좌 매수 주문이 전송될 수 있습니다. 계속할까요?')) return
  const allowOrder = status.value.autoTrading
  await action(async () => { const { data } = await axios.post(`${BASE}/decide`, null, { params: { allowOrder } }); pushLog({ type: 'SYSTEM', message: data.message, createdAt: new Date().toISOString() }); await loadAll(false, true) })
}
async function refreshAll() { await action(async () => loadAll(true)) }
async function refreshCashPolicyStatus() { await action(() => loadAll(false, true)) }
async function refreshIndexUniverse() { await action(async () => { await axios.post(`${BASE}/index-universe/refresh`); status.value = (await axios.get(`${BASE}/status`)).data }) }
function openSettings() { if (!settingsLoaded.value || pending.value) return; settings.value = { ...appliedSettings.value }; settingsOriginal = JSON.stringify(settings.value); error.value = ''; showSettings.value = true }
function closeSettings() { if (pending.value) return; if (settingsDirty.value && !window.confirm('저장하지 않은 변경사항이 있습니다. 닫을까요?')) return; settings.value = JSON.parse(settingsOriginal); showSettings.value = false }
async function saveSettings() { if (validationError.value) return; await action(async () => { settings.value = (await axios.patch(`${BASE}/settings`, settings.value)).data; appliedSettings.value = { ...settings.value }; settingsOriginal = JSON.stringify(settings.value); try { await loadAll(false, true) } catch (e) { refreshError.value = '설정은 저장됐지만 상태 갱신에 실패했습니다.'; accountFailed.value = true } showSettings.value = false; pushLog({ type: 'SYSTEM', message: '미국주식 자동매매 전략 설정을 저장했습니다.', createdAt: new Date().toISOString() }) }) }
function connect() {
  source = new EventSource(`${process.env.VUE_APP_API_URL || ''}${BASE}/events`, { withCredentials: true })
  source.onopen = () => { streamConnected.value = true; refreshInBackground() }
  source.onerror = () => { streamConnected.value = false }
  source.addEventListener('kiwoom-us', event => {
    if (disposed) return
    try { pushLog(JSON.parse(event.data)) } catch { return }
    if (!eventRefreshTimer) eventRefreshTimer = setTimeout(() => { eventRefreshTimer = null; refreshInBackground() }, 1500)
  })
}
onMounted(async () => {
  await action(() => loadAll())
  if (disposed) return
  connect()
  refreshTimer = setInterval(refreshInBackground, 30000)
})
onBeforeUnmount(() => { disposed = true; clearInterval(refreshTimer); clearTimeout(eventRefreshTimer); source?.close() })
</script>

<style scoped>
.us-settings-modal .strategy-settings{display:grid;grid-template-columns:minmax(0,1fr);overflow-x:hidden}.us-settings-modal .setting-card,.us-settings-modal .setting-field label{min-width:0}.us-settings-modal .setting-field label{flex:1}.us-settings-modal select{max-width:48%;padding:8px;border:1px solid var(--card-border);border-radius:8px;background:var(--input-bg,#171b20);color:var(--text-primary);font-size:.8rem}.us-settings-modal .number-with-unit{flex-shrink:0}@media(max-width:520px){.us-settings-modal select{max-width:100%;width:100%}}
.budget dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:16px}.budget dl>div{padding:12px;border-radius:10px;background:var(--input-bg,#171b20)}.budget dt{font-size:.8rem;color:var(--text-muted)}.budget dd{margin:7px 0 0;font-size:1.1rem;font-weight:700;font-variant-numeric:tabular-nums}.budget p,.holdings-help{margin:10px 16px;color:var(--text-secondary);font-size:.8rem;line-height:1.6}.budget>small{display:block;margin:12px 16px 16px;color:var(--text-muted);font-size:.72rem}.budget header span{font-size:.75rem;color:var(--text-muted)}.usd-notice.unknown{border-color:#806d35;background:#3a321d;color:#f2d786}.summary strong{font-variant-numeric:tabular-nums}.summary span{font-size:.75rem;line-height:1.5;margin-top:4px}@media(max-width:520px){.budget dl{grid-template-columns:1fr}.buttons{flex-wrap:wrap}.budget header{align-items:flex-start;gap:8px;flex-direction:column}}
.account-notice{display:flex;flex-direction:column;gap:4px;padding:12px;border:1px solid #806d35;border-radius:10px;background:#3a321d;color:#f2d786}.account-notice small{color:#c8b46f}
.us-auto{color:var(--text-primary)}.hero,.controls,.card,.summary article{border:1px solid var(--card-border);border-radius:16px;background:var(--card-bg)}.hero,.controls{display:flex;align-items:center;justify-content:space-between;padding:20px;margin-bottom:14px}.hero p{margin:0;color:#68a4ff;font-size:.7rem;font-weight:800;letter-spacing:.14em}.hero h3{margin:6px 0}.hero small,.controls small,.summary span,td small{display:block;color:var(--text-muted)}.hero b{padding:6px 10px;border-radius:99px;background:#43201e;color:#ffb0a5;font-size:.75rem}.usd-notice{display:flex;flex-direction:column;gap:4px;margin-bottom:14px;padding:14px 16px;border:1px solid #32694f;border-radius:12px;background:#19382b;color:#b9f5d8}.usd-notice span{font-size:.78rem}.error{padding:12px;border-radius:10px;background:#472424;color:#ffb4b4}.buttons{display:flex;gap:8px}.buttons button,.card button,.strategy-settings button{padding:8px 11px;border:1px solid var(--card-border-strong);border-radius:9px;background:transparent;color:var(--text-secondary);cursor:pointer}.buttons button:first-child{background:var(--accent);color:#18140b;font-weight:700}.buttons button.danger{background:#762f35;color:#fff}.buttons button:disabled{opacity:.45}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px}.summary article{padding:17px}.summary small{color:var(--text-muted)}.summary strong{display:block;margin:7px 0;font-size:1.25rem}.card{margin-bottom:14px;overflow:hidden}.card>header{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;border-bottom:1px solid var(--card-border)}.rules ol{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 28px;margin:15px 20px 18px;padding-left:20px;color:var(--text-secondary);font-size:.8rem}.grids{display:grid;grid-template-columns:1fr 1fr;gap:14px}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;font-size:.78rem}th,td{padding:10px 12px;border-bottom:1px solid var(--card-border);text-align:right;white-space:nowrap}th:first-child,td:first-child{text-align:left}td small{max-width:130px;overflow:hidden;text-overflow:ellipsis}.up,.buy{color:#ef7777}.down,.sell{color:#72a7ff}.empty{padding:25px!important;color:var(--text-muted)!important;text-align:center!important}.terminal{height:280px;overflow:auto;padding:13px 16px;background:#0a0f0d;font:12px/1.65 ui-monospace,Consolas,monospace}.terminal p{margin:0;word-break:break-word}.terminal time{margin-right:9px;color:#78847e}.terminal b{margin-right:5px}.terminal .candidate{color:#e7cf78}.terminal .system{color:#77dda0}.terminal .error-line{color:#f08d8d}@media(max-width:800px){.hero,.controls{align-items:flex-start;flex-direction:column;gap:12px}.buttons{width:100%;flex-direction:column}.summary,.grids{grid-template-columns:1fr}.rules ol{grid-template-columns:1fr}}
.usd-notice small{color:#90caaa;font-size:.78rem}.usd-notice.blocked{border-color:#8c4141;background:#472424;color:#ffb4b4}.usd-notice.blocked small{color:#e9a1a1}
.won-order-service{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:12px;padding:12px;border:1px solid #48564d;border-radius:10px;background:#1c2520}.won-order-service div{display:grid;gap:3px}.won-order-service small,.won-order-service span{color:var(--text-muted);font-size:.72rem}.won-order-service strong{color:#9fe0b4}.won-order-service.applied{border-color:#8c4141;background:#3d2323}.won-order-service.applied strong{color:#ffaaa5}.won-order-service.unknown strong{color:#e2c477}.won-order-service button,.fixed-rule-actions button{padding:7px 9px;border:1px solid var(--card-border-strong);border-radius:8px;background:transparent;color:var(--text-secondary);cursor:pointer;white-space:nowrap}.fixed-rule{align-items:flex-start}.fixed-rule-actions{display:flex;align-items:center;gap:6px}.rule-status{flex:0 0 auto;padding:6px 8px;border-radius:99px;font-size:.7rem;font-weight:700}.rule-status.ready{background:#1c5138;color:#9af0bd}.rule-status.blocked{background:#4b2929;color:#ffb4b4}
.market-hours>div{padding:14px 17px;color:var(--text-secondary);font-size:.8rem}.market-hours p{margin:5px 0}.market-hours b{color:var(--text-primary)}.market-hours header span{padding:5px 9px;border-radius:99px;font-size:.72rem;font-weight:700}.market-hours header .open{background:#1c5138;color:#9af0bd}.market-hours header .closed{background:#4b2929;color:#ffb4b4}
.us-settings-modal{max-width:640px}.settings-area{display:flex;flex-direction:column;min-height:0;height:100%}.easy-guide{display:grid;gap:3px;margin-bottom:12px;padding:12px;border-radius:10px;background:#1f2924;color:#dff5e5;font-size:.86rem}.easy-guide span{color:#b6c6ba;font-size:.78rem}.strategy-settings{display:grid;grid-template-columns:1fr 1fr;gap:12px}.setting-card{padding:14px;border:1px solid var(--card-border);border-radius:12px}.screen-card{border-left:3px solid #9e8ee8}.buy-card{border-left:3px solid #d98a51}.sell-card{border-left:3px solid #68a6e8}.safety-card{border-left:3px solid #d4b466}.setting-step{margin:0;font-size:1rem;font-weight:800}.setting-description{margin:4px 0 10px;color:var(--text-muted);font-size:.78rem}.setting-field{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:11px 0;border-top:1px solid var(--card-border)}.setting-field label{color:var(--text-primary);font-size:.82rem;font-weight:700}.setting-field label span{display:block;margin-top:3px;color:var(--text-muted);font-size:.72rem;font-weight:400;line-height:1.45}.number-with-unit{display:flex;align-items:center;justify-content:flex-end;gap:5px;min-width:112px;color:#80d69a}.number-with-unit.negative{color:#f29090}.number-with-unit input{box-sizing:border-box;width:72px;padding:8px;border:1px solid var(--card-border);border-radius:8px;background:var(--input-bg,#171b20);color:var(--text-primary);text-align:right}.number-with-unit em{min-width:24px;color:var(--text-muted);font-size:.78rem;font-style:normal}.settings-error{grid-column:1/-1;margin:0;padding:10px;border-radius:8px;background:#472424;color:#ffb4b4;font-size:.8rem}.settings-unsaved{color:var(--text-muted);font-size:.78rem}@media(max-width:800px){.strategy-settings{grid-template-columns:1fr}}@media(max-width:520px){.setting-field{align-items:flex-start;flex-direction:column}.number-with-unit{align-self:flex-end}}
.number-with-unit input:disabled{opacity:.45}.setting-switch{display:flex!important;align-items:center;gap:7px;white-space:nowrap}.setting-switch input{width:18px;height:18px;accent-color:var(--accent)}.setting-switch span{margin:0!important;font-size:.78rem!important}
</style>
