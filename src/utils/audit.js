// 사용자 행동 감사 로그 헬퍼.
// 백엔드 /api/audit/event 로 fire-and-forget 호출하여 [CATEGORY] user=X(R), ACTION 로그를 남긴다.
//
// 사용처:
//   1) router/index.js 의 afterEach 훅 — 라우트 변경 시 자동 호출 (메뉴 진입 추적)
//   2) 탭/서브뷰 활성화 — 라우트가 바뀌지 않는 within-page 액션 (예: 주식 4개 탭)

import { logger } from '@/utils/logger';

/**
 * 라우트 path → 감사 로그 category 매핑.
 * null 반환 시 로그 생략 (login, mypage 등 추적 불필요한 경로).
 */
export function categoryFromPath(path) {
  if (!path) return null;

  // 어드민 서브경로는 prefix 매치 (가장 길게 일치하는 항목부터)
  if (path.startsWith('/admin/users')) return 'ADMIN/USERS';
  if (path.startsWith('/admin/menu-management')) return 'ADMIN/MENU-PERMS';
  if (path.startsWith('/admin/role-management')) return 'ADMIN/ROLES';
  if (path.startsWith('/admin/menu-definition')) return 'ADMIN/MENUS';
  if (path.startsWith('/admin/chat-history')) return 'ADMIN/CHAT-HISTORY';
  if (path.startsWith('/admin/career')) return 'ADMIN/CAREER';
  if (path.startsWith('/admin/experience')) return 'ADMIN/EXPERIENCE';
  if (path.startsWith('/admin/portfolio-skill')) return 'ADMIN/PORTFOLIO-SKILL';
  if (path === '/admin' || path === '/admin/') return 'ADMIN';

  // 일반 메뉴 (정확 매치 우선)
  const map = {
    '/': 'HOME',
    '/stock': 'STOCK',
    '/portfolio': 'PORTFOLIO',
    '/projects': 'PROJECTS',
    '/todos': 'TODO',
    '/todos/create': 'TODO/CREATE',
    '/history': 'HISTORY',
    '/dating': 'DATING',
    '/diary': 'DIARY',
    '/subscription': 'SUBSCRIPTION',
    '/chat': 'CHAT',
    '/mypage': 'MYPAGE',
  };
  if (map[path]) return map[path];

  // /todos/123 같은 동적 라우트
  if (path.startsWith('/todos/')) return 'TODO/DETAIL';

  return null;
}

let axiosCache = null;
async function getAxios() {
  if (axiosCache) return axiosCache;
  axiosCache = (await import('@/axios')).default;
  return axiosCache;
}

/**
 * 감사 이벤트 전송 (fire-and-forget).
 * @param {string} category - [TAG] 부분. 예: 'STOCK/HOLDING', 'ADMIN/USERS'
 * @param {string} action   - 동사. 기본값 'VIEW'.
 * @param {string} [details] - 추가 정보 (선택). 예: 'market=kr'
 */
export async function logAudit(category, action = 'VIEW', details) {
  if (!category) return;
  try {
    const axios = await getAxios();
    await axios.post('/api/audit/event', { category, action, details });
  } catch (e) {
    // 감사 로그 실패는 사용자 흐름을 방해하지 않도록 조용히 무시 (콘솔에만)
    logger.debug('감사 로그 전송 실패:', e?.message);
  }
}
