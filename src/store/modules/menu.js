const state = {
    userMenus: [],
    allMenus: [
        {
            path: '/',
            name: '홈',
            icon: '🏠',
            description: '메인 홈페이지',
            category: 'main',
            isRequired: true,
            showInNav: true,
            navLabel: 'HOME'
        },
        {
            path: '/portfolio',
            name: '포트폴리오',
            icon: '💼',
            description: '개인 포트폴리오 페이지',
            category: 'main',
            isRequired: false,
            showInNav: true,
            navLabel: 'PORTFOLIO'
        },
        {
            path: '/projects',
            name: '프로젝트',
            icon: '🚀',
            description: '프로젝트 관리 및 조회',
            category: 'work',
            isRequired: false,
            showInNav: true,
            navLabel: 'PROJECTS'
        },
        {
            path: '/history',
            name: '히스토리',
            icon: '📚',
            description: '작업 이력 및 기록',
            category: 'work',
            isRequired: false,
            showInNav: true,
            navLabel: 'HISTORY'
        },
        {
            path: '/dating',
            name: '데이팅',
            icon: '💕',
            description: '데이팅 관련 기능',
            category: 'personal',
            isRequired: false,
            showInNav: true,
            navLabel: 'DATING'
        },
        {
            path: '/todos',
            name: '할일 목록',
            icon: '📝',
            description: '할일 관리',
            category: 'productivity',
            isRequired: false,
            showInNav: true,
            navLabel: 'TODOS'
        },
        {
            path: '/todos/create',
            name: '할일 생성',
            icon: '➕',
            description: '새로운 할일 추가',
            category: 'productivity',
            isRequired: false,
            showInNav: false,
            navLabel: '할일 생성'
        },
        {
            path: '/expense',
            name: '지출 관리',
            icon: '💰',
            description: '지출 내역 관리',
            category: 'finance',
            isRequired: false,
            showInNav: true,
            navLabel: '가계부'
        },
        {
            path: '/admin',
            name: '관리자 대시보드',
            icon: '🎛️',
            description: '관리자 메인 대시보드',
            category: 'admin',
            isRequired: false,
            showInNav: false,
            navLabel: '관리자 대시보드'
        },
        {
            path: '/admin/users',
            name: '사용자 관리',
            icon: '👥',
            description: '사용자 계정 관리',
            category: 'admin',
            isRequired: false,
            showInNav: false,
            navLabel: '사용자 관리',
            isAdminSubMenu: true
        },
        {
            path: '/admin/menu-management',
            name: '메뉴 권한 관리',
            icon: '🔐',
            description: '메뉴 접근 권한 설정',
            category: 'admin',
            isRequired: false,
            showInNav: false,
            navLabel: '메뉴 권한 관리',
            isAdminSubMenu: true
        }
    ]
};

const mutations = {
    SET_USER_MENUS(state, menus) {
        state.userMenus = menus;
    }
};

const actions = {
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
            
            // 기본 권한 설정
            const user = rootGetters['auth/user'];
            if (user) {
                const defaultMenus = getDefaultMenusForRole(user.role);
                commit('SET_USER_MENUS', defaultMenus);
            }
        }
    },
    
    // 메뉴 권한 강제 새로고침
    async refreshUserMenus({ dispatch }) {
        await dispatch('loadUserMenus');
    }
};

const getters = {
    // 사용자가 접근 가능한 메뉴들
    accessibleMenus: (state) => {
        return state.allMenus.filter(menu => 
            state.userMenus.includes(menu.path) || menu.isRequired
        );
    },
    
    // 네비게이션에 표시할 메뉴들
    navigationMenus: (state, getters) => {
        return getters.accessibleMenus.filter(menu => menu.showInNav);
    },
    
    // 관리자 드롭다운 메뉴들
    adminSubMenus: (state, getters) => {
        return getters.accessibleMenus.filter(menu => menu.isAdminSubMenu);
    },
    
    // 특정 메뉴에 접근 가능한지 확인
    canAccessMenu: (state) => (menuPath) => {
        const menu = state.allMenus.find(m => m.path === menuPath);
        if (!menu) return false;
        if (menu.isRequired) return true;
        return state.userMenus.includes(menuPath);
    },
    
    // 관리자 메뉴에 접근 가능한지 확인
    hasAdminAccess: (state, getters) => {
        return getters.adminSubMenus.length > 0;
    }
};

// 기본 권한 설정 함수
function getDefaultMenusForRole(role) {
    const defaultPermissions = {
        'USER': [
            '/', '/portfolio', '/projects', '/todos', '/todos/create'
        ],
        'PREMIUM': [
            '/', '/portfolio', '/projects', '/history', '/dating', '/todos', '/todos/create'
        ],
        'ADMIN': [
            '/', '/portfolio', '/projects', '/history', '/dating', '/todos', '/todos/create',
            '/expense', '/admin', '/admin/users', '/admin/menu-management'
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
