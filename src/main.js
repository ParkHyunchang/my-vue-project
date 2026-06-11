import { createApp } from 'vue'
import App from './App.vue'
import router, { syncDynamicRoutes } from './router';
import store from './store';
import './assets/js/main.js';

/* ─── 전역 CSS (모든 페이지에서 사용) ─── */
import './assets/css/base/fonts.css';
import './assets/css/base/vars.css';
import './assets/css/base/reset.css';
import './assets/css/components.css';

const app = createApp(App);

app.use(store);

// 앱 시작 시 인증 상태 확인 (httpOnly 쿠키 → 서버에 /api/auth/me 호출로 복원)
async function initializeApp() {
  try {
    await store.dispatch('auth/checkAuth');
  } catch (error) {
    // 초기 인증 확인 실패는 무시 (비로그인 상태)
  }

  // 비로그인 상태이면 GUEST 메뉴 로드 + 동적 라우트 등록
  if (!store.getters['auth/isAuthenticated']) {
    try {
      await store.dispatch('menu/loadMenuDefinitions');
      await store.dispatch('menu/loadUserMenus');
      const allMenus = store.getters['menu/allMenus'];
      syncDynamicRoutes(allMenus.map(m => m.path));
    } catch (e) {
      // 비로그인 메뉴 로드 실패는 무시
    }
  }

  // 라우터는 인증 복원·동적 라우트 등록이 끝난 뒤 설치한다.
  // (먼저 설치하면 초기 네비게이션 가드가 인증/라우트 준비 전에 실행돼
  //  딥링크 새로고침 시 빈 화면이나 잘못된 /login 이동이 발생함)
  app.use(router);
  app.mount('#app');
}

initializeApp();
