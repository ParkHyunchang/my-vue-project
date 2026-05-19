import { createRouter, createWebHashHistory } from 'vue-router';
import store from '../store';
import Home from '../pages/index.vue';
import Portfolio from '../pages/portfolio.vue';
import Projects from '../pages/projects.vue';
import Auth from '../pages/auth.vue';
import { ROUTE_COMPONENTS } from '../config/routes';
import { categoryFromPath, logAudit } from '../utils/audit';

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
            meta: { requiresAuth: true, menuPath: '/todos' }
        },
        {
            path: '/mypage',
            name: 'MyPage',
            component: () => import('../pages/mypage.vue'),
            meta: { requiresAuth: true, skipMenuCheck: true }
        },
        {
            path: '/change-password',
            name: 'ChangePassword',
            component: () => import('../pages/change-password.vue'),
            meta: { requiresAuth: true, skipMenuCheck: true }
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
                },
                {
                    path: 'chat-history',
                    name: 'AdminChatHistory',
                    component: () => import('../pages/admin-chat-history.vue'),
                },
                {
                    path: 'career',
                    name: 'AdminCareer',
                    component: () => import('../pages/admin-career.vue'),
                },
                {
                    path: 'experience',
                    name: 'AdminExperience',
                    component: () => import('../pages/admin-experience.vue'),
                },
                {
                    path: 'portfolio-skill',
                    name: 'AdminPortfolioSkill',
                    component: () => import('../pages/admin-portfolio-skill.vue'),
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

    // 인증 상태 미초기화(예: 깊은 링크 진입) 시 한 번만 복원 시도.
    // httpOnly 쿠키 기반이라 토큰 존재 여부는 서버 응답으로만 알 수 있다.
    if (!store.getters['auth/isAuthenticated'] && !store.getters['auth/user']) {
        try {
            await store.dispatch('auth/checkAuth');
        } catch (_) { /* 네트워크 에러는 무시 */ }
    }

    const isAuthenticated = store.getters['auth/isAuthenticated'];

    if (requiresAuth && !isAuthenticated) {
        // GUEST 권한으로 접근 가능한 메뉴인지 확인
        const canGuestAccess = store.getters['menu/canAccessMenu'](to.path);
        if (!canGuestAccess) {
            next('/login');
            return;
        }
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

    // DB 기반 메뉴 접근 권한 확인 (시스템 경로는 제외)
    // 동적 라우트(/todos/:id 등)는 meta.menuPath 로 부모 메뉴 경로를 지정해 그쪽 권한을 체크.
    const skipMenuCheck = to.matched.some(record => record.meta.skipMenuCheck);
    if (isAuthenticated && !isAdminRoute && requiresAuth && !skipMenuCheck) {
        const menuPath = to.matched.reduce((acc, r) => r.meta.menuPath || acc, null) || to.path;
        const canAccessMenu = store.getters['menu/canAccessMenu'](menuPath);
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

// 라우트 변경 시 감사 로그 한 줄 — 로그인 사용자의 메뉴 이동을 [CATEGORY] VIEW 로 기록.
// 동일 path 재진입(쿼리만 바뀜)도 별도 액션으로 간주해 기록한다.
router.afterEach((to, from) => {
    if (to.path === from.path) return; // 같은 path 내에서 쿼리만 변경되는 경우는 제외
    if (!store.getters['auth/isAuthenticated']) return; // 비로그인은 제외
    const category = categoryFromPath(to.path);
    if (!category) return;
    logAudit(category, 'VIEW');
});

export default router;
