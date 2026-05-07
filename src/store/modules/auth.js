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

const state = {
  user: null,
  token: localStorage.getItem("token") || null,
  isAuthenticated: !!localStorage.getItem("token"),
  crudPermissions: [],
};

const mutations = {
  SET_TOKEN(state, token) {
    state.token = token;
    state.isAuthenticated = !!token;
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  },
  SET_USER(state, user) {
    state.user = user;
  },
  LOGOUT(state) {
    state.user = null;
    state.token = null;
    state.isAuthenticated = false;
    state.crudPermissions = [];
    localStorage.removeItem("token");
  },
  SET_CRUD_PERMISSIONS(state, permissions) {
    state.crudPermissions = permissions;
  },
};

const actions = {
  async login({ commit, dispatch, rootGetters }, credentials) {
    try {
      const axios = (await import("@/axios")).default;
      const response = await axios.post("/api/auth/login", credentials);
      const { token, username, email, role, message } = response.data;

      commit("SET_TOKEN", token);
      commit("SET_USER", { username, email, role });

      // 메뉴 정의 및 권한 로드
      try {
        await dispatch("menu/loadMenuDefinitions", null, { root: true });
        await dispatch("menu/loadUserMenus", null, { root: true });
        await applyDynamicRoutes(rootGetters);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("메뉴 권한 로드 실패:", error);
      }

      // CRUD 권한 로드
      try {
        await dispatch("loadCrudPermissions");
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("CRUD 권한 로드 실패:", error);
      }

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
      const { token, username, email, role, message } = response.data;

      commit("SET_TOKEN", token);
      commit("SET_USER", { username, email, role });

      // 메뉴 정의 및 권한 로드
      try {
        await dispatch("menu/loadMenuDefinitions", null, { root: true });
        await dispatch("menu/loadUserMenus", null, { root: true });
        await applyDynamicRoutes(rootGetters);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("메뉴 권한 로드 실패:", error);
      }

      // CRUD 권한 로드
      try {
        await dispatch("loadCrudPermissions");
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("CRUD 권한 로드 실패:", error);
      }

      return { success: true, message };
    } catch (error) {
      const message =
        error.response?.data?.message || "회원가입에 실패했습니다.";
      return { success: false, message };
    }
  },

  async fetchProfile({ state }) {
    if (!state.token) return null;
    try {
      const axios = (await import("@/axios")).default;
      const response = await axios.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${state.token}` },
      });
      return response.data;
    } catch {
      return null;
    }
  },

  async updateProfile({ commit, state }, profileData) {
    try {
      const axios = (await import("@/axios")).default;
      const response = await axios.put("/api/auth/me", profileData, {
        headers: { Authorization: `Bearer ${state.token}` },
      });
      const { username, email, role } = response.data;
      commit("SET_USER", { username, email, role });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || "정보 수정에 실패했습니다.";
      return { success: false, message };
    }
  },

  async changePassword({ state }, { currentPassword, newPassword }) {
    try {
      const axios = (await import("@/axios")).default;
      await axios.put("/api/auth/change-password", { currentPassword, newPassword }, {
        headers: { Authorization: `Bearer ${state.token}` },
      });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || "비밀번호 변경에 실패했습니다.";
      return { success: false, message };
    }
  },

  async logout({ commit, dispatch, rootGetters }) {
    commit("LOGOUT");
    // 로그아웃 후 비로그인 메뉴 로드
    try {
      await dispatch("menu/loadMenuDefinitions", null, { root: true });
      await dispatch("menu/loadUserMenus", null, { root: true });
      await applyDynamicRoutes(rootGetters);
    } catch (e) {
      // 무시
    }
  },

  async checkAuth({ commit, dispatch, state, rootGetters }) {
    if (!state.token) {
      return false;
    }

    // 서버 요청 전에 토큰 만료 여부 로컬 체크
    try {
      const payload = JSON.parse(atob(state.token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        commit("LOGOUT");
        return false;
      }
    } catch {
      commit("LOGOUT");
      return false;
    }

    try {
      const axios = (await import("@/axios")).default;
      const response = await axios.get("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${state.token}`,
        },
      });

      const { username, email, role } = response.data;
      commit("SET_USER", { username, email, role });

      // 메뉴 정의 및 권한 로드
      try {
        await dispatch("menu/loadMenuDefinitions", null, { root: true });
        await dispatch("menu/loadUserMenus", null, { root: true });
        await applyDynamicRoutes(rootGetters);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("메뉴 권한 로드 실패:", error);
      }

      // CRUD 권한 로드
      try {
        await dispatch("loadCrudPermissions");
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("CRUD 권한 로드 실패:", error);
      }

      return true;
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        commit("LOGOUT");
      }
      return false;
    }
  },

  async loadCrudPermissions({ commit, state }) {
    if (!state.token || !state.user) {
      return;
    }

    try {
      const axios = (await import("@/axios")).default;
      const response = await axios.get("/api/admin/user-crud-permissions", {
        headers: {
          Authorization: `Bearer ${state.token}`,
        },
      });

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
  token: (state) => state.token,
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
