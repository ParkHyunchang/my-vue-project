import http from '@/axios'

const BASE = '/api/strategy-lab'
const options = signal => ({ signal, timeout: 30000 })

// Paper-only research API. Approval is bound to the exact report and state revision.
export const usStrategyLabApi = {
  status: signal => http.get(`${BASE}/status`, options(signal)),
  cycle: signal => http.post(`${BASE}/cycle`, {}, options(signal)),
  scheduler: (enabled, signal) => http.post(`${BASE}/scheduler`, { enabled }, options(signal)),
  approve: (decision, signal) => http.post(`${BASE}/approve`, decision, options(signal)),
  reject: (decision, signal) => http.post(`${BASE}/reject`, decision, options(signal)),
  exportReport: (decision, signal) => http.post(`${BASE}/export`, decision, options(signal)),
}
