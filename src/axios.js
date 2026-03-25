import axios from "axios";
import store from './store';

// api 엔드포인트 백엔드 서버 연동설정
// VUE_APP_API_URL은 .env 파일에서 반드시 설정해야 합니다.
const api = axios.create({
  baseURL: process.env.VUE_APP_API_URL
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
