import { createApp } from 'vue'
import App from './App.vue'
import router from './router';
import store from './store';
import './assets/js/main.js';

const app = createApp(App);

app.use(store);
app.use(router);

// 앱 시작 시 인증 상태 확인
store.dispatch('auth/checkAuth').then(() => {
  app.mount('#app');
});
