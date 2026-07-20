<template>
  <section class="strategy-panel">
    <div class="operations">
      <span :class="{ stopped: operations.emergencyStopped }">{{ operations.emergencyStopped ? '긴급 중지 활성' : '운영 상태 정상' }}</span><button
        v-if="!operations.emergencyStopped"
        :disabled="pending"
        @click="emergencyStop"
      >
        긴급 중지
      </button><button
        v-else
        :disabled="pending"
        @click="emergencyResume"
      >
        긴급 중지 해제
      </button>
    </div>
    <button
      class="sync-orders"
      :disabled="pending"
      @click="syncOrders"
    >
      주문 상태 동기화
    </button>
    <header>
      <div><small>KIWOOM STRATEGY</small><h3>AI 전략 제안 <em>{{ config.dryRun ? 'DRY-RUN' : 'ORDER ENABLED' }}</em></h3></div><div class="header-actions">
        <button
          :disabled="pending"
          @click="showSettings = true"
        >
          전략 설정
        </button><button
          :disabled="pending || !configured || operations.emergencyStopped"
          @click="decide"
        >
          지금 판단
        </button>
      </div>
    </header>
    <div
      v-if="operations.risk"
      class="risk-strip"
    >
      <span
        v-if="operations.risk.triggered"
        class="risk-triggered"
      >일일 손실 한도 발동 · 신규 매수 차단</span><span v-else-if="operations.risk.dailyLossLimitAmount > 0">일일 손실 {{ Number(operations.risk.drawdown).toLocaleString() }}원 / 한도 {{ Number(operations.risk.dailyLossLimitAmount).toLocaleString() }}원</span><span v-else>일일 손실 한도 미설정</span><span :class="['risk-loop', { on: operations.risk.riskLoopEnabled }]">손절·익절 루프 {{ operations.risk.riskLoopEnabled ? 'ON' : 'OFF' }}</span><small v-if="operations.risk.lastScanAt">마지막 스캔 {{ date(operations.risk.lastScanAt) }}</small><button
        :disabled="pending || !configured || operations.emergencyStopped"
        @click="riskScan"
      >
        리스크 스캔
      </button>
    </div>
    <p class="notice">
      {{ config.autoExecute ? `자동 주문 활성: 예약 판단에서 신뢰도 ${config.autoExecuteMinConfidence}% 이상인 지정가 제안만 전송합니다.` : '제안은 승인과 주문 초안 단계를 거칩니다. 자동 주문 전송은 현재 비활성화되어 있습니다.' }}
    </p>
    <p
      v-if="error"
      class="error"
    >
      {{ error }}
    </p>
    <div class="candidate-list">
      <span
        v-for="c in candidates"
        :key="c.code"
        class="candidate-chip"
      >{{ c.name }} · {{ c.code }} <span :class="['change-badge', changeClass(c.changePercent)]">{{ formatChangePct(c.changePercent) }}</span> <small>거래량 {{ c.volumeRatio }}배</small></span><small v-if="!candidates.length">현재 KRX 자동 스캔 매매 후보가 없습니다.</small>
    </div>
    <div class="runs">
      <article
        v-for="run in runs"
        :key="run.id"
      >
        <div class="run-meta">
          <b>{{ run.status }}</b><small>{{ date(run.createdAt) }} · {{ run.triggeredBy }}</small>
        </div><p>{{ run.marketView || run.errorMessage || '생성된 제안이 없습니다.' }}</p><div class="proposals">
          <div
            v-for="proposal in run.proposals"
            :key="proposal.id"
            :class="['proposal', proposal.action]"
          >
            <b>{{ proposal.action }}</b><span>{{ proposal.stockName }} ({{ proposal.stockCode }})</span><span v-if="proposal.quantity">{{ proposal.quantity.toLocaleString() }}주</span><span v-if="proposal.limitPrice">{{ proposal.limitPrice.toLocaleString() }}원</span><small>{{ proposal.confidence }}% · {{ proposal.reason }}</small><small
              v-if="proposal.guardFlags"
              class="guards"
            >안전 경고: {{ guardText(proposal.guardFlags) }}</small><small>상태: {{ proposal.status }}</small><div class="workflow-actions">
              <button
                v-if="canApprove(proposal)"
                :disabled="pending"
                @click="approve(proposal.id)"
              >
                승인
              </button><button
                v-if="canReject(proposal)"
                :disabled="pending"
                @click="reject(proposal.id)"
              >
                거절
              </button><button
                v-if="proposal.status === 'APPROVED'"
                :disabled="pending"
                @click="draft(proposal.id)"
              >
                주문 초안
              </button><button
                v-if="proposal.status === 'ORDER_DRAFT'"
                :disabled="pending"
                @click="editDraft(proposal)"
              >
                수량·가격 수정
              </button><button
                v-if="proposal.status === 'ORDER_DRAFT'"
                :disabled="pending || !config.orderEnabled"
                :title="config.orderEnabled ? '키움 주문을 전송합니다.' : '주문 전송은 비활성화되어 있습니다.'"
                @click="execute(proposal)"
              >
                최종 주문 확인
              </button><button
                v-if="['ORDERED', 'PARTIALLY_FILLED'].includes(proposal.status)"
                :disabled="pending || !config.orderEnabled || operations.emergencyStopped"
                @click="amendOrder(proposal)"
              >
                주문 정정
              </button><button
                v-if="['ORDERED', 'PARTIALLY_FILLED'].includes(proposal.status)"
                :disabled="pending"
                @click="cancelOrder(proposal)"
              >
                주문 취소
              </button>
            </div><small v-if="proposal.status === 'ORDERED'">주문 전송됨</small><small v-if="proposal.status === 'CANCEL_REQUESTED'">취소 요청됨 · 주문 상태 동기화 대기 중</small><small v-if="proposal.status === 'CANCELED'">주문 취소됨</small><small v-if="proposal.status === 'REJECTED'">거절됨 · {{ proposal.rejectionReason }}</small><small v-if="proposal.status === 'ORDER_FAILED'">전송 실패: {{ proposal.errorMessage }}</small>
          </div>
        </div>
      </article><p
        v-if="!loading && !runs.length"
        class="empty"
      >
        아직 전략 판단 이력이 없습니다.
      </p>
    </div>
    <KiwoomStrategySettingsModal
      v-if="showSettings"
      :dry-run="config.dryRun"
      @close="showSettings = false"
      @saved="onSettingsSaved"
    />
  </section>
</template>

<script setup>
/* global defineProps */
import { onMounted, ref } from 'vue'
import axios from '@/axios'
import KiwoomStrategySettingsModal from '@/components/stock/KiwoomStrategySettingsModal.vue'
import { useStockFormatters } from '@/composables/useStockFormatters'
defineProps({ configured: Boolean })
const { formatChangePct, changeClass } = useStockFormatters()
const candidates = ref([]), runs = ref([])
const config = ref({ orderEnabled: false, dryRun: true, autoExecute: false, autoExecuteMinConfidence: 85 }), operations = ref({ emergencyStopped: false }), pending = ref(false), loading = ref(false), error = ref(''), showSettings = ref(false)
const date = (value) => value ? new Date(value).toLocaleString('ko-KR', { hour12: false }) : ''
const GUARD_LABELS = { MAX_ORDER_AMOUNT: '주문한도 초과', DAILY_LIMIT: '일일 제안 한도', SYMBOL_COOLDOWN: '재제안 쿨다운', MARKET_CLOSED: '장외 시간', INSUFFICIENT_DEPOSIT: '예수금 부족', MAX_BUY_BUDGET: '매수 비율 한도 초과', DAILY_LOSS_LIMIT: '일일 손실 한도' }
const guardText = (flags) => (flags || '').split(',').filter(Boolean).map((f) => GUARD_LABELS[f] || f).join(', ')
const canApprove = (p) => p.status === 'PROPOSED' && p.action !== 'HOLD' && !p.guardFlags
const canReject = (p) => ['PROPOSED', 'APPROVED'].includes(p.status)
async function load () { loading.value = true; try { const [universe, history, strategyConfig] = await Promise.all([axios.get('/api/kiwoom/strategy/universe'), axios.get('/api/kiwoom/strategy/runs?limit=10'), axios.get('/api/kiwoom/strategy/config')]); candidates.value = universe.data; runs.value = history.data; config.value = strategyConfig.data } catch (e) { error.value = e.response?.data?.message || '전략 데이터를 불러오지 못했습니다.' } finally { loading.value = false } }
async function decide () { pending.value = true; error.value = ''; try { await axios.post('/api/kiwoom/strategy/decide'); await load() } catch (e) { error.value = e.response?.data?.message || '전략 판단에 실패했습니다.' } finally { pending.value = false } }
async function approve (id) { await action(`/api/kiwoom/strategy/proposals/${id}/approve`) }
async function draft (id) { await action(`/api/kiwoom/strategy/proposals/${id}/draft`) }
async function editDraft (proposal) { const quantity = Number(window.prompt('주문 수량을 입력하세요.', proposal.quantity)); if (!Number.isInteger(quantity) || quantity <= 0) return; const limitPrice = Number(window.prompt('지정가를 입력하세요.', proposal.limitPrice)); if (!Number.isInteger(limitPrice) || limitPrice <= 0) return; pending.value = true; error.value = ''; try { await axios.patch(`/api/kiwoom/strategy/proposals/${proposal.id}/draft`, { quantity, limitPrice }); await load() } catch (e) { error.value = e.response?.data?.message || '주문 초안을 수정하지 못했습니다.' } finally { pending.value = false } }
async function reject (id) { const reason = window.prompt('거절 사유를 입력하세요. (선택)', ''); if (reason !== null) await action(`/api/kiwoom/strategy/proposals/${id}/reject`, { reason }) }
async function execute (proposal) { if (window.confirm(`${proposal.action} ${proposal.stockName} ${proposal.quantity}주 주문을 키움에 전송할까요? 되돌릴 수 없습니다.`)) await action(`/api/kiwoom/strategy/proposals/${proposal.id}/execute`, { confirmed: true }) }
async function amendOrder (proposal) { const maximum = proposal.remainingQuantity || proposal.quantity; const quantity = Number(window.prompt(`정정할 수량을 입력하세요. (최대 ${maximum}주)`, maximum)); if (!Number.isInteger(quantity) || quantity <= 0 || quantity > maximum) return; const limitPrice = Number(window.prompt('새 지정가를 입력하세요.', proposal.limitPrice)); if (!Number.isInteger(limitPrice) || limitPrice <= 0) return; if (window.confirm(`${proposal.stockName} 주문을 ${quantity}주, ${limitPrice.toLocaleString()}원으로 정정할까요?`)) { pending.value = true; error.value = ''; try { await axios.patch(`/api/kiwoom/strategy/proposals/${proposal.id}/order`, { quantity, limitPrice }); await load() } catch (e) { error.value = e.response?.data?.message || '주문 정정에 실패했습니다.' } finally { pending.value = false } } }
async function cancelOrder (proposal) { const maximum = proposal.remainingQuantity || proposal.quantity; const quantity = Number(window.prompt(`취소할 수량을 입력하세요. (최대 ${maximum}주)`, maximum)); if (!Number.isInteger(quantity) || quantity <= 0 || quantity > maximum) return; if (window.confirm(`${proposal.stockName} ${quantity}주 주문을 취소할까요?`)) await action(`/api/kiwoom/strategy/proposals/${proposal.id}/cancel`, { quantity }) }
async function action (url, body) { pending.value = true; error.value = ''; try { await axios.post(url, body); await load() } catch (e) { error.value = e.response?.data?.message || '요청을 처리하지 못했습니다.' } finally { pending.value = false } }
async function loadOperations () { try { operations.value = (await axios.get('/api/kiwoom/strategy/health')).data } catch { /* 운영 상태 조회 실패는 기존 전략 기능을 막지 않는다. */ } }
async function emergencyStop () { if (!window.confirm('자동 판단과 주문 전송을 긴급 중지할까요?')) return; pending.value = true; try { await axios.post('/api/kiwoom/auto-trade/emergency-stop'); await loadOperations() } catch (e) { error.value = e.response?.data?.message || '긴급 중지에 실패했습니다.' } finally { pending.value = false } }
async function emergencyResume () { if (!window.confirm('긴급 중지를 해제할까요? 자동 판단은 별도로 다시 시작해야 합니다.')) return; pending.value = true; try { await axios.post('/api/kiwoom/auto-trade/emergency-resume'); await loadOperations() } catch (e) { error.value = e.response?.data?.message || '긴급 중지 해제에 실패했습니다.' } finally { pending.value = false } }
async function syncOrders () { pending.value = true; error.value = ''; try { const { data } = await axios.post('/api/kiwoom/strategy/orders/sync'); if (data.updated > 0) await load(); else error.value = data.message } catch (e) { error.value = e.response?.data?.message || '주문 상태 동기화에 실패했습니다.' } finally { pending.value = false } }
async function riskScan () { pending.value = true; error.value = ''; try { const { data } = await axios.post('/api/kiwoom/strategy/risk/scan'); if (data.proposalCount > 0) await load(); else error.value = data.message; await loadOperations() } catch (e) { error.value = e.response?.data?.message || '리스크 스캔에 실패했습니다.' } finally { pending.value = false } }
async function onSettingsSaved () { showSettings.value = false; await load(); await loadOperations() }
onMounted(async () => { await load(); await loadOperations() })
</script>

<style scoped>
.strategy-panel{margin:14px 0;color:var(--text-primary);background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;padding:18px}.header-actions{display:flex;gap:6px;flex-shrink:0}.risk-strip{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:8px 0;padding:8px 10px;border:1px solid var(--card-border);border-radius:10px;font-size:.78rem}.risk-strip small{color:var(--text-muted)}.risk-strip button{margin-left:auto;padding:4px 8px;font-size:.75rem}.risk-triggered{background:#5a2323;color:#ffb4b4;border-radius:99px;padding:4px 9px;font-weight:700}.risk-loop{background:#30343a;color:#d9dce0;border-radius:99px;padding:4px 9px}.risk-loop.on{background:#1f3a2a;color:#9fe2b8}.strategy-panel header{display:flex;align-items:center;justify-content:space-between}.strategy-panel h3{margin:4px 0}.strategy-panel header small{color:var(--accent);font-weight:800;letter-spacing:.1em}.strategy-panel em{font-style:normal;color:#e9b664;font-size:.7rem;margin-left:6px}.strategy-panel button{cursor:pointer;border:1px solid var(--card-border-strong);border-radius:8px;padding:7px 10px;background:transparent;color:var(--text-primary)}.strategy-panel button:disabled{opacity:.5;cursor:not-allowed}.notice,.error{padding:10px;border-radius:8px;font-size:.82rem}.notice{background:#3c3424;color:#f2ce8b}.error{background:#482424;color:#ffb4b4}.candidate-list{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0}.candidate-chip{display:inline-flex;align-items:center;gap:5px;background:#1f2924;border-radius:99px;font-size:.77rem;padding:5px 9px}.empty{color:var(--text-muted)}.runs{margin-top:15px}.runs article{border-top:1px solid var(--card-border);padding:12px 0}.run-meta{display:flex;gap:8px;align-items:center}.run-meta b{font-size:.7rem;background:#303a34;padding:3px 6px;border-radius:5px}.run-meta small{color:var(--text-muted)}.runs p{font-size:.84rem;margin:7px 0}.proposals{display:flex;flex-wrap:wrap;gap:7px}.proposal{border-radius:8px;padding:7px;font-size:.76rem;display:flex;gap:5px;flex-wrap:wrap}.proposal small{width:100%;opacity:.8}.proposal.BUY{background:#4a2626;color:#ffbab4}.proposal.SELL{background:#213853;color:#b9d7ff}.proposal.HOLD{background:#30343a;color:#d9dce0}.workflow-actions{display:flex;gap:5px;width:100%;margin-top:4px}.workflow-actions button{padding:4px 6px;font-size:.75rem}
</style>

<!-- .change-badge 색상 클래스는 전역 stock.css에 정의됨 (Top10Panel.vue와 동일 패턴) -->
<style src="@/assets/css/stock.css" scoped></style>
