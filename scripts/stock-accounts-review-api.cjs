/* eslint-disable no-console */
// Disposable UI-review data only. Binds loopback; never forwards to a real API.
// node scripts/stock-accounts-review-api.cjs [--partial-failure]
const http = require('node:http');
const { fixture } = require('./menus-review.cjs');
const partialFailure = process.argv.includes('--partial-failure');
const accounts = ['stock', 'general', 'isa', 'irp'].map((type, index) => ({
  id: `legacy-${type}`, broker: 'UNASSIGNED', name: ['기존 장기 기록', '기존 단기 기록', '기존 ISA 기록', '기존 IRP 기록'][index],
  purpose: ['LONG_TERM', 'SHORT_TERM', 'ISA', 'IRP'][index], legacyType: type, source: 'MANUAL',
  holdingsPath: `/api/portfolio/${type === 'stock' ? '' : type + '/'}holdings`,
}));
accounts.push({ id: 'review-account', broker: 'SAMSUNG', name: '검증용 삼성 미국계좌', purpose: 'LONG_TERM', legacyType: null, source: 'MANUAL', holdingsPath: '/api/portfolio/accounts/review-account/holdings' });
const entries = { 'review-account': [{ id: 91, accountType: 'review-account', assetType: 'STOCK', market: 'US', currency: 'USD', symbol: 'AAPL', name: '합성 미국 종목', quantity: 0.125, avgPrice: 100, core: false, source: 'MANUAL' }] };
let sequence = 100;
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:13200');
  const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
  let body = '';
  for await (const chunk of req) { body += chunk; if (body.length > 100000) return send(413, { message: 'Fixture body limit' }); }
  let input; try { input = body ? JSON.parse(body) : {}; } catch { return send(400, {}); }
  const root = '/api/portfolio/accounts';
  if (url.pathname === root && req.method === 'GET') return send(200, accounts);
  if (url.pathname === root && req.method === 'POST') {
    const id = `review-${++sequence}`;
    const account = { ...input, id, legacyType: null, source: 'MANUAL', holdingsPath: `${root}/${id}/holdings` };
    accounts.push(account); entries[id] = []; return send(200, account);
  }
  const accountMatch = url.pathname.match(/^\/api\/portfolio\/accounts\/([^/]+)$/);
  if (accountMatch && req.method === 'PUT') {
    const account = accounts.find(a => a.id === accountMatch[1]);
    if (!account) return send(404, {});
    Object.assign(account, { name: input.name, broker: input.broker, purpose: input.purpose }); return send(200, account);
  }
  const holdingMatch = url.pathname.match(/^\/api\/portfolio\/accounts\/([^/]+)\/holdings(?:\/(\d+))?(\/core)?$/);
  if (holdingMatch) {
    const list = entries[holdingMatch[1]];
    if (!list) return send(404, {});
    if (req.method === 'GET') return send(200, list);
    if (req.method === 'POST') { const holding = { ...input, id: ++sequence, accountType: holdingMatch[1], source: 'MANUAL' }; list.push(holding); return send(200, holding); }
    const index = list.findIndex(h => h.id === Number(holdingMatch[2]));
    if (index < 0) return send(404, {});
    if (req.method === 'PUT') { Object.assign(list[index], input); return send(200, list[index]); }
    if (req.method === 'DELETE') { list.splice(index, 1); return send(200, {}); }
  }
  // Deliberately cannot execute broker orders, settings, synchronization or real uploads.
  if (req.method !== 'GET') return send(405, { message: 'Synthetic account-only writes allowed' });
  if (partialFailure && url.pathname === '/api/portfolio/general/holdings') return send(503, { message: '합성 계좌 조회 실패' });
  if (url.pathname === '/api/kiwoom/accounts/overview') return send(200, { broker: 'KIWOOM', markets: [
    { market: 'KR', currency: 'KRW', status: 'UNCONFIGURED', holdings: [], cash: null },
    { market: 'US', currency: 'USD', status: 'ERROR', holdings: [], cash: null },
  ] });
  const out = await fixture(url, { method: () => req.method }, { role: 'admin' });
  return send(out?.status || 501, out?.data || {});
}).listen(13200, '127.0.0.1', () => console.log(`Disposable stock-account fixture on 13200; partialFailure=${partialFailure}; no upstream`));
