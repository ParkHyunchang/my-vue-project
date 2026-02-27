import { createRouter, createWebHashHistory } from 'vue-router';
import store from '../store';
import Home from '../pages/index.vue';
import Portfolio from '../pages/portfolio.vue';
import Todos from '../pages/todos/index.vue';
import Todo from '../pages/todos/_id.vue';
import TodoCreate from '../pages/todos/create/index.vue';
import Expense from '../pages/expense.vue';
import Projects from '../pages/projects.vue';
import History from '../pages/history.vue';
import Dating from '../pages/dating.vue';
import DatingSys from '../pages/dating_sys.vue';
import Auth from '../pages/auth.vue';
import Admin from '../pages/admin.vue';

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        {
            path: '/',
            name: 'Home',
            component: Home,
            meta: { requiresAuth: false }
        },
        {
            path: '/login',
            name: 'Login',
            component: Auth,
            meta: { requiresAuth: false, guestOnly: true }
        },
        {
            path: '/portfolio',
            name: 'Portfolio',
            component: Portfolio,
            meta: { requiresAuth: true }
        },
        {
            path: '/projects',
            name: 'Projects',
            component: Projects,
            meta: { requiresAuth: true, roles: ['USER', 'PREMIUM', 'ADMIN'] }
        },
        {
            path: '/history',
            name: 'History',
            component: History,
            meta: { requiresAuth: true, roles: ['PREMIUM', 'ADMIN'] }
        },
        {
            path: '/dating',
            name: 'Dating',
            component: Dating,
            meta: { requiresAuth: true, roles: ['PREMIUM', 'ADMIN'] }
        },
        {
            path: '/dating_sys',
            name: 'DatingSys',
            component: DatingSys,
            meta: { requiresAuth: true, roles: ['PREMIUM', 'ADMIN'] }
        },
        {
            path: '/todos',
            name: 'Todos',
            component: Todos,
            meta: { requiresAuth: true }
        },
        {
            path: '/todos/create',
            name: 'TodoCreate',
            component: TodoCreate,
            meta: { requiresAuth: true }
        },
        {
            path: '/todos/:id',
            name: 'Todo',
            component: Todo,
            meta: { requiresAuth: true }
        },
        {
            path: '/expense',
            name: 'Expense',
            component: Expense,
            meta: { requiresAuth: true, roles: ['ADMIN'] }
        },
        {
            path: '/admin',
            component: () => import('../components/AdminLayout.vue'),
            meta: { requiresAuth: true, roles: ['ADMIN'] },
            children: [
                {
                    path: '',
                    name: 'AdminMain',
                    component: () => import('../pages/admin-main.vue'),
                },
                {
                    path: 'users',
                    name: 'AdminUsers',
                    component: Admin,
                },
                {
                    path: 'menu-management',
                    name: 'AdminMenuManagement',
                    component: () => import('../pages/admin-menu-management.vue'),
                },
                {
                    path: 'role-management',
                    name: 'AdminRoleManagement',
                    component: () => import('../pages/admin-role-management.vue'),
                }
            ]
        }
    ]
});

// 라우트 가드
router.beforeEach(async (to, from, next) => {
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
    const guestOnly = to.matched.some(record => record.meta.guestOnly);
    const requiredRoles = to.meta.roles;
    
    // 토큰이 있지만 사용자 정보가 없는 경우 인증 확인
    if (store.getters['auth/token'] && !store.getters['auth/user']) {
        try {
            const authResult = await store.dispatch('auth/checkAuth');
            // 인증 실패 시 토큰이 제거되므로 다시 확인
            if (!authResult && store.getters['auth/token']) {
                // 토큰이 있지만 인증 실패한 경우 로그아웃 처리
                store.dispatch('auth/logout');
            }
        } catch (error) {
            // 네트워크 에러 등으로 인한 일시적 실패는 무시
        }
    }
    
    // 인증된 사용자의 메뉴 권한이 비어있으면 새로고침
    if (store.getters['auth/isAuthenticated'] && 
        store.getters['auth/user'] && 
        (!store.getters['menu/accessibleMenus'] || store.getters['menu/accessibleMenus'].length === 0)) {
        try {
            await store.dispatch('menu/loadUserMenus');
        } catch (error) {
            console.error('메뉴 권한 로드 실패:', error);
        }
    }
    
    const isAuthenticated = store.getters['auth/isAuthenticated'];
    
    if (requiresAuth && !isAuthenticated) {
        next('/login');
        return;
    }
    
    if (guestOnly && isAuthenticated) {
        next('/');
        return;
    }
    
    if (requiredRoles && isAuthenticated) {
        const userRole = store.getters['auth/user']?.role;
        const hasRequiredRole = requiredRoles.includes(userRole);
        
        if (!hasRequiredRole) {
            store.dispatch('toast/showToast', {
                message: '접근 권한이 없습니다.',
                type: 'error'
            });
            next('/');
            return;
        }
    }
    
    // 메뉴 권한 확인 (기존 role 기반 권한과 별개로 메뉴 권한도 확인)
    if (isAuthenticated) {
        const canAccessMenu = store.getters['menu/canAccessMenu'](to.path);
        if (!canAccessMenu) {
            store.dispatch('toast/showToast', {
                message: '해당 메뉴에 접근할 권한이 없습니다.',
                type: 'error'
            });
            next('/');
            return;
        }
    }
    
    next();
});

export default router;