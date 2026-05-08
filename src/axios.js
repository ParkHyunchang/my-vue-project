import axios from "axios";
import store from './store';

// api 엔드포인트 백엔드 서버 연동설정
// VUE_APP_API_URL은 .env 파일에서 반드시 설정해야 합니다.
const api = axios.create({
  baseURL: process.env.VUE_APP_API_URL,
  // httpOnly 쿠키 자동 송수신을 위해 credentials 활성화
  withCredentials: true,
  // CSRF 보호: 백엔드 CsrfHeaderFilter가 상태 변경 요청에 이 헤더를 요구
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// 401 응답 시 refresh 후 1회 재시도. 동시 요청은 같은 refresh promise를 공유.
let refreshPromise = null;

async function performRefresh() {
  if (!refreshPromise) {
    refreshPromise = axios.post(
      `${process.env.VUE_APP_API_URL || ''}/api/auth/refresh`,
      {},
      {
        withCredentials: true,
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      }
    ).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    // refresh 자체가 실패한 경우는 즉시 로그아웃 처리
    if (original?.url?.endsWith('/api/auth/refresh')) {
      store.dispatch('auth/logoutLocal');
      return Promise.reject(error);
    }

    if (status === 401 && !original?._retry) {
      original._retry = true;
      try {
        await performRefresh();
        return api(original);
      } catch (refreshError) {
        store.dispatch('auth/logoutLocal');
        if (window.location.hash !== '#/login') {
          window.location.hash = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
