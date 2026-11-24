/* eslint-disable no-console */
/* eslint-env browser */
// Local-only visual review of the real Vue app. No backend is contacted.
// Start `npm run serve:isolated`, then `node scripts/design-review.cjs`.
// Optional: --only=home,stock --label=before. Images require human inspection.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const origin = 'http://127.0.0.1:13100';
const label = (process.argv.find(arg => arg.startsWith('--label=')) || '--label=after').slice(8);
if (!/^[a-z0-9_-]+$/i.test(label)) throw new Error('Use a simple filename for --label.');
const only = (process.argv.find(arg => arg.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const output = path.join(root, 'docs', 'ai-team', 'evidence', 'TEAM-34', label);

// Read the existing static menu definition rather than maintain an unrelated menu.
const routeSource = fs.readFileSync(path.join(root, 'src/config/routes.js'), 'utf8');
const menuSource = routeSource.match(/export function getDefaultMenuDefinitions\(\)\s*\{\s*return\s*(\[[\s\S]*?\]);/);
if (!menuSource) throw new Error('Menu definition shape changed; update the review fixture.');
const menuDefinitions = vm.runInNewContext(menuSource[1], {}, { timeout: 1000 });
const menus = menuDefinitions.map(menu => ({ ...menu, required: menu.isRequired, adminSubMenu: menu.isAdminSubMenu, defaultRoles: ['USER', 'ADMIN'] }));
const permissions = menus.filter(menu => !menu.path.startsWith('/admin')).map(menu => menu.path);
const currentDate = '2026-11-24';
const careers = [
  { id: 1, company: '제품과 서비스를 만드는 개발', period: '2023 — 현재', badge: '현재', icon: '↗', roleDesc: '풀스택 개발 · 사용자 경험 개선', projects: JSON.stringify(['Vue 기반 웹 서비스 개발 및 운영', 'Spring Boot API 설계와 서비스 안정화']), tags: JSON.stringify(['Vue.js', 'Spring Boot', 'MySQL']) },
  { id: 2, company: '웹 서비스 프로젝트', period: '2021 — 2023', badge: '', icon: '◇', roleDesc: '사용자에게 필요한 기능을 제품으로 구현', projects: JSON.stringify(['반응형 인터페이스와 공통 컴포넌트 구축']), tags: JSON.stringify(['JavaScript', 'Java']) },
];
const experiences = [{ id: 1, title: '배움에서 서비스까지', subtitle: '개발 경험과 지속적인 학습', description: '새로운 기술을 작은 프로젝트에 적용하며 사용자에게 필요한 기능을 만들어 갑니다.', period: '2021 — 현재' }];
const skills = [
  { id: 1, title: 'Frontend', cssClass: 'p1', descriptions: JSON.stringify(['사용하기 편한 반응형 화면과 재사용 가능한 컴포넌트를 만듭니다.', 'Vue.js · JavaScript · CSS']) },
  { id: 2, title: 'Backend', cssClass: 'p2', descriptions: JSON.stringify(['데이터 흐름이 명확하고 안정적인 API를 설계합니다.', 'Spring Boot · Java · MySQL']) },
  { id: 3, title: 'Product', cssClass: 'p3', descriptions: JSON.stringify(['일상 속 아이디어를 작동하는 서비스로 연결합니다.', '문제 정의 · 개발 · 운영']) },
];
const diaries = [
  { id: 1, diaryDate: currentDate, content: '오늘은 오랫동안 생각하던 프로젝트를 조금 더 다듬었다. 작은 변화를 차곡차곡 쌓으니 처음보다 훨씬 편해졌다. 저녁에는 산책하며 내일 할 일을 정리했다.', aiAnalysis: null },
  { id: 2, diaryDate: '2026-11-23', content: '책을 읽고 새로운 아이디어를 정리한 하루. 바쁘더라도 나를 위한 시간을 조금씩 남겨두자.', aiAnalysis: null },
];
const todos = [
  { id: 1, title: '이번 주 프로젝트 우선순위 정리', description: '핵심 작업을 정리하고 작은 단계로 나누기', done: false, priority: 3, category: '프로젝트', dueDate: '2026-11-27', createdAt: '2026-11-24T09:00:00' },
  { id: 2, title: '읽고 싶은 책 목록 업데이트', description: '', done: false, priority: 2, category: '일상', dueDate: '2026-11-30', createdAt: '2026-11-23T09:00:00' },
  { id: 3, title: '지난주 기록 돌아보기', description: '', done: true, priority: 1, category: '일상', dueDate: null, createdAt: '2026-11-22T09:00:00' },
];
const subscriptions = [
  { id: 1, name: '디자인 도구', amount: 15000, currency: 'KRW', billingCycle: 'MONTHLY', nextBillingDate: '2026-11-27', startedAt: '2026-06-01', category: '생산성', paymentMethod: '개인 카드', status: 'ACTIVE', color: '#5c80da', memo: '화면 설계와 프로토타입' },
  { id: 2, name: '음악 스트리밍', amount: 10900, currency: 'KRW', billingCycle: 'MONTHLY', nextBillingDate: '2026-12-02', startedAt: '2026-04-01', category: '엔터테인먼트', paymentMethod: '개인 카드', status: 'ACTIVE', color: '#54a88d', memo: '' },
  { id: 3, name: '클라우드 저장소', amount: 33000, currency: 'KRW', billingCycle: 'YEARLY', nextBillingDate: '2027-03-01', startedAt: '2026-03-01', category: '생산성', paymentMethod: '개인 카드', status: 'ACTIVE', color: '#a87cc8', memo: '' },
];
const users = [
  { id: 1, userId: 'preview-admin', username: 'Preview', name: '미리보기 관리자', email: 'admin@example.test', phone: '010-0000-0000', role: 'ADMIN', createdAt: '2026-11-01T09:00:00', enabled: true },
  { id: 2, userId: 'preview-user', username: 'Member', name: '미리보기 사용자', email: 'member@example.test', phone: '010-0000-0001', role: 'USER', createdAt: '2026-11-12T14:00:00', enabled: true },
];
const roleInfos = [{ roleName: 'USER', displayName: '일반 사용자', isDefault: true }, { roleName: 'PREMIUM', displayName: '프리미엄', isDefault: true }, { roleName: 'ADMIN', displayName: '관리자', isDefault: true }];
const holdings = {
  stock: [{ id: 1, accountType: 'stock', assetType: 'STOCK', market: 'US', symbol: 'DEMO', name: '미리보기 글로벌 ETF', quantity: 10, avgPrice: 100, core: true }],
  general: [{ id: 2, accountType: 'general', assetType: 'STOCK', market: 'KR', symbol: '000001', name: '미리보기 국내주식', quantity: 20, avgPrice: 50000, core: false }],
  isa: [{ id: 3, accountType: 'isa', assetType: 'CASH', market: 'KR', symbol: 'CASH-ISA', name: '예수금', quantity: 500000, avgPrice: 1 }],
  irp: [{ id: 4, accountType: 'irp', assetType: 'CASH', market: 'KR', symbol: 'CASH-IRP', name: '예수금', quantity: 1000000, avgPrice: 1 }],
};

function apiResponse(url, request, scenario) {
  const pathname = url.pathname;
  const ok = data => ({ status: 200, data });
  if (pathname === '/api/audit/event' && request.method() === 'POST') return { status: 204, data: null };
  if (request.method() !== 'GET') return null; // Never send or silently succeed a write.
  if (pathname === '/api/auth/me') return scenario.role === 'guest'
    ? { status: 403, data: { message: '격리 미리보기: 비로그인 상태' } }
    : ok({ username: 'Preview', email: 'preview@example.test', role: scenario.role === 'admin' ? 'ADMIN' : 'USER' });
  if (pathname === '/api/public/menus') return ok({ allMenus: menus, guestMenuPaths: ['/', '/portfolio', '/projects', '/chat'] });
  if (pathname === '/api/auth/menus') return ok(menus);
  if (pathname === '/api/auth/my-menu-permissions') return ok(scenario.role === 'admin' ? menus.map(m => m.path) : permissions);
  const home = { '/api/public/career': careers, '/api/public/experience': experiences, '/api/public/portfolio-skills': skills };
  if (home[pathname]) {
    if (scenario.state === 'error') return { status: 503, data: { message: '격리 미리보기: 정보를 불러오지 못했습니다.' } };
    return ok(scenario.state === 'empty' ? [] : home[pathname]);
  }
  if (pathname === '/api/diary') return ok(diaries);
  if (pathname === '/api/todos/categories') return ok(['프로젝트', '일상']);
  if (pathname === '/api/todos') return { ...ok(todos), headers: { 'x-total-count': String(todos.length) } };
  if (pathname === '/api/subscriptions') return ok(subscriptions);
  if (pathname === '/api/admin/users') return ok(users);
  if (pathname === '/api/admin/role-infos') return ok(roleInfos);
  if (pathname === '/api/admin/allowed-admins') return ok(['preview-admin']);
  if (pathname === '/api/stock/krx-config') return ok({ expiryDate: '2027-04-21' });
  if (pathname === '/api/stock/en-names') return ok({ DEMO: 'Preview Global ETF' });
  if (/^\/api\/portfolio\/(holdings|(general|isa|irp)\/holdings)$/.test(pathname)) {
    const account = url.searchParams.get('accountType') || pathname.split('/')[3];
    return ok(holdings[account === 'holdings' ? 'stock' : account]);
  }
  if (pathname === '/api/stock/quote') {
    const symbol = url.searchParams.get('symbol');
    const prices = { DEMO: 108.25, '000001': 48500, 'USDKRW=X': 1400 };
    if (!(symbol in prices)) return null;
    return ok({ symbol, name: symbol, price: prices[symbol], change: 1, changePercent: 0.5, currency: symbol === 'DEMO' ? 'USD' : 'KRW', volume: 12000, marketCap: 100000000 });
  }
  if (pathname === '/api/travel/itinerary') return ok([{ id: 1, title: '제주에서 보내는 느긋한 주말', destination: '제주', startDate: '2026-12-05', endDate: '2026-12-07', status: 'PLANNED', itineraryJson: JSON.stringify({ days: [{ day: 1, theme: '바다와 산책', items: [] }] }) }]);
  if (pathname === '/api/travel/wishlist') return ok([{ id: 1, title: '가을 교토 산책', country: '일본', city: '교토', priority: 2, targetPeriod: '2027년 가을', estBudget: 1500000, memo: '동네 카페와 정원을 천천히 둘러보기' }]);
  if (pathname === '/api/travel/visited') return ok([{ id: 1, title: '부산의 바다', country: '대한민국', city: '부산', startDate: '2026-10-10', endDate: '2026-10-12', rating: 5, memo: '산책과 맛있는 음식으로 채운 주말', latitude: null, longitude: null }]);
  return null;
}

const scenarios = [
  { name: 'home', route: '/', role: 'guest', ready: '#intro' },
  { name: 'home-empty', route: '/', role: 'guest', state: 'empty', ready: '#intro' },
  { name: 'home-error', route: '/', role: 'guest', state: 'error', ready: '.home-section-state--error' },
  { name: 'login', route: '/login', role: 'guest', ready: 'input[type="password"]' },
  { name: 'diary', route: '/diary', role: 'member', ready: 'textarea' },
  { name: 'todos', route: '/todos', role: 'member', ready: '.todo-row' },
  { name: 'stock', route: '/stock', role: 'member', ready: '.stock-container' },
  { name: 'travel', route: '/travel', role: 'member', ready: '.tv-container' },
  { name: 'subscription', route: '/subscription', role: 'member', ready: '.subscription-container' },
  { name: 'admin', route: '/admin/users', role: 'admin', ready: '.user-card' },
];

async function run() {
  fs.mkdirSync(output, { recursive: true });
  // Reuse installed Edge when the sandbox has no Playwright browser cache.
  const browser = await chromium.launch({ headless: true, args: ['--no-proxy-server'], ...(fs.existsSync(chromium.executablePath()) ? {} : { channel: 'msedge' }) });
  const report = { origin, note: 'Synthetic fixtures only. Guest auth uses 403; pre-existing 401 refresh redirect is not tested. External fonts/CDNs/maps are blocked. Screenshots require human review.', results: [] };
  try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      for (const scenario of scenarios.filter(item => !only.length || only.includes(item.name))) {
        const context = await browser.newContext({ viewport, locale: 'ko-KR', timezoneId: 'Asia/Seoul', reducedMotion: 'reduce', serviceWorkers: 'block' });
        const result = { name: scenario.name, role: scenario.role, width: viewport.width, api: [], unexpectedRequests: [], blockedExternal: [], consoleErrors: [], pageErrors: [], checkpoints: [] };
        await context.route('**/*', async route => {
          const request = route.request();
          const url = new URL(request.url());
          if (url.origin !== origin) {
            result.blockedExternal.push(url.origin + url.pathname);
            return route.abort('blockedbyclient');
          }
          if (url.pathname.startsWith('/api/')) {
            const response = apiResponse(url, request, scenario);
            result.api.push({ method: request.method(), path: url.pathname, status: response?.status || 501 });
            if (!response) result.unexpectedRequests.push(`${request.method()} ${url.pathname}${url.search}`);
            return route.fulfill({ status: response?.status || 501, contentType: 'application/json', headers: response?.headers, body: response?.status === 204 ? '' : JSON.stringify(response?.data ?? { message: 'Unconfigured fixture: request blocked' }) });
          }
          if (request.method() !== 'GET' || url.pathname.startsWith('/uploads/')) {
            result.unexpectedRequests.push(`${request.method()} ${url.pathname}`);
            return route.abort('blockedbyclient');
          }
          return route.continue();
        });
        const page = await context.newPage();
        await page.clock.setFixedTime(new Date(`${currentDate}T12:00:00+09:00`));
        page.on('console', message => { if (message.type() === 'error') result.consoleErrors.push(message.text()); });
        page.on('pageerror', error => result.pageErrors.push(error.message));
        try {
          await page.goto(`${origin}/#${scenario.route}`, { waitUntil: 'networkidle', timeout: 15000 });
          await page.locator(scenario.ready).first().waitFor({ state: 'visible', timeout: 15000 });
          await page.evaluate(() => document.fonts.ready);
          // Give chart rendering and Vue transitions time to settle, without changing app state.
          await page.waitForTimeout(300);
          const capture = async suffix => {
            const metrics = await page.evaluate(() => ({
              viewportWidth: window.innerWidth,
              documentWidth: document.documentElement.scrollWidth,
              bodyWidth: document.body.scrollWidth,
              overflowElements: [...document.querySelectorAll('body *')].filter(el => {
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0 && (rect.right > innerWidth + 2 || rect.left < -2) && getComputedStyle(el).position !== 'fixed';
              }).slice(0, 12).map(el => ({ tag: el.tagName, class: String(el.className).slice(0, 100) })),
            }));
            const filename = `${scenario.name}-${viewport.width}${suffix}.png`;
            await page.screenshot({ path: path.join(output, filename), fullPage: true });
            result.checkpoints.push({ filename, hash: new URL(page.url()).hash, ...metrics });
          };
          await capture('');
          if (scenario.name === 'home' && viewport.width === 1440) {
            await page.screenshot({ path: path.join(output, 'home-preview.png'), fullPage: false });
          }
          if (scenario.name === 'todos') {
            await page.locator('.todo-del').first().click();
            await page.locator('.modal-wrapper').waitFor({ state: 'visible' });
            await capture('-delete-dialog');
            await page.keyboard.press('Escape');
            result.deleteDialogClosedByEscape = await page.locator('.modal-wrapper').count() === 0;
          }
          if (scenario.name === 'admin') {
            if (viewport.width < 600) {
              const trigger = page.locator('.admin-mobile-bar .mobile-hamburger');
              await trigger.focus();
              await page.keyboard.press('Enter');
              await page.locator('.admin-sidebar.open').waitFor({ state: 'visible' });
              result.sidebarOpenedWithKeyboard = await trigger.getAttribute('aria-expanded') === 'true';
              const links = page.locator('.admin-sidebar a[href], .admin-sidebar button:not([disabled])');
              await links.last().focus();
              await page.waitForTimeout(50);
              await page.keyboard.press('Tab');
              await page.waitForTimeout(50);
              result.sidebarTabWrap = await links.first().evaluate(el => el === document.activeElement);
              result.sidebarTabFocus = await page.evaluate(() => ({ tag: document.activeElement.tagName, text: document.activeElement.textContent.trim().slice(0, 80), class: document.activeElement.className }));
              await page.keyboard.press('Escape');
              await page.waitForTimeout(50);
              result.sidebarEscapeReturnsFocus = await trigger.evaluate(el => el === document.activeElement) && await trigger.getAttribute('aria-expanded') === 'false';
              await trigger.click();
              await capture('-sidebar');
              await page.keyboard.press('Escape');
            }
            await page.getByRole('button', { name: '새 사용자 생성' }).click();
            await page.waitForTimeout(150);
            await capture('-create-dialog');
          }
          if (scenario.name === 'diary' && viewport.width < 600) {
            const toggle = page.locator('.diary-page .sidebar-toggle, .diary-container .sidebar-toggle, button.sidebar-toggle');
            if (await toggle.count()) { await toggle.click(); await capture('-entries'); }
          }
          if (scenario.name === 'home' && viewport.width < 600) {
            const toggle = page.locator('.header__nav__mobile');
            await toggle.focus();
            await page.keyboard.press('Enter');
            result.menuOpenedWithKeyboard = await toggle.getAttribute('aria-expanded') === 'true';
            await page.keyboard.press('Escape');
            await page.waitForTimeout(50);
            result.menuEscapeReturnsFocus = await toggle.evaluate(el => el === document.activeElement) && await toggle.getAttribute('aria-expanded') === 'false';
            result.menuEscapeFocus = await page.evaluate(() => ({ tag: document.activeElement.tagName, text: document.activeElement.textContent.trim().slice(0, 80), class: document.activeElement.className }));
            await toggle.click();
            await capture('-menu');
          }
          await page.keyboard.press('Escape');
          await page.keyboard.press('Tab');
          result.focus = await page.evaluate(() => ({ tag: document.activeElement.tagName, label: document.activeElement.textContent.trim().slice(0, 80), outline: getComputedStyle(document.activeElement).outlineStyle }));
          const keyboardChecks = ['sidebarOpenedWithKeyboard', 'sidebarTabWrap', 'sidebarEscapeReturnsFocus', 'menuOpenedWithKeyboard', 'menuEscapeReturnsFocus', 'deleteDialogClosedByEscape'];
          result.status = result.pageErrors.length || result.unexpectedRequests.length || result.checkpoints.some(item => item.documentWidth > viewport.width + 2) || keyboardChecks.some(key => result[key] === false) ? 'needs-review' : 'captured';
        } catch (error) {
          result.status = 'failed';
          result.error = error.message;
          await page.screenshot({ path: path.join(output, `${scenario.name}-${viewport.width}-failure.png`), fullPage: true }).catch(() => {});
          if (error.message.includes('net::ERR_CONNECTION')) throw error;
        }
        report.results.push(result);
        await context.close();
        console.log(`${scenario.name} ${viewport.width}: ${result.status}; unknown APIs ${result.unexpectedRequests.length}; runtime errors ${result.pageErrors.length}`);
        fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
      }
    }
  } finally { await browser.close(); }
  console.log(`Evidence: ${output}`);
  if (report.results.some(result => result.status !== 'captured')) process.exitCode = 1;
}

module.exports = { apiResponse, menus, careers, experiences, skills, todos, users, roleInfos };
if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
