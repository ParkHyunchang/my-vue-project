const state = {
    user: null,
    token: localStorage.getItem('token') || null,
    isAuthenticated: !!localStorage.getItem('token'),
    crudPermissions: []
};

const mutations = {
    SET_TOKEN(state, token) {
        state.token = token;
        state.isAuthenticated = !!token;
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
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
        localStorage.removeItem('token');
    },
    SET_CRUD_PERMISSIONS(state, permissions) {
        state.crudPermissions = permissions;
    }
};

const actions = {
    async login({ commit, dispatch }, credentials) {
        try {
            const axios = (await import('../../axios')).default;
            const response = await axios.post('/api/auth/login', credentials);
            const { token, username, email, role, message } = response.data;
            
            commit('SET_TOKEN', token);
            commit('SET_USER', { username, email, role });
            
            // 메뉴 권한 로드
            try {
                await dispatch('menu/loadUserMenus', null, { root: true });
            } catch (error) {
                console.error('메뉴 권한 로드 실패:', error);
            }
            
            // CRUD 권한 로드
            try {
                await dispatch('loadCrudPermissions');
            } catch (error) {
                console.error('CRUD 권한 로드 실패:', error);
            }
            
            return { success: true, message };
        } catch (error) {
            const message = error.response?.data?.message || '로그인에 실패했습니다.';
            return { success: false, message };
        }
    },
    
    async register({ commit, dispatch }, userData) {
        try {
            const axios = (await import('../../axios')).default;
            const response = await axios.post('/api/auth/register', userData);
            const { token, username, email, role, message } = response.data;
            
            commit('SET_TOKEN', token);
            commit('SET_USER', { username, email, role });
            
            // 메뉴 권한 로드
            try {
                await dispatch('menu/loadUserMenus', null, { root: true });
            } catch (error) {
                console.error('메뉴 권한 로드 실패:', error);
            }
            
            // CRUD 권한 로드
            try {
                await dispatch('loadCrudPermissions');
            } catch (error) {
                console.error('CRUD 권한 로드 실패:', error);
            }
            
            return { success: true, message };
        } catch (error) {
            const message = error.response?.data?.message || '회원가입에 실패했습니다.';
            return { success: false, message };
        }
    },
    
    async logout({ commit }) {
        commit('LOGOUT');
    },
    
    async checkAuth({ commit, dispatch, state }) {
        if (!state.token) {
            return false;
        }
        
        try {
            const axios = (await import('../../axios')).default;
            const response = await axios.get('/api/auth/me', {
                headers: {
                    Authorization: `Bearer ${state.token}`
                }
            });
            
            const { username, email, role } = response.data;
            commit('SET_USER', { username, email, role });
            
            // 메뉴 권한 로드
            try {
                await dispatch('menu/loadUserMenus', null, { root: true });
            } catch (error) {
                console.error('메뉴 권한 로드 실패:', error);
            }
            
            // CRUD 권한 로드
            try {
                await dispatch('loadCrudPermissions');
            } catch (error) {
                console.error('CRUD 권한 로드 실패:', error);
            }
            
            return true;
        } catch (error) {
            if (error.response?.status === 401 || error.response?.status === 403) {
                commit('LOGOUT');
            }
            return false;
        }
    },
    
    async loadCrudPermissions({ commit, state }) {
        if (!state.token || !state.user) {
            return;
        }
        
        try {
            const axios = (await import('../../axios')).default;
            const response = await axios.get('/api/admin/user-crud-permissions', {
                headers: {
                    Authorization: `Bearer ${state.token}`
                }
            });
            
            commit('SET_CRUD_PERMISSIONS', response.data);
        } catch (error) {
            // 403 에러는 권한이 없는 것이므로 조용히 처리
            if (error.response?.status === 403) {
                console.error('CRUD 권한 로드 권한 없음 - 기본 권한 사용');
            } else {
                console.error('CRUD 권한 로드 실패:', error);
            }
            commit('SET_CRUD_PERMISSIONS', []);
        }
    }
};

const getters = {
    isAuthenticated: state => state.isAuthenticated,
    user: state => state.user,
    token: state => state.token,
    isAdmin: state => state.user?.role === 'ADMIN',
    isPremium: state => state.user?.role === 'PREMIUM' || state.user?.role === 'ADMIN',
    hasRole: (state) => (role) => {
        if (!state.user) return false;
        if (role === 'ADMIN') return state.user.role === 'ADMIN';
        if (role === 'PREMIUM') return state.user.role === 'PREMIUM' || state.user.role === 'ADMIN';
        return state.user.role === role;
    },
    crudPermissions: state => state.crudPermissions,
    canCreate: (state) => (menuPath) => {
        if (state.user?.role === 'ADMIN') return true;
        const permission = state.crudPermissions.find(p => p.menuPath === menuPath);
        return permission?.canCreate || false;
    },
    canRead: (state) => (menuPath) => {
        if (state.user?.role === 'ADMIN') return true;
        const permission = state.crudPermissions.find(p => p.menuPath === menuPath);
        return permission?.canRead || false;
    },
    canUpdate: (state) => (menuPath) => {
        if (state.user?.role === 'ADMIN') return true;
        const permission = state.crudPermissions.find(p => p.menuPath === menuPath);
        return permission?.canUpdate || false;
    },
    canDelete: (state) => (menuPath) => {
        if (state.user?.role === 'ADMIN') return true;
        const permission = state.crudPermissions.find(p => p.menuPath === menuPath);
        return permission?.canDelete || false;
    }
};

export default {
    namespaced: true,
    state,
    mutations,
    actions,
    getters
};
