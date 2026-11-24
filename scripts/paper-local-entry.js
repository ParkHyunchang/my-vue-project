import { createApp, h } from 'vue'
import UsPaperTradingPanel from '@/components/stock/UsPaperTradingPanel.vue'
import '@/assets/css/base/fonts.css'
import '@/assets/css/base/vars.css'
import '@/assets/css/base/reset.css'
import '@/assets/css/components.css'
import '@/assets/css/admin-modal.css'

createApp({
  render: () => h('main', { style: 'min-height:100vh;padding:16px;background:var(--mainBg-color);color:var(--text-primary)' }, [
    h('div', { style: 'max-width:1280px;margin:0 auto' }, [
      h('p', { style: 'padding:12px;border:1px solid currentColor;margin-bottom:16px' }, '로컬 모의매매 전용 · 실제 주문 기능 없음 · 이 창을 닫아도 서버가 켜져 있으면 모의 운용은 계속됩니다.'),
      h(UsPaperTradingPanel),
    ]),
  ]),
}).mount('#app')
