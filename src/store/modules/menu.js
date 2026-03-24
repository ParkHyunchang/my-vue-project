/* eslint-disable no-console */
import { getDefaultMenuDefinitions, getDefaultMenusForRole } from '../../config/routes';

const state = {
    userMenus: [],
    allMenus: []  // DB에서 로드 (초기 빈 배열, loadMenuDefinitions 액션으로 채워짐)
};

const mutations = {
    SET_USER_MENUS(state, menus) {
        state.userMenus = menus;
    },
    SET_ALL_MENUS(state, menus) {
        state.allMenus = menus;
    }
};

const actions = {
    // 메뉴 정의를 DB에서 로드 (로그인 후 한 번만 호출)
    async loadMenuDefinitions({ commit, rootGetters }) {
        try {
            const user = rootGetters['auth/user'];
            if (!user) return;

            const axios = (await import('../../axios')).default;
            const response = await axios.get('/api/auth/menus');
            // DB 응답을 store 형식으로 변환
            const menus = response.data.map(m => ({
                path: m.path,
                name: m.name,
                icon: m.icon,
                description: m.description,
                category: m.category,
                isRequired: m.required,
                showInNav: m.showInNav,
                navLabel: m.navLabel,
                isAdminSubMenu: m.adminSubMenu,
                defaultRoles: m.defaultRoles || [],
                parentPath: m.parentPath || null
            }));
            commit('SET_ALL_MENUS', menus);
        } catch (error) {
            console.error('메뉴 정의를 불러오는데 실패했습니다. 기본값을 사용합니다.');
            commit('SET_ALL_MENUS', getDefaultMenuDefinitions());
        }
    },

    async loadUserMenus({ commit, rootGetters }) {
        try {
            const user = rootGetters['auth/user'];
            if (!user) {
                commit('SET_USER_MENUS', []);
                return;
            }

            const axios = (await import('../../axios')).default;
            const response = await axios.get('/api/auth/my-menu-permissions');
            commit('SET_USER_MENUS', response.data);
        } catch (error) {
            console.error('사용자 메뉴 권한을 불러오는데 실패했습니다. 기본 권한을 사용합니다.');
            
            const user = rootGetters['auth/user'];
            if (user) {
                const defaultMenus = getDefaultMenusForRole(user.role);
                commit('SET_USER_MENUS', defaultMenus);
            }
        }
    },
    
    async refreshUserMenus({ dispatch }) {
        await dispatch('loadUserMenus');
    }
};

const getters = {
    // 전체 메뉴 정의 (동적 라우트 동기화에 사용)
    allMenus: (state) => state.allMenus,

    accessibleMenus: (state) => {
        return state.allMenus.filter(menu => 
            state.userMenus.includes(menu.path) || menu.isRequired
        );
    },
    
    navigationMenus: (state, getters) => {
        const accessible = getters.accessibleMenus;
        // 최상위 네비 메뉴: showInNav=true이고 parentPath 없음
        const topLevel = accessible.filter(m => m.showInNav && !m.parentPath);
        // 각 최상위 메뉴에 접근 가능한 자식 메뉴 첨부 (showInNav 여부 무관)
        return topLevel.map(menu => ({
            ...menu,
            children: accessible.filter(c => c.parentPath === menu.path)
        }));
    },
    
    adminSubMenus: (state, getters) => {
        return getters.accessibleMenus.filter(menu => menu.isAdminSubMenu);
    },
    
    canAccessMenu: (state) => (menuPath) => {
        const menu = state.allMenus.find(m => m.path === menuPath);
        if (!menu) return false;
        if (menu.isRequired) return true;
        return state.userMenus.includes(menuPath);
    },
    
    hasAdminAccess: (state, getters) => {
        return getters.adminSubMenus.length > 0;
    }
};

export default {
    namespaced: true,
    state,
    mutations,
    actions,
    getters
};
