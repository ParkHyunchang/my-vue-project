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
            meta: { requiresAuth: true }
        },
        {
            path: '/history',
            name: 'History',
            component: History,
            meta: { requiresAuth: true }
        },
        {
            path: '/dating',
            name: 'Dating',
            component: Dating,
            meta: { requiresAuth: true }
        },
        {
            path: '/dating_sys',
            name: 'DatingSys',
            component: DatingSys,
            meta: { requiresAuth: true }
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
            meta: { requiresAuth: true }
        },
        {
            path: '/admin',
            component: () => import('../components/AdminLayout.vue'),
            meta: { requiresAuth: true, roles: ['ADMIN'] },
            children: [
                {
                    path: '',
                    redirect: '/admin/users',
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
                },
                {
                    path: 'menu-definition',
                    name: 'AdminMenuDefinition',
                    component: () => import('../pages/admin-menu-definition.vue'),
                }
            ]
        }
    ]
});

// 라우트 가드
router.beforeEach(async (to, from, next) => {
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
    const guestOnly = to.matched.some(record => record.meta.guestOnly);

    // 토큰이 있지만 사용자 정보가 없는 경우 인증 + 메뉴 복원
    if (store.getters['auth/token'] && !store.getters['auth/user']) {
        try {
            const authResult = await store.dispatch('auth/checkAuth');
            if (!authResult && store.getters['auth/token']) {
                store.dispatch('auth/logout');
            }
        } catch (_) { /* 네트워크 에러는 무시 */ }
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

    // admin 라우트는 ADMIN 역할만 (고정 보안 정책)
    const isAdminRoute = to.matched.some(record => record.path.startsWith('/admin'));
    if (isAdminRoute && isAuthenticated) {
        const userRole = store.getters['auth/user']?.role;
        if (userRole !== 'ADMIN') {
            store.dispatch('toast/showToast', { message: '접근 권한이 없습니다.', type: 'error' });
            next('/');
            return;
        }
    }

    // DB 기반 메뉴 접근 권한 확인 (admin 이외 경로)
    if (isAuthenticated && !isAdminRoute) {
        const canAccessMenu = store.getters['menu/canAccessMenu'](to.path);
        if (!canAccessMenu) {
            store.dispatch('toast/showToast', { message: '해당 메뉴에 접근할 권한이 없습니다.', type: 'error' });
            next('/');
            return;
        }
    }

    next();
});

export default router;