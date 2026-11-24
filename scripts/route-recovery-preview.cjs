/* eslint-disable no-console */
// Local production-build preview with synthetic APIs and a deliberate lazy-chunk failure.
// npm run build, then node scripts/route-recovery-preview.cjs [--persistent]
// Use the browser UI to navigate from home to a lazy-loaded menu.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { apiResponse } = require('./design-review.cjs');
const { devServer } = require('./isolated-browser.config.cjs');
const persistent = process.argv.includes('--persistent');
const port = persistent ? 13101 : 13100;
const root = path.resolve(__dirname, '../dist');
let failed = false;
const counts = { documents: 0, injectedFailures: 0 };
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  const send = (status, type, body) => {
    res.writeHead(status, { ...devServer.headers, 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(body);
  };
  if (url.pathname === '/__review_status') return send(200, 'application/json', JSON.stringify(counts));
  if (url.pathname.startsWith('/api/')) {
    const out = apiResponse(url, { method: () => req.method }, { role: 'admin' }) || { status: 501, data: { message: 'Unconfigured isolated fixture' } };
    return send(out.status, 'application/json', out.data == null ? '' : JSON.stringify(out.data));
  }
  if (req.method !== 'GET') return send(405, 'text/plain', 'Read-only preview');
  const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep)) return send(403, 'text/plain', 'Outside preview');
  // Reject prefetch too, so a previously prefetched chunk cannot bypass the scenario.
  const lazyChunk = /^js\/\d+\.[\w]+\.js$/.test(relative);
  const prefetch = /prefetch/i.test(`${req.headers.purpose || ''} ${req.headers['sec-purpose'] || ''}`);
  if (lazyChunk && (prefetch || persistent || !failed)) {
    if (!prefetch) { failed = true; counts.injectedFailures++; console.log('Injected lazy-chunk 404', counts); }
    return send(404, 'text/plain', 'Deliberate local-only chunk failure');
  }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return send(404, 'text/plain', 'Not found');
  if (relative === 'index.html') { counts.documents++; console.log('Document loaded', counts); }
  send(200, types[path.extname(file)] || 'application/octet-stream', fs.readFileSync(file));
}).listen(port, '127.0.0.1', () => console.log(`Isolated route recovery preview on ${port}; persistent=${persistent}; no upstream`));
