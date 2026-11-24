import { createApp, h } from 'vue'
import UsStrategyLab from '@/components/stock/UsStrategyLab.vue'
import '@/assets/css/base/fonts.css'
import '@/assets/css/base/vars.css'
import '@/assets/css/base/reset.css'

createApp({
  render: () => h('main', {
    style: 'min-height:100vh;padding:24px 16px;background:var(--mainBg-color);color:var(--text-primary)',
  }, [h(UsStrategyLab)]),
}).mount('#app')
