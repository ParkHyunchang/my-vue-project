/* eslint-disable no-console */
const path = require('node:path')
if (!process.argv.includes('--worker')) {
  const { spawn } = require('node:child_process')
  const { isolatedEnvironment } = require('./test-environment.cjs')
  const options = process.argv.slice(2)
  if (options.some(value => value !== '--fixture')) throw new Error('Only --fixture is supported')
  const env = { ...isolatedEnvironment(process.env), NODE_ENV: 'development', BABEL_ENV: 'development', VUE_APP_API_URL: '' }
  const child = spawn(process.execPath, [__filename, '--worker', ...options], { cwd: path.resolve(__dirname, '..'), env, stdio: 'inherit' })
  console.log(`[strategy lab UI] worker PID ${child.pid}; http://127.0.0.1:13130; ${options.includes('--fixture') ? 'FIXTURE' : 'PUBLIC DATA'}`)
  child.on('error', error => { console.error(error.message); process.exitCode = 1 })
  child.on('exit', code => { process.exitCode = code || 0 })
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
} else {
  const fs = require('node:fs')
  const folder = process.argv.includes('--fixture') ? 'fixture' : 'local'
  const tokenPath = path.resolve(__dirname, '../../my-vue-project_backend/.research-runtime', folder, 'access-token')
  if (!fs.existsSync(tokenPath)) throw new Error('Start the matching run-strategy-lab.ps1 backend first')
  const origin = 'http://127.0.0.1:13130'
  const Service = require('@vue/cli-service/lib/Service')
  const service = new Service(path.resolve(__dirname, '..'))
  service.loadEnv = () => {}
  service.loadUserOptions = () => ({
    parallel: false, lintOnSave: false,
    pages: { index: { entry: path.join(__dirname, 'strategy-lab-entry.js'), template: path.join(__dirname, 'strategy-lab.html') } },
    chainWebpack(config) {
      const aliases = config.resolve.alias.entries()
      config.resolve.alias.clear()
      config.resolve.alias.set('@/axios$', path.join(__dirname, 'strategy-lab-client.js'))
      for (const [name, value] of Object.entries(aliases)) config.resolve.alias.set(name, value)
      config.plugins.delete('copy')
    },
    devServer: {
      host: '127.0.0.1', port: 13130, allowedHosts: ['127.0.0.1'],
      hot: false, liveReload: false, client: false, webSocketServer: false,
      headers: { 'Content-Security-Policy': "default-src 'self'; connect-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; object-src 'none'; frame-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'", 'Referrer-Policy': 'no-referrer' },
      setupMiddlewares(middlewares, server) {
        server.app.use((req, res, next) => {
          if (req.headers.host !== '127.0.0.1:13130') return res.status(403).json({ message: 'Local host required' })
          if (!req.url.startsWith('/api/')) return next()
          const labPath = /^\/api\/strategy-lab\/(status|cycle|scheduler|approve|reject|export)$/.test(req.url)
          const requestOrigin = req.headers.origin
          const source = req.headers['sec-fetch-site']
          const sameOrigin = requestOrigin === origin || (!requestOrigin && source === 'same-origin')
          if (!labPath || !sameOrigin || req.headers['x-strategy-lab-local'] !== '1' || req.method === 'OPTIONS') {
            return res.status(403).json({ message: 'Only same-origin strategy lab requests are allowed' })
          }
          next()
        })
        return middlewares
      },
      proxy: {
        '/api/strategy-lab': {
          target: 'http://127.0.0.1:13230', changeOrigin: false, ws: false,
          onProxyReq(proxyReq) {
            proxyReq.removeHeader('authorization')
            proxyReq.removeHeader('cookie')
            proxyReq.removeHeader('x-strategy-lab-token')
            proxyReq.setHeader('X-Strategy-Lab-Token', fs.readFileSync(tokenPath, 'utf8').trim())
          },
        },
      },
    },
  })
  const probe = require('node:net').createServer()
  probe.once('error', error => { console.error(error.message); process.exitCode = 1 })
  probe.listen(13130, '127.0.0.1', () => probe.close(() => service.run('serve', { host: '127.0.0.1', port: 13130 }, []).catch(error => { console.error(error.message); process.exitCode = 1 })))
}
