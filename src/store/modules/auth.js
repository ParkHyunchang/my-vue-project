const state = {
    user: null,
    token: localStorage.getItem('token') || null,
    isAuthenticated: !!localStorage.getItem('token')
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
        localStorage.removeItem('token');
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
            
            return true;
        } catch (error) {
            if (error.response?.status === 401 || error.response?.status === 403) {
                commit('LOGOUT');
            }
            return false;
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
    }
};

export default {
    namespaced: true,
    state,
    mutations,
    actions,
    getters
};
