import { createApp, h, ref } from 'vue'
import Screen from '@/components/stock/KiwoomUsAutoTrade.vue'
import { resetScenario, callLog } from './isolated-us-risk-mock'
import '@/assets/css/base/fonts.css'
import '@/assets/css/base/vars.css'
import '@/assets/css/base/reset.css'
import '@/assets/css/components.css'
import '@/assets/css/admin-modal.css'

const blocked = () => { throw new Error('HARNESS: network access disabled') }
window.fetch = blocked
window.XMLHttpRequest = class { constructor() { blocked() } }
window.WebSocket = class { constructor() { blocked() } }
window.EventSource = class { addEventListener() {} close() {} }
navigator.sendBeacon = blocked
document.addEventListener('click', event => { if (event.target.closest('a')) event.preventDefault() }, true)
const choices = { inactive: '최초 활성', active: '정상 활성', review: '입출금 검토', triggered: '10% 손실·청산 잠금', stale: '90초 지난 평가', failure: '위험 API 실패', unknown: '계좌 동기화 불명' }
resetScenario('inactive')
createApp({
  setup() {
    const selected = ref('inactive'), version = ref(0), mobile = ref(false)
    const choose = event => { selected.value = event.target.value; resetScenario(selected.value); version.value++ }
    return () => h('div', { style: 'padding:16px;color:var(--text-primary);background:var(--mainBg-color);min-height:100vh' }, [
      h('aside', { style: 'padding:14px;border:2px solid #c9a96e;margin:0 auto 20px;max-width:1300px;display:flex;flex-wrap:wrap;align-items:center;gap:12px' }, [
        h('strong', '로컬 MOCK · 실계좌/API 연결 없음'),
        h('label', ['검증 상태 ', h('select', { 'aria-label': '검증 상태', value: selected.value, onChange: choose, style: 'color:#111;background:#fff;padding:8px' }, Object.entries(choices).map(([value, label]) => h('option', { value }, label)))]),
        h('button', { onClick: () => { mobile.value = !mobile.value }, style: 'color:#111;background:#fff;padding:8px' }, mobile.value ? '전체 너비' : '390px 컨테이너'),
        h('span', '모바일 미디어쿼리는 실제 브라우저 창 너비 390px로 검증하세요.'),
        h('span', `모의 요청 ${callLog.length}건`),
      ]),
      h('main', { style: `width:100%;max-width:${mobile.value ? '390px' : '1300px'};margin:auto` }, [h(Screen, { key: version.value })]),
    ])
  },
}).mount('#app')
