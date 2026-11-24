// Local UI fixture only. No network, production adapter, account or signature key.
export const requests = []
let scenario = 'disabled'
let revision = 4
let active = null
let managed = false
export function resetScenario(name) { scenario = name; revision = 4; active = null; managed = false; requests.length = 0 }
function status() {
  const eligible = !['ineligible', 'locked'].includes(scenario)
  return { bridgeEnabled: scenario !== 'disabled', revision, accountScope: 'mock-account', managed, active,
    candidate: scenario === 'empty' ? null : { id: 'mock-report-1', candidateId: 'balanced_trend:recovery_vol', name: '분산 추세 회복형 · 합성 검증 후보', version: 'mock-version-26', reportId: 'mock-report-26', historicalAnnualizedPct: 11.2, forwardReturnPct: 5.1, forwardDays: 65, forwardFillCount: 23, eligible, reasons: eligible ? [] : ['관찰 성과 또는 계좌 위험 조건 미충족'] },
    blockers: scenario === 'locked' ? ['계좌 10% 손실 차단 · 승인 불가'] : [], lastExecution: 'MOCK · 실제 실행 없음' }
}
const client = {
  async get(url) {
    requests.push({ method: 'GET', url })
    if (scenario === 'failure') throw new Error('MOCK 연결 확인 실패')
    if (url !== '/api/kiwoom/us/strategy-deployments/status') throw new Error('MOCK rejects unknown route')
    return { data: status() }
  },
  async post(url, body) {
    requests.push({ method: 'POST', url })
    if (scenario === 'disabled') throw new Error('MOCK 연결 비활성')
    const current = status()
    if (url.endsWith('/imports')) { scenario = 'ready'; revision++; return { data: status() } }
    if (body.expectedRevision !== revision) throw new Error('MOCK revision conflict')
    if (url.endsWith('/approve')) {
      if (!current.candidate?.eligible || current.blockers.length || body.confirmLive !== true) throw new Error('MOCK 승인 불가')
      active = { candidateId: current.candidate.candidateId, version: current.candidate.version, reportId: current.candidate.reportId, approvedAt: new Date().toISOString() }
      managed = true
    } else if (url.endsWith('/revoke')) { active = null } else throw new Error('MOCK rejects unknown route')
    revision++; return { data: status() }
  },
}
export default client
