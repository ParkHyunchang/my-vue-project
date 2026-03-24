// ============================================================
// routes.js - 라우트 / 메뉴 / 권한의 단일 진실 공급원 (Single Source of Truth)
//
// 새 메뉴를 추가할 때 이 파일만 수정하면 됩니다:
//   1. ROUTE_COMPONENTS  - 경로 → 컴포넌트 매핑
//   2. DEFAULT_MENU_DEFINITIONS - 메뉴 메타데이터 (이름, 아이콘, 카테고리 등)
//   3. DEFAULT_MENUS_FOR_ROLE   - 역할별 기본 접근 가능 메뉴
//   4. PREMIUM_MENU_PATHS       - PREMIUM 역할이 특별 접근권을 갖는 경로
// ============================================================

// ── 1. 경로 → 컴포넌트 매핑 ──────────────────────────────────
// DB에 새 메뉴를 추가할 때 여기에 경로와 컴포넌트를 함께 등록하면
// 라우터에 자동으로 등록됩니다.
export const ROUTE_COMPONENTS = {
    '/history':      { component: () => import('../pages/history.vue'),             requiresAuth: true },
    '/dating':       { component: () => import('../pages/dating.vue'),              requiresAuth: true },
    '/dating_sys':   { component: () => import('../pages/dating_sys.vue'),          requiresAuth: true },
    '/todos':        { component: () => import('../pages/todos/index.vue'),         requiresAuth: true },
    '/todos/create': { component: () => import('../pages/todos/create/index.vue'), requiresAuth: true },
    '/expense':      { component: () => import('../pages/expense.vue'),             requiresAuth: true },
    '/stock':        { component: () => import('../pages/stock.vue'),               requiresAuth: true },
};

// ── 2. PREMIUM 역할 특별 접근 경로 ────────────────────────────
// 이 경로들은 PREMIUM 역할도 CRUD 권한을 가집니다 (ADMIN과 동일).
export const PREMIUM_MENU_PATHS = ['/dating', '/history'];

// ── 3. 기본 메뉴 정의 (API 실패 시 폴백) ─────────────────────
// portfolio / projects 는 DB에서 제거됐으므로 폴백에도 포함하지 않습니다.
export function getDefaultMenuDefinitions() {
    return [
        { path: '/',                      name: '홈',               icon: '🏠', description: '메인 홈페이지',        category: 'main',        isRequired: true,  showInNav: true,  navLabel: 'HOME',             isAdminSubMenu: false, parentPath: null },
        { path: '/history',               name: '히스토리',          icon: '📚', description: '작업 이력 및 기록',    category: 'work',        isRequired: false, showInNav: true,  navLabel: 'HISTORY',          isAdminSubMenu: false, parentPath: null },
        { path: '/dating',                name: '데이팅',            icon: '💕', description: '데이팅 관련 기능',     category: 'personal',    isRequired: false, showInNav: true,  navLabel: 'DATING',           isAdminSubMenu: false, parentPath: null },
        { path: '/dating_sys',            name: '데이팅 추억',       icon: '📸', description: '데이팅 추억 기록',     category: 'personal',    isRequired: false, showInNav: false, navLabel: 'DATING SYS',       isAdminSubMenu: false, parentPath: '/dating' },
        { path: '/todos',                 name: '할일 목록',          icon: '📝', description: '할일 관리',            category: 'productivity',isRequired: false, showInNav: true,  navLabel: 'TODOS',            isAdminSubMenu: false, parentPath: null },
        { path: '/todos/create',          name: '할일 생성',          icon: '➕', description: '새로운 할일 추가',     category: 'productivity',isRequired: false, showInNav: false, navLabel: '할일 생성',         isAdminSubMenu: false, parentPath: null },
        { path: '/expense',               name: '지출 관리',          icon: '💰', description: '지출 내역 관리',      category: 'finance',     isRequired: false, showInNav: true,  navLabel: '가계부',            isAdminSubMenu: false, parentPath: null },
        { path: '/admin',                 name: '관리자 대시보드',    icon: '🎛️', description: '관리자 메인 대시보드', category: 'admin',       isRequired: false, showInNav: false, navLabel: '관리자 대시보드',   isAdminSubMenu: false, parentPath: null },
        { path: '/admin/users',           name: '사용자 관리',        icon: '👥', description: '사용자 계정 관리',    category: 'admin',       isRequired: false, showInNav: false, navLabel: '사용자 관리',       isAdminSubMenu: true,  parentPath: null },
        { path: '/admin/menu-management', name: '권한별 접근메뉴관리', icon: '🔐', description: '메뉴 접근 권한 설정', category: 'admin',       isRequired: false, showInNav: false, navLabel: '권한별 접근메뉴관리', isAdminSubMenu: true,  parentPath: null },
        { path: '/admin/role-management', name: '권한 관리',          icon: '🛡️', description: '사용자 권한(Role) 관리', category: 'admin',  isRequired: false, showInNav: false, navLabel: '권한 관리',         isAdminSubMenu: true,  parentPath: null },
    ];
}

// ── 4. 역할별 기본 접근 메뉴 (API 실패 시 폴백) ────────────────
export function getDefaultMenusForRole(role) {
    const defaultPermissions = {
        'USER':    ['/', '/todos', '/todos/create'],
        'PREMIUM': ['/', '/history', '/dating', '/dating_sys', '/todos', '/todos/create'],
        'ADMIN':   [
            '/', '/history', '/dating', '/dating_sys',
            '/todos', '/todos/create', '/expense',
            '/admin', '/admin/users', '/admin/menu-management',
            '/admin/role-management', '/admin/menu-definition',
        ],
    };
    return defaultPermissions[role] || [];
}
