import { syncDynamicRoutes } from '../../router/index.js';
import { logger } from '@/utils/logger';

// 메뉴 정의 로드 완료 후 동적 라우트 동기화 헬퍼
async function applyDynamicRoutes(rootGetters) {
    try {
        const allMenus = rootGetters['menu/allMenus'] ?? [];
        const paths = allMenus.map(m => m.path);
        syncDynamicRoutes(paths);
    } catch (e) {
        logger.error('동적 라우트 동기화 실패:', e);
    }
}

// 인증 상태는 httpOnly 쿠키에 의해 결정되므로 클라이언트 메모리에만 보관한다.
// 새로고침 시에는 main.js의 checkAuth 호출이 /api/auth/me로 상태를 복원한다.
const state = {
  user: null,
  isAuthenticated: false,
};

const mutations = {
  SET_AUTHENTICATED(state, value) {
    state.isAuthenticated = !!value;
  },
  SET_USER(state, user) {
    state.user = user;
    state.isAuthenticated = !!user;
  },
  LOGOUT(state) {
    state.user = null;
    state.isAuthenticated = false;
  },
};

async function loadAuthContext(dispatch, rootGetters) {
  try {
    await dispatch("menu/loadMenuDefinitions", null, { root: true });
    await dispatch("menu/loadUserMenus", null, { root: true });
    await applyDynamicRoutes(rootGetters);
  } catch (error) {
    logger.error("메뉴 권한 로드 실패:", error);
  }
}

const actions = {
  async login({ commit, dispatch, rootGetters }, credentials) {
    try {
      const axios = (await import("@/axios")).default;
      const response = await axios.post("/api/auth/login", credentials);
      const { username, email, role, message } = response.data;

      commit("SET_USER", { username, email, role });

      await loadAuthContext(dispatch, rootGetters);

      return { success: true, message };
    } catch (error) {
      const message = error.response?.data?.message || "로그인에 실패했습니다.";
      return { success: false, message };
    }
  },

  async register({ commit, dispatch, rootGetters }, userData) {
    try {
      const axios = (await import("@/axios")).default;
      const response = await axios.post("/api/auth/register", userData);
      const { username, email, role, message } = response.data;

      commit("SET_USER", { username, email, role });

      await loadAuthContext(dispatch, rootGetters);

      return { success: true, message };
    } catch (error) {
      const message =
        error.response?.data?.message || "회원가입에 실패했습니다.";
      return { success: false, message };
    }
  },

  async fetchProfile() {
    try {
      const axios = (await import("@/axios")).default;
      const response = await axios.get("/api/auth/me");
      return response.data;
    } catch {
      return null;
    }
  },

  async updateProfile({ commit }, profileData) {
    try {
      const axios = (await import("@/axios")).default;
      const response = await axios.put("/api/auth/me", profileData);
      const { username, email, role } = response.data;
      commit("SET_USER", { username, email, role });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || "정보 수정에 실패했습니다.";
      return { success: false, message };
    }
  },

  async changePassword(_, { currentPassword, newPassword }) {
    try {
      const axios = (await import("@/axios")).default;
      await axios.put("/api/auth/change-password", { currentPassword, newPassword });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || "비밀번호 변경에 실패했습니다.";
      return { success: false, message };
    }
  },

  // 서버 로그아웃: 쿠키 삭제 + 블랙리스트 등록
  async logout({ commit, dispatch, rootGetters }) {
    try {
      const axios = (await import("@/axios")).default;
      await axios.post("/api/auth/logout");
    } catch (e) {
      // 네트워크 실패해도 로컬은 정리
    }
    commit("LOGOUT");
    try {
      await dispatch("menu/loadMenuDefinitions", null, { root: true });
      await dispatch("menu/loadUserMenus", null, { root: true });
      await applyDynamicRoutes(rootGetters);
    } catch (e) {
      // 무시
    }
  },

  // 클라이언트 측 강제 정리 (서버 호출 없이) — axios 인터셉터에서 사용
  logoutLocal({ commit }) {
    commit("LOGOUT");
    // 메뉴 접근 권한도 비로그인(guest) 상태로 초기화한다.
    // (auth만 비우고 userMenus를 남기면 stale 메뉴로 접근/노출되는 불일치 발생)
    commit("menu/SET_USER_MENUS", ["/", "/chat"], { root: true });
  },

  async checkAuth({ commit, dispatch, rootGetters }) {
    try {
      const axios = (await import("@/axios")).default;
      const response = await axios.get("/api/auth/me");

      const { username, email, role } = response.data;
      commit("SET_USER", { username, email, role });

      await loadAuthContext(dispatch, rootGetters);
      return true;
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        commit("LOGOUT");
      }
      return false;
    }
  },
};

// 메뉴 접근 권한 기반 통합 체크: 접근 가능한 메뉴면 모든 CRUD 허용.
// canCreate/canRead/canUpdate/canDelete 4개 getter는 동일 결과를 반환해
// 기존 호출부(@/components/dating/MemoryFormModal.vue 등)와 호환된다.
const hasMenuAccess = (rootGetters, user, menuPath) => {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return !!rootGetters["menu/canAccessMenu"]?.(menuPath);
};

const getters = {
  isAuthenticated: (state) => state.isAuthenticated,
  user: (state) => state.user,
  isAdmin: (state) => state.user?.role === "ADMIN",
  isPremium: (state) =>
    state.user?.role === "PREMIUM" || state.user?.role === "ADMIN",
  hasRole: (state) => (role) => {
    if (!state.user) return false;
    if (role === "ADMIN") return state.user.role === "ADMIN";
    if (role === "PREMIUM")
      return state.user.role === "PREMIUM" || state.user.role === "ADMIN";
    return state.user.role === role;
  },
  canCreate: (state, _getters, _rootState, rootGetters) => (menuPath) =>
    hasMenuAccess(rootGetters, state.user, menuPath),
  canRead: (state, _getters, _rootState, rootGetters) => (menuPath) =>
    hasMenuAccess(rootGetters, state.user, menuPath),
  canUpdate: (state, _getters, _rootState, rootGetters) => (menuPath) =>
    hasMenuAccess(rootGetters, state.user, menuPath),
  canDelete: (state, _getters, _rootState, rootGetters) => (menuPath) =>
    hasMenuAccess(rootGetters, state.user, menuPath),
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
};
