import axios from "axios";
import store from './store';

// 백엔드 URL 결정: 환경변수 우선, 없으면 hostname 기반 fallback
const getBaseURL = () => {
  if (process.env.VUE_APP_API_URL) {
    return process.env.VUE_APP_API_URL;
  }
  // 배포 환경 fallback: 프론트엔드와 같은 호스트의 3200 포트
  return `http://${window.location.hostname}:3200`;
};

// api 엔드포인트 백엔드 서버 연동설정
const api = axios.create({
  baseURL: getBaseURL()
});

// 요청 인터셉터 - JWT 토큰 자동 추가
api.interceptors.request.use(
  (config) => {
    const token = store.getters['auth/token'];
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 토큰 만료 시 자동 로그아웃
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      store.dispatch('auth/logout');
      // 로그인 페이지로 리다이렉트
      if (window.location.hash !== '#/login') {
        window.location.hash = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
