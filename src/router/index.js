import { createRouter, createWebHashHistory } from 'vue-router';
import store from '../store';
import Home from '../pages/index.vue';
import Portfolio from '../pages/portfolio.vue';
import Projects from '../pages/projects.vue';
import Auth from '../pages/auth.vue';

// ──────────────────────────────────────────────────────────────────
// DB 메뉴 경로 → Vue 컴포넌트 레지스트리
// DB에 새 메뉴를 추가할 때 여기에 경로와 컴포넌트를 함께 등록하면
// 라우터에 자동으로 등록됩니다.
// ──────────────────────────────────────────────────────────────────
const ROUTE_COMPONENTS = {
    '/history':       { component: () => import('../pages/history.vue'),               requiresAuth: true  },
    '/dating':        { component: () => import('../pages/dating.vue'),                requiresAuth: true  },
    '/dating_sys':    { component: () => import('../pages/dating_sys.vue'),            requiresAuth: true  },
    '/todos':         { component: () => import('../pages/todos/index.vue'),           requiresAuth: true  },
    '/todos/create':  { component: () => import('../pages/todos/create/index.vue'),   requiresAuth: true  },
    '/expense':       { component: () => import('../pages/expense.vue'),              requiresAuth: true  },
    '/stock':         { component: () => import('../pages/stock.vue'),                requiresAuth: true  },
};

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        // ── 항상 존재하는 정적 라우트 ──
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
        // portfolio / projects: DB에서 제거됐지만 메인화면에서 직접 링크로 사용
        {
            path: '/portfolio',
            name: 'Portfolio',
            component: Portfolio,
            meta: { requiresAuth: false }
        },
        {
            path: '/projects',
            name: 'Projects',
            component: Projects,
            meta: { requiresAuth: false }
        },
        // 동적 파라미터 라우트 (DB 경로로 표현 불가)
        {
            path: '/todos/:id',
            name: 'Todo',
            component: () => import('../pages/todos/_id.vue'),
            meta: { requiresAuth: true }
        },
        // ── 어드민 (AdminLayout 중첩 라우트, DB 권한과 별도로 ADMIN 역할 고정) ──
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
                    component: () => import('../pages/admin.vue'),
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

// ──────────────────────────────────────────────────────────────────
// DB 메뉴 데이터를 기반으로 동적 라우트 등록
// - 로그인 / checkAuth 완료 후 호출
// - 이미 등록된 라우트는 건너뜀 (중복 방지)
// - ROUTE_COMPONENTS에 등록되지 않은 경로는 무시
// ──────────────────────────────────────────────────────────────────
export function syncDynamicRoutes(menuPaths) {
    menuPaths.forEach(path => {
        const entry = ROUTE_COMPONENTS[path];
        if (!entry) return;

        const routeName = 'dynamic:' + path;
        if (router.hasRoute(routeName)) return;

        router.addRoute({
            path,
            name: routeName,
            component: entry.component,
            meta: { requiresAuth: entry.requiresAuth ?? true }
        });
    });
}

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

    // DB 기반 메뉴 접근 권한 확인
    if (isAuthenticated && !isAdminRoute && requiresAuth) {
        const canAccessMenu = store.getters['menu/canAccessMenu'](to.path);
        if (!canAccessMenu) {
            store.dispatch('toast/showToast', { message: '해당 메뉴에 접근할 권한이 없습니다.', type: 'error' });
            next('/');
            return;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 새로고침 시 동적 라우트가 아직 등록되기 전에 진입하면
    // to.matched 가 비어 있어 화면이 비는 문제가 발생할 수 있음.
    // checkAuth 과정에서 syncDynamicRoutes 가 실행된 뒤 한 번 더
    // 현재 경로를 resolve 해서 매칭되는 라우트가 생겼다면 거기로 재진입.
    // ─────────────────────────────────────────────────────────────
    if (to.matched.length === 0) {
        const resolved = router.resolve(to.fullPath);
        if (resolved.matched.length > 0) {
            next({ ...resolved, replace: true });
            return;
        }
    }

    next();
});

export default router;
