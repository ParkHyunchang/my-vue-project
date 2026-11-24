import http from '@/axios'

const SESSIONS = '/api/us-paper/sessions'
const sessionPath = id => `${SESSIONS}/${encodeURIComponent(String(id))}`
const options = signal => ({ signal, timeout: 30000 })

/** Paper-only endpoints. No broker credentials or real-order control endpoints. */
export const usPaperTradingApi = {
  list: signal => http.get(SESSIONS, options(signal)),
  get: (id, signal) => http.get(sessionPath(id), options(signal)),
  create: (initialCashUsd, signal) => http.post(SESSIONS, { initialCashUsd }, options(signal)),
  start: (id, signal) => http.post(`${sessionPath(id)}/start`, {}, options(signal)),
  stop: (id, signal) => http.post(`${sessionPath(id)}/stop`, {}, options(signal)),
  poll: (id, signal) => http.post(`${sessionPath(id)}/poll`, {}, options(signal)),
}
