import { createApp } from 'vue'
import App from './App.vue'
import router from './router';
import store from './store';
import './assets/js/main.js';

/* ─── 전역 CSS (모든 페이지에서 사용) ─── */
import './assets/css/base/fonts.css';
import './assets/css/base/vars.css';
import './assets/css/base/reset.css';
import './assets/css/components.css';

const app = createApp(App);

app.use(store);
app.use(router);

// 앱 시작 시 인증 상태 확인
async function initializeApp() {
  try {
    // 토큰이 있는 경우에만 인증 확인
    if (store.getters['auth/token']) {
      await store.dispatch('auth/checkAuth');
    }
  } catch (error) {
    // 초기 인증 확인 실패는 무시
  } finally {
    // 인증 확인 완료 후 앱 마운트
    app.mount('#app');
  }
}

initializeApp();
