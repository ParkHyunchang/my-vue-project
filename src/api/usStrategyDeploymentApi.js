import http from '@/axios'

const BASE = '/api/kiwoom/us/strategy-deployments'
const options = signal => ({ signal, timeout: 30000 })

// Status: bridgeEnabled, revision, accountScope, managed, active, candidate, blockers, lastExecution.
// Approval selects a signed report/version. It never starts automatic trading.
export const usStrategyDeploymentApi = {
  status: signal => http.get(`${BASE}/status`, options(signal)),
  importReport: (envelope, signal) => http.post(`${BASE}/imports`, envelope, options(signal)),
  approve: (decision, signal) => http.post(`${BASE}/approve`, decision, options(signal)),
  revoke: (expectedRevision, signal) => http.post(`${BASE}/revoke`, { expectedRevision }, options(signal)),
}
