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
                defaultRoles: m.defaultRoles || []
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
    accessibleMenus: (state) => {
        return state.allMenus.filter(menu => 
            state.userMenus.includes(menu.path) || menu.isRequired
        );
    },
    
    navigationMenus: (state, getters) => {
        return getters.accessibleMenus.filter(menu => menu.showInNav);
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

// API 실패 시 폴백용 기본 메뉴 정의
function getDefaultMenuDefinitions() {
    return [
        { path: '/', name: '홈', icon: '🏠', description: '메인 홈페이지', category: 'main', isRequired: true, showInNav: true, navLabel: 'HOME', isAdminSubMenu: false },
        { path: '/portfolio', name: '포트폴리오', icon: '💼', description: '개인 포트폴리오 페이지', category: 'main', isRequired: false, showInNav: true, navLabel: 'PORTFOLIO', isAdminSubMenu: false },
        { path: '/projects', name: '프로젝트', icon: '🚀', description: '프로젝트 관리 및 조회', category: 'work', isRequired: false, showInNav: true, navLabel: 'PROJECTS', isAdminSubMenu: false },
        { path: '/history', name: '히스토리', icon: '📚', description: '작업 이력 및 기록', category: 'work', isRequired: false, showInNav: true, navLabel: 'HISTORY', isAdminSubMenu: false },
        { path: '/dating', name: '데이팅', icon: '💕', description: '데이팅 관련 기능', category: 'personal', isRequired: false, showInNav: true, navLabel: 'DATING', isAdminSubMenu: false },
        { path: '/dating_sys', name: '데이팅 추억', icon: '📸', description: '데이팅 추억 기록', category: 'personal', isRequired: false, showInNav: true, navLabel: 'DATING SYS', isAdminSubMenu: false },
        { path: '/todos', name: '할일 목록', icon: '📝', description: '할일 관리', category: 'productivity', isRequired: false, showInNav: true, navLabel: 'TODOS', isAdminSubMenu: false },
        { path: '/todos/create', name: '할일 생성', icon: '➕', description: '새로운 할일 추가', category: 'productivity', isRequired: false, showInNav: false, navLabel: '할일 생성', isAdminSubMenu: false },
        { path: '/expense', name: '지출 관리', icon: '💰', description: '지출 내역 관리', category: 'finance', isRequired: false, showInNav: true, navLabel: '가계부', isAdminSubMenu: false },
        { path: '/admin', name: '관리자 대시보드', icon: '🎛️', description: '관리자 메인 대시보드', category: 'admin', isRequired: false, showInNav: false, navLabel: '관리자 대시보드', isAdminSubMenu: false },
        { path: '/admin/users', name: '사용자 관리', icon: '👥', description: '사용자 계정 관리', category: 'admin', isRequired: false, showInNav: false, navLabel: '사용자 관리', isAdminSubMenu: true },
        { path: '/admin/menu-management', name: '권한별 접근메뉴관리', icon: '🔐', description: '메뉴 접근 권한 설정', category: 'admin', isRequired: false, showInNav: false, navLabel: '권한별 접근메뉴관리', isAdminSubMenu: true },
        { path: '/admin/role-management', name: '권한 관리', icon: '🛡️', description: '사용자 권한(Role) 관리', category: 'admin', isRequired: false, showInNav: false, navLabel: '권한 관리', isAdminSubMenu: true }
    ];
}

// 기본 권한 설정 함수 (폴백용)
function getDefaultMenusForRole(role) {
    const defaultPermissions = {
        'USER': ['/', '/portfolio', '/projects', '/todos', '/todos/create'],
        'PREMIUM': ['/', '/portfolio', '/projects', '/history', '/dating', '/dating_sys', '/todos', '/todos/create'],
        'ADMIN': [
            '/', '/portfolio', '/projects', '/history', '/dating', '/dating_sys',
            '/todos', '/todos/create', '/expense',
            '/admin', '/admin/users', '/admin/menu-management', '/admin/role-management'
        ]
    };
    return defaultPermissions[role] || [];
}

export default {
    namespaced: true,
    state,
    mutations,
    actions,
    getters
};
