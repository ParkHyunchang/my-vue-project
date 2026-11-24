import axios from 'axios'

// Standalone bundle only: no production auth refresh, cookies, API hosts or credentials.
const api = axios.create({
  baseURL: '', timeout: 30000, withCredentials: false,
  headers: { 'X-Paper-Local': '1', 'X-Requested-With': 'XMLHttpRequest' },
})
api.interceptors.request.use(config => {
  if (!/^\/api\/us-paper\/sessions(?:\/|$)/.test(config.url || '')) {
    throw new Error('Paper-only client rejects non-paper API routes')
  }
  return config
})
export default api
