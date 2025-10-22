import axios from "axios";
import store from './store';

// 현재 브라우저 URL을 기반으로 백엔드 URL 결정
const getBaseURL = () => {
  const hostname = window.location.hostname;
  
  // 로컬 개발 환경
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3200';
  }
  
  // IP 주소로 접속
  if (hostname === '125.141.20.218') {
    return 'http://125.141.20.218:3200';
  }
  
  // 도메인으로 접속
  if (hostname.includes('synology.me')) {
    return `http://${hostname}:3200`;
  }
  
  // 기타 경우 (기본값)
  return 'http://125.141.20.218:3200';
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
