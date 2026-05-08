import { syncDynamicRoutes } from '../../router/index.js';
import { PREMIUM_MENU_PATHS } from '../../config/routes';

// 메뉴 정의 로드 완료 후 동적 라우트 동기화 헬퍼
async function applyDynamicRoutes(rootGetters) {
    try {
        const allMenus = rootGetters['menu/allMenus'] ?? [];
        const paths = allMenus.map(m => m.path);
        syncDynamicRoutes(paths);
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error('동적 라우트 동기화 실패:', e);
    }
}

// 인증 상태는 httpOnly 쿠키에 의해 결정되므로 클라이언트 메모리에만 보관한다.
// 새로고침 시에는 main.js의 checkAuth 호출이 /api/auth/me로 상태를 복원한다.
const state = {
  user: null,
  isAuthenticated: false,
  crudPermissions: [],
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
    state.crudPermissions = [];
  },
  SET_CRUD_PERMISSIONS(state, permissions) {
    state.crudPermissions = permissions;
  },
};

async function loadAuthContext(dispatch, rootGetters) {
  try {
    await dispatch("menu/loadMenuDefinitions", null, { root: true });
    await dispatch("menu/loadUserMenus", null, { root: true });
    await applyDynamicRoutes(rootGetters);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("메뉴 권한 로드 실패:", error);
  }
  try {
    await dispatch("loadCrudPermissions");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("CRUD 권한 로드 실패:", error);
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

  async loadCrudPermissions({ commit, state }) {
    if (!state.user) {
      return;
    }

    try {
      const axios = (await import("@/axios")).default;
      const response = await axios.get("/api/admin/user-crud-permissions");
      commit("SET_CRUD_PERMISSIONS", response.data);
    } catch (error) {
      // 403 에러는 권한이 없는 것이므로 조용히 처리
      if (error.response?.status === 403) {
        // eslint-disable-next-line no-console
        console.error("CRUD 권한 로드 권한 없음 - 기본 권한 사용");
      } else {
        // eslint-disable-next-line no-console
        console.error("CRUD 권한 로드 실패:", error);
      }
      commit("SET_CRUD_PERMISSIONS", []);
    }
  },
};

const isPremiumDatingMenu = (userRole, menuPath) =>
  userRole === "PREMIUM" && PREMIUM_MENU_PATHS.includes(menuPath);

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
  crudPermissions: (state) => state.crudPermissions,
  canCreate: (state) => (menuPath) => {
    if (state.user?.role === "ADMIN") return true;
    if (isPremiumDatingMenu(state.user?.role, menuPath)) return true;
    const permission = state.crudPermissions.find(
      (p) => p.menuPath === menuPath
    );
    return permission?.canCreate || false;
  },
  canRead: (state) => (menuPath) => {
    if (state.user?.role === "ADMIN") return true;
    if (isPremiumDatingMenu(state.user?.role, menuPath)) return true;
    const permission = state.crudPermissions.find(
      (p) => p.menuPath === menuPath
    );
    return permission?.canRead || false;
  },
  canUpdate: (state) => (menuPath) => {
    if (state.user?.role === "ADMIN") return true;
    if (isPremiumDatingMenu(state.user?.role, menuPath)) return true;
    const permission = state.crudPermissions.find(
      (p) => p.menuPath === menuPath
    );
    return permission?.canUpdate || false;
  },
  canDelete: (state) => (menuPath) => {
    if (state.user?.role === "ADMIN") return true;
    if (isPremiumDatingMenu(state.user?.role, menuPath)) return true;
    const permission = state.crudPermissions.find(
      (p) => p.menuPath === menuPath
    );
    return permission?.canDelete || false;
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
};
