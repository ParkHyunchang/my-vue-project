/* eslint-disable no-console */
// Synthetic loopback-only API. No upstream access; all mutations are rejected.
// Run alongside npm run serve:isolated. UI review is performed in the browser.
const http = require('node:http');
const { fixture } = require('./menus-review.cjs');
const photo = '/api/review/photo.png';
const histories = [
  { id: 1, title: '제주에서 남긴 기록', description: '바다 산책과 사진을 남긴 합성 기록입니다.', date: '2026-11-20', category: 'travel', location: '제주', images: [photo, photo, photo, photo, photo] },
  { id: 2, title: '해를 넘긴 프로젝트', description: '연도 교차 검색 확인', dateType: 'range', startDate: '2024-12-20', endDate: '2025-01-10', category: 'work', location: '서울', images: [] },
  { id: 3, title: '지난 기록', description: '검색과 정렬 확인', date: '2023-04-10', category: 'record', images: [] },
];
const memories = [
  { id: 11, title: '처음 만난 날', description: '합성 기념일', date: '2024-03-02', category: 'first_meet', images: [] },
  { id: 12, title: '함께하기로 한 날', description: '합성 기념일', date: '2024-04-01', category: 'special', images: [] },
  { ...histories[0], id: 13, title: '함께 떠난 제주 여행' },
];
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:13200');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.writeHead(405); return res.end('Read-only synthetic preview'); }
  if (url.pathname === '/api/review/photo.png') {
    res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
    return res.end('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#24495d"/><circle cx="600" cy="120" r="60" fill="#e6b66b"/><path d="M0 400Q200 250 400 400T800 400V600H0" fill="#56bba9"/><text x="30" y="560" fill="white" font-size="30">Synthetic review image</text></svg>');
  }
  let out;
  if (url.pathname === '/api/histories') out = { status: 200, data: histories };
  else if (url.pathname === '/api/dating') out = { status: 200, data: memories };
  else if (url.pathname === '/api/kiwoom/accounts/overview') out = { status: 200, data: { broker: 'KIWOOM', queriedAt: new Date().toISOString(), markets: [
    { market: 'KR', status: 'OK', currency: 'KRW', source: 'KIWOOM_REST', queriedAt: new Date().toISOString(), dataAsOf: null, cash: 1000000, holdings: [{ symbol: '005930', name: '합성 국내 종목', quantity: 10, averagePrice: 70000, currentPrice: 75000, profitLoss: 50000 }] },
    { market: 'US', status: 'ERROR', currency: 'USD', holdings: [], cash: null, notice: '부분 실패 표시 검증을 위한 합성 응답입니다.' },
  ] } };
  else out = await fixture(url, { method: () => 'GET' }, { role: 'admin' });
  out ||= { status: 501, data: { message: 'Unconfigured synthetic fixture' } };
  res.writeHead(out.status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(out.data));
}).listen(13200, '127.0.0.1', () => console.log('Synthetic archive/stock API on 13200; no upstream; writes rejected'));
