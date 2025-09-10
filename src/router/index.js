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
        }
    ]
});

// 라우트 가드
router.beforeEach(async (to, from, next) => {
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
    const guestOnly = to.matched.some(record => record.meta.guestOnly);
    const requiredRoles = to.meta.roles;
    
    // 인증 상태 확인
    const isAuthenticated = store.getters['auth/isAuthenticated'];
    
    // 토큰이 있지만 사용자 정보가 없는 경우 인증 확인
    if (store.getters['auth/token'] && !store.getters['auth/user']) {
        await store.dispatch('auth/checkAuth');
    }
    
    // 인증이 필요한 페이지인데 로그인하지 않은 경우
    if (requiresAuth && !isAuthenticated) {
        next('/login');
        return;
    }
    
    // 게스트만 접근 가능한 페이지인데 로그인한 경우
    if (guestOnly && isAuthenticated) {
        next('/');
        return;
    }
    
    // 권한 체크
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