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
            name: 'AdminMain',
            component: () => import('../pages/admin-main.vue'),
            meta: { requiresAuth: true, roles: ['ADMIN'] }
        },
        {
            path: '/admin/users',
            name: 'AdminUsers',
            component: Admin,
            meta: { requiresAuth: true, roles: ['ADMIN'] }
        }
    ]
});

// 라우트 가드
router.beforeEach(async (to, from, next) => {
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
    const guestOnly = to.matched.some(record => record.meta.guestOnly);
    const requiredRoles = to.meta.roles;
    
    if (store.getters['auth/token'] && !store.getters['auth/user']) {
        try {
            await store.dispatch('auth/checkAuth');
        } catch (error) {
            // 네트워크 에러 등으로 인한 일시적 실패는 무시
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
    
    next();
});

export default router;