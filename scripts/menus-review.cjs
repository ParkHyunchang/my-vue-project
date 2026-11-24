/* eslint-disable no-console */
/* eslint-env browser */
// TEAM-35: real app, all menus, synthetic GET fixtures, no backend or writes.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { chromium } = require('playwright');
const base = require('./design-review.cjs');
const origin = 'http://127.0.0.1:13100';
const output = path.resolve(__dirname, '../docs/ai-team/evidence/TEAM-35');
const only = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const reportMarkdown = '# 분석 결과\n\n## 요약\n예시 데이터를 이용한 디자인 검증입니다.\n\n> 실제 분석이나 투자 의견이 아닙니다.\n\n- 기록을 정리해 보세요.\n- 다음 계획을 확인하세요.\n\n| 항목 | 내용 |\n|---|---|\n| 상태 | 미리보기 |';

function mockClient(file) {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8').replace(/^import .*$/gm, '').replace(/export const /g, 'const ').replace(/export function /g, 'function ').replace('export default ', 'globalThis.client = ');
  const sandbox = { reactive: value => value };
  vm.runInNewContext(`${source}\nresetScenario('ready');`, sandbox, { timeout: 1000 });
  return sandbox.client;
}
const us = mockClient('isolated-us-risk-mock.js');
const deployments = mockClient('strategy-deployment-mock.js');
const menus = base.menus.map((m, i) => ({ ...m, id: i + 1, sortOrder: i + 1 }));
const chatSession = { sessionKey: 'preview-session', username: 'Preview', title: '프로젝트 아이디어 정리', messageCount: 2, lastActivity: '2026-11-24T10:00:00' };
const chatMessages = [{ role: 'user', content: '이번 주 계획을 정리하고 싶어요.', createdAt: '2026-11-24T10:00:00' }, { role: 'assistant', content: reportMarkdown, createdAt: '2026-11-24T10:01:00' }];
async function fixture(url, request, scenario) {
  const p = url.pathname;
  const ok = data => ({ status: 200, data });
  if (request.method() !== 'GET') return base.apiResponse(url, request, scenario);
  if (p === '/api/admin/menus') return ok(menus);
  if (p === '/api/admin/role-infos') return ok([...base.roleInfos, { id: 4, roleName: 'MANAGER', displayName: '매니저', description: '합성 검증 역할', isDefault: false, userCount: 0 }]);
  if (p === '/api/admin/menu-permissions') return ok({ USER: ['/todos', '/diary'], ADMIN: menus.map(m => m.path), PREMIUM: ['/history', '/dating'] });
  if (p === '/api/admin/career') return ok(base.careers);
  if (p === '/api/admin/experience') return ok(base.experiences);
  if (p === '/api/admin/portfolio-skills') return ok(base.skills);
  if (p === '/api/admin/prompts') return ok([{ key: 'PREVIEW', name: '서비스 분석', displayName: '서비스 분석', category: '일반', description: '예시 프롬프트', effectiveInstruction: '사용자의 질문에 명확하고 친절하게 답하세요.', variables: [], custom: true, customized: true }]);
  if (/^\/api\/admin\/users\/\d+$/.test(p)) return ok(base.users[0]);
  if (/^\/api\/admin\/role-infos\/[^/]+\/users$/.test(p)) return ok({ users: base.users });
  if (p === '/api/admin/chat/sessions' || p === '/api/chat/sessions/Preview') return ok([chatSession]);
  if (p === '/api/admin/chat/sessions/preview-session/messages' || p === '/api/chat/history/preview-session') return ok(chatMessages);
  if (p === '/api/todos/1') return ok(base.todos[0]);
  if (p === '/api/histories') return ok([{ id: 1, title: '새로운 프로젝트의 시작', description: '일상의 아이디어를 작은 서비스로 만들었습니다.', date: '2026-11-24', eventDate: '2026-11-24', category: '프로젝트', location: '서울', images: [], videos: [] }]);
  if (p === '/api/dating') return ok([{ id: 1, title: '공원에서 보낸 주말', description: '산책하며 남긴 기억입니다.', date: '2026-11-22', memoryDate: '2026-11-22', category: '데이트', location: '서울', images: [], videos: [] }]);
  if (p === '/api/saju/profiles') return ok([{ id: 1, label: '미리보기 프로필', birthDate: '1990-01-01', birthTime: '12:00', timeUnknown: false, calendarType: 'SOLAR', lastReportMarkdown: reportMarkdown, createdAt: '2026-11-24T10:00:00', analyzedAt: '2026-11-24T10:00:00' }]);
  if (p === '/api/realestate/config') return ok({ configured: true });
  if (p === '/api/property/holdings') return ok([{ id: 1, propertyType: 'APT', name: '미리보기 아파트', dealType: 'SALE', sigungu: '서울 강남구', lawdCd: '11680', areaM2: 84, purchasePrice: 120000, purchaseDate: '2024-06-01' }]);
  if (p === '/api/realestate/quote') return ok({ found: true, recentPrice: 125000, recentDate: '2026-11-01', matchCount: 3 });
  if (p === '/api/realestate/regions') return ok([{ code: '11680', name: '서울 강남구' }]);
  if (p === '/api/realestate/news' || p === '/api/stock/news') return ok([{ title: '새로운 소식을 확인하는 미리보기 카드', link: 'https://example.test/news', description: '실제 뉴스가 아닌 디자인 검증용 합성 콘텐츠입니다.', source: '미리보기', pubDate: '2026-11-24T09:00:00' }]);
  if (/^\/api\/stock\/top10\//.test(p)) return ok([]);
  if (p === '/api/stock/heatmap/kr') return ok({ updatedAt: '2026-11-24T10:00:00', sectors: [] });
  if (p === '/api/kiwoom/auto-trade/status') return ok({ configured: true, connected: false, autoTrading: false, tokenValid: false, marketOpen: false, marketMessage: '격리 디자인 검증 · 실제 연결 없음' });
  if (p === '/api/kiwoom/auto-trade/summary') return ok({ account: { deposit: 1000000, totalAsset: 1000000 }, holdings: [] });
  if (p === '/api/kiwoom/auto-trade/holdings' || /\/strategy\/(universe|runs)$/.test(p)) return ok([]);
  if (/\/strategy\/(config|settings|health)$/.test(p)) return ok({ orderEnabled: false, autoExecute: false, autoExecuteMinConfidence: 85, prompt: '격리 검증용', maxBuyDepositPercent: 10 });
  if (p.startsWith('/api/kiwoom/us/auto-trade/')) { try { return ok((await us.get(p)).data); } catch { return null; } }
  if (p === '/api/kiwoom/us/strategy-deployments/status') return ok((await deployments.get(p)).data);
  return base.apiResponse(url, request, scenario);
}

const scenarios = [
  ['home', '/', 'guest'], ['login', '/login', 'guest'], ['portfolio', '/portfolio', 'guest'], ['projects', '/projects', 'guest'],
  ['history', '/history'], ['dating', '/dating'], ['todos', '/todos'], ['todo-create', '/todos/create'], ['todo-detail', '/todos/1'],
  ['subscription', '/subscription'], ['diary', '/diary'], ['chat', '/chat'], ['mypage', '/mypage'], ['change-password', '/change-password'],
  ...['users','menu-management','role-management','menu-definition','prompt-management','chat-history','career','experience','portfolio-skill'].map(s => [`admin-${s}`, `/admin/${s}`]),
  ...['all','stock','general','isa','irp','heatmap','top10','news','auto-trade'].map(s => [`stock-${s}`, `/stock?tab=${s}`]),
  ...['search','holdings','news'].map(s => [`realestate-${s}`, `/realestate?tab=${s}`]),
  ...['planner','itinerary','visited','wishlist'].map(s => [`travel-${s}`, `/travel?tab=${s}`]),
  ...['view','saved'].map(s => [`saju-${s}`, `/saju?tab=${s}`]),
].map(([name, route, role = 'admin']) => ({ name, route, role }));

async function run() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--no-proxy-server'], ...(fs.existsSync(chromium.executablePath()) ? {} : { channel: 'msedge' }) });
  const results = [];
  try {
    for (const width of [1440, 390]) for (const scenario of scenarios.filter(s => !only.length || only.includes(s.name))) {
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, reducedMotion: 'reduce', locale: 'ko-KR', timezoneId: 'Asia/Seoul', serviceWorkers: 'block' });
      const result = { ...scenario, width, unknown: [], errors: [], captures: [] };
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin !== origin) return route.abort();
        if (url.pathname.startsWith('/api/')) {
          if (/^\/api\/kiwoom\/(us\/)?auto-trade\/events$/.test(url.pathname)) return route.fulfill({ status: 200, contentType: 'text/event-stream', body: ': isolated fixture\n\nretry: 60000\n\n' });
          const data = await fixture(url, request, scenario);
          if (!data) result.unknown.push(`${request.method()} ${url.pathname}`);
          return route.fulfill({ status: data?.status || 501, contentType: 'application/json', headers: data?.headers, body: data?.status === 204 ? '' : JSON.stringify(data?.data ?? { message: '격리 대역 미설정' }) });
        }
        if (request.method() !== 'GET' || url.pathname.startsWith('/uploads/')) return route.abort();
        return route.continue();
      });
      const page = await context.newPage();
      page.on('pageerror', error => result.errors.push(error.message));
      await page.clock.setFixedTime(new Date('2026-11-24T12:00:00+09:00'));
      const capture = async suffix => {
        await page.waitForTimeout(250);
        const file = `${scenario.name}-${width}${suffix}.png`;
        const metrics = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth, content: document.querySelector('.main-wrapper')?.textContent.trim().length || 0 }));
        await page.screenshot({ path: path.join(output, file), fullPage: !suffix });
        result.captures.push({ file, ...metrics });
      };
      try {
        await page.goto(`${origin}/#${scenario.route}`, { waitUntil: 'networkidle', timeout: 18000 });
        await page.locator('.main-wrapper').waitFor();
        await capture('');
        const actual = new URL(page.url()).hash.slice(1).split('?')[0];
        if (actual !== scenario.route.split('?')[0]) result.errors.push(`Unexpected route: ${actual}`);
        // Open forms only; never submit, save, trigger analysis, or activate trading.
        const openers = {
          history: '.page-header .btn-primary', dating: '.page-header .btn-primary', subscription: '.filter-toolbar .btn-primary',
          'admin-career': '.page-header .btn-primary', 'admin-experience': '.page-header .btn-primary', 'admin-portfolio-skill': '.page-header .btn-primary',
          'admin-menu-definition': '.page-header .btn-primary', 'admin-role-management': '.btn-create',
          'travel-itinerary': '.ip-add-btn', 'travel-visited': '.vs-add-btn', 'travel-wishlist': '.wl-add-btn',
          'realestate-holdings': '.pp-add-btn',
        };
        const opener = openers[scenario.name];
        if (opener) {
          await page.locator(opener).first().waitFor({ state: 'visible', timeout: 3000 });
          await page.locator(opener).first().click(); await capture('-form'); await page.keyboard.press('Escape');
        }
        if (scenario.name === 'admin-prompt-management') {
          const edit = page.getByRole('button', { name: /편집|수정/ }).first();
          if (await edit.isVisible()) { await edit.click(); await capture('-editor'); }
        }
        if (scenario.name === 'admin-role-management') {
          await page.locator('.modal-box .modal-close').click();
          await page.locator('.roles-table tbody tr').filter({ hasText: 'MANAGER' }).locator('.btn-edit').click();
          await capture('-edit');
          const toggle = await page.locator('.toggle-track').boundingBox();
          if (!toggle || toggle.width > 60 || toggle.height > 30) result.errors.push('Role toggle track bounds invalid');
        }
        if (scenario.name === 'login') {
          await page.getByRole('link', { name: '회원가입', exact: true }).click(); await capture('-register');
        }
        if (scenario.name === 'admin-chat-history') { await page.locator('.session-row').first().click(); await capture('-messages'); }
        if (scenario.name === 'stock-auto-trade') {
          await page.locator('.auto-market-tabs button').nth(1).click(); await page.waitForTimeout(700); await capture('-us');
        }
        result.status = result.errors.length || result.unknown.length || result.captures.some(c => c.documentWidth > width + 2 || c.content < 5) ? 'review' : 'captured';
      } catch (error) { result.status = 'failed'; result.errors.push(error.message); }
      results.push(result);
      await context.close();
      fs.writeFileSync(path.join(output, only.length ? 'partial-report.json' : 'report.json'), JSON.stringify({ note: 'Synthetic fixtures only; external assets blocked; no writes. Inspect screenshots separately.', results }, null, 2));
      console.log(`${scenario.name} ${width}: ${result.status} ${result.unknown.join(',')} ${result.errors.join(',').slice(0, 160)}`);
      if (result.errors.some(e => /CONNECTION|TIMED_OUT/.test(e))) break;
    }
  } finally { await browser.close(); }
  if (results.some(r => r.status !== 'captured')) process.exitCode = 1;
}
module.exports = { fixture };
if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
