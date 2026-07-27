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
    '/todos':        { component: () => import('../pages/todos/index.vue'),         requiresAuth: true },
    '/todos/create': { component: () => import('../pages/todos/create/index.vue'), requiresAuth: true },
    '/subscription': { component: () => import('../pages/subscription.vue'),        requiresAuth: true },
    '/stock':        { component: () => import('../pages/stock.vue'),               requiresAuth: true },
    '/realestate':   { component: () => import('../pages/realestate.vue'),          requiresAuth: true },
    '/travel':       { component: () => import('../pages/travel.vue'),              requiresAuth: true },
    '/saju':         { component: () => import('../pages/saju.vue'),                requiresAuth: true },
    '/chat':         { component: () => import('../pages/chat.vue'),                requiresAuth: false },
    '/diary':        { component: () => import('../pages/diary.vue'),               requiresAuth: true },
};

// ── 2. PREMIUM 역할 특별 접근 경로 ────────────────────────────
// 이 경로들은 PREMIUM 역할도 CRUD 권한을 가집니다 (ADMIN과 동일).
export const PREMIUM_MENU_PATHS = ['/dating', '/history'];

// ── 3. 기본 메뉴 정의 (API 실패 시 폴백) ─────────────────────
// DB 메뉴 API가 실패해도 라우트/권한 폴백과 같은 경로 세트를 유지합니다.
export function getDefaultMenuDefinitions() {
    return [
        { path: '/',                      name: '홈',               icon: '🏠', description: '메인 홈페이지',        category: 'main',        isRequired: true,  showInNav: true,  navLabel: 'HOME',             isAdminSubMenu: false, parentPath: null },
        { path: '/history',               name: '히스토리',          icon: '📚', description: '작업 이력 및 기록',    category: 'work',        isRequired: false, showInNav: true,  navLabel: 'HISTORY',          isAdminSubMenu: false, parentPath: null },
        { path: '/dating',                name: '데이팅',            icon: '💕', description: '데이팅 관련 기능',     category: 'personal',    isRequired: false, showInNav: true,  navLabel: 'DATING',           isAdminSubMenu: false, parentPath: null },
        { path: '/portfolio',             name: '포트폴리오',        icon: '💼', description: '개인 포트폴리오 페이지', category: 'main',        isRequired: true,  showInNav: false, navLabel: '포트폴리오',        isAdminSubMenu: false, parentPath: null },
        { path: '/projects',              name: '프로젝트',          icon: '🚀', description: '프로젝트 관리 및 조회', category: 'work',        isRequired: false, showInNav: false, navLabel: '프로젝트',          isAdminSubMenu: false, parentPath: null },
        { path: '/todos',                 name: '할일 목록',          icon: '📝', description: '할일 관리',            category: 'productivity',isRequired: false, showInNav: true,  navLabel: 'TODOS',            isAdminSubMenu: false, parentPath: null },
        { path: '/todos/create',          name: '할일 생성',          icon: '➕', description: '새로운 할일 추가',     category: 'productivity',isRequired: false, showInNav: false, navLabel: '할일 생성',         isAdminSubMenu: false, parentPath: null },
        { path: '/stock',                 name: '주식 대시보드',      icon: '📈', description: '실시간 주식 시장 데이터 및 포트폴리오', category: 'finance', isRequired: false, showInNav: true,  navLabel: '주식 대시보드',    isAdminSubMenu: false, parentPath: null },
        { path: '/subscription',          name: '구독 관리',          icon: '💳', description: '정기 결제 서비스 관리', category: 'finance',     isRequired: false, showInNav: true,  navLabel: '구독',              isAdminSubMenu: false, parentPath: null },
        { path: '/realestate',            name: '부동산',            icon: '🏢', description: '아파트 실거래가·시세·뉴스', category: 'finance',   isRequired: false, showInNav: true,  navLabel: '부동산',            isAdminSubMenu: false, parentPath: null },
        { path: '/travel',                name: '여행',              icon: '✈️', description: 'AI 여행 플래너·다녀온 곳·버킷리스트', category: 'personal', isRequired: false, showInNav: true,  navLabel: '여행',              isAdminSubMenu: false, parentPath: null },
        { path: '/saju',                  name: '사주',              icon: '🔮', description: '생년월일시 기반 사주팔자 계산·AI 해석', category: 'personal', isRequired: false, showInNav: true,  navLabel: '사주',              isAdminSubMenu: false, parentPath: null },
        { path: '/admin',                 name: '관리자 대시보드',    icon: '🎛️', description: '관리자 메인 대시보드', category: 'admin',       isRequired: false, showInNav: false, navLabel: '관리자 대시보드',   isAdminSubMenu: false, parentPath: null },
        { path: '/admin/users',           name: '사용자 관리',        icon: '👥', description: '사용자 계정 관리',    category: 'admin',       isRequired: false, showInNav: false, navLabel: '사용자 관리',       isAdminSubMenu: true,  parentPath: null },
        { path: '/admin/menu-management', name: '권한별 접근메뉴관리', icon: '🔐', description: '메뉴 접근 권한 설정', category: 'admin',       isRequired: false, showInNav: false, navLabel: '권한별 접근메뉴관리', isAdminSubMenu: true,  parentPath: null },
        { path: '/admin/role-management', name: '권한 관리',          icon: '🛡️', description: '사용자 권한(Role) 관리', category: 'admin',  isRequired: false, showInNav: false, navLabel: '권한 관리',         isAdminSubMenu: true,  parentPath: null },
        { path: '/admin/menu-definition', name: '메뉴 정의 관리',     icon: '📋', description: '메뉴 정의 및 노출 설정', category: 'admin',       isRequired: false, showInNav: false, navLabel: '메뉴 정의 관리',     isAdminSubMenu: true,  parentPath: null },
        { path: '/admin/prompt-management', name: '프롬프트 관리',    icon: '💡', description: 'AI 프롬프트 관리',    category: 'admin',       isRequired: false, showInNav: false, navLabel: '프롬프트 관리',     isAdminSubMenu: true,  parentPath: null },
        { path: '/admin/chat-history',    name: '채팅 히스토리',      icon: '💬', description: 'AI 채팅 기록 조회',   category: 'admin',       isRequired: false, showInNav: false, navLabel: '채팅 히스토리',     isAdminSubMenu: true,  parentPath: null },
        { path: '/admin/career',          name: '경력 관리',          icon: '💼', description: '메인 경력 섹션 관리', category: 'admin',       isRequired: false, showInNav: false, navLabel: '경력 관리',         isAdminSubMenu: true,  parentPath: null },
        { path: '/admin/experience',      name: '교육·경험 관리',    icon: '🎓', description: '메인 경험 섹션 관리', category: 'admin',       isRequired: false, showInNav: false, navLabel: '교육·경험 관리',   isAdminSubMenu: true,  parentPath: null },
        { path: '/admin/portfolio-skill', name: '포트폴리오 스킬',    icon: '🛠️', description: '포트폴리오 스킬 관리', category: 'admin',      isRequired: false, showInNav: false, navLabel: '포트폴리오 스킬',   isAdminSubMenu: true,  parentPath: null },
        { path: '/chat',                  name: 'AI 채팅',            icon: '💬', description: 'Claude AI 채팅',         category: 'main',        isRequired: false, showInNav: true,  navLabel: 'CHAT',             isAdminSubMenu: false, parentPath: null },
        { path: '/diary',                 name: 'AI 일기',            icon: '📔', description: 'AI 감정 분석 일기',      category: 'personal',    isRequired: false, showInNav: true,  navLabel: 'DIARY',            isAdminSubMenu: false, parentPath: null },
    ];
}

// ── 4. 역할별 기본 접근 메뉴 (API 실패 시 폴백) ────────────────
export function getDefaultMenusForRole(role) {
    const defaultPermissions = {
        'GUEST':   ['/', '/chat'],
        'USER':    ['/', '/portfolio', '/projects', '/todos', '/todos/create', '/chat', '/diary'],
        'PREMIUM': ['/', '/history', '/dating', '/portfolio', '/projects', '/todos', '/todos/create', '/chat', '/diary'],
        'ADMIN':   [
            '/', '/history', '/dating', '/portfolio', '/projects',
            '/todos', '/todos/create', '/stock', '/subscription', '/realestate', '/travel', '/saju', '/chat', '/diary',
            '/admin', '/admin/users', '/admin/menu-management',
            '/admin/role-management', '/admin/menu-definition',
            '/admin/prompt-management', '/admin/chat-history',
            '/admin/career', '/admin/experience', '/admin/portfolio-skill',
        ],
    };
    return defaultPermissions[role] || [];
}
