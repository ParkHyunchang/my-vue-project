import axios from 'axios'

// This local bundle never imports production auth, cookies or API configuration.
const client = axios.create({
  baseURL: '', timeout: 30000, withCredentials: false,
  headers: { 'X-Strategy-Lab-Local': '1', 'X-Requested-With': 'XMLHttpRequest' },
})
client.interceptors.request.use(config => {
  if (!/^\/api\/strategy-lab\/(status|cycle|scheduler|approve|reject|export)$/.test(config.url || '')) {
    throw new Error('Research client rejects non-research routes')
  }
  return config
})
export default client
