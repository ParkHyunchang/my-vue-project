const csp = [
  "default-src 'self'",
  "connect-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

module.exports = {
  transpileDependencies: true,
  parallel: false,
  lintOnSave: false,
  devServer: {
    host: '127.0.0.1',
    port: 13100,
    allowedHosts: ['localhost', '127.0.0.1'],
    hot: false,
    liveReload: false,
    client: false,
    webSocketServer: false,
    headers: { 'Content-Security-Policy': csp, 'Referrer-Policy': 'no-referrer' },
    proxy: {
      '/api': { target: 'http://127.0.0.1:13200', changeOrigin: false, followRedirects: false },
      '/uploads': { target: 'http://127.0.0.1:13200', changeOrigin: false, followRedirects: false },
    },
  },
};
