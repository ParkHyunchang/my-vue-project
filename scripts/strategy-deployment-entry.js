import { createApp, h, ref } from 'vue'
import Panel from '@/components/stock/UsStrategyDeploymentPanel.vue'
import { resetScenario } from './strategy-deployment-mock'
import '@/assets/css/base/vars.css'
import '@/assets/css/base/reset.css'

const blocked = () => { throw new Error('Deployment UI mock blocks network') }
window.fetch = blocked
window.XMLHttpRequest = class { constructor() { blocked() } }
window.WebSocket = class { constructor() { blocked() } }
window.EventSource = class { constructor() { blocked() } }
navigator.sendBeacon = blocked
const scenarios = { disabled: '연결 비활성', ready: '승인 가능 (합성)', ineligible: '검증 미달', locked: '10% 손실 차단', empty: '후보 없음', failure: '조회 실패' }
resetScenario('disabled')
createApp({ setup() {
  const generation = ref(0)
  return () => h('main', { style: 'max-width:1200px;margin:auto;padding:24px 16px;color:var(--text-primary);background:var(--mainBg-color);min-height:100vh' }, [
    h('aside', { style: 'border:2px solid #c9a96e;padding:16px;display:flex;flex-wrap:wrap;gap:16px;align-items:center' }, [
      h('strong', '로컬 MOCK · 실계좌/API 연결 없음 · 합성 성과'),
      h('label', ['검증 상태 ', h('select', { 'aria-label': '검증 상태', style: 'background:#fff;color:#111;padding:10px', onChange: event => { resetScenario(event.target.value); generation.value++ } }, Object.entries(scenarios).map(([value, title]) => h('option', { value }, title))) ]),
    ]), h(Panel, { key: generation.value }),
  ])
} }).mount('#app')
