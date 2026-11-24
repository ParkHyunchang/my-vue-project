/* eslint-disable no-console */
const path = require('node:path')
if (!process.argv.includes('--worker')) {
  const { spawn } = require('node:child_process')
  const { isolatedEnvironment } = require('./test-environment.cjs')
  const child = spawn(process.execPath, [__filename, '--worker'], { cwd: path.resolve(__dirname, '..'), env: { ...isolatedEnvironment(process.env), NODE_ENV: 'development', BABEL_ENV: 'development', VUE_APP_API_URL: '' }, stdio: 'inherit' })
  console.log(`[deployment mock] worker PID ${child.pid}; http://127.0.0.1:13140`)
  child.on('error', error => { console.error(error.message); process.exitCode = 1 })
  child.on('exit', code => { process.exitCode = code || 0 })
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
} else {
  const Service = require('@vue/cli-service/lib/Service')
  const service = new Service(path.resolve(__dirname, '..'))
  service.loadEnv = () => {}
  service.loadUserOptions = () => ({
    parallel: false, lintOnSave: false,
    configureWebpack: { plugins: [new (require('webpack').NormalModuleReplacementPlugin)(/^(@\/axios|axios)$/, path.join(__dirname, 'strategy-deployment-mock.js'))] },
    pages: { index: { entry: path.join(__dirname, 'strategy-deployment-entry.js'), template: path.join(__dirname, 'strategy-deployment.html') } },
    chainWebpack(config) { config.resolve.alias.set('@/axios$', path.join(__dirname, 'strategy-deployment-mock.js')); config.resolve.alias.set('axios$', path.join(__dirname, 'strategy-deployment-mock.js')); config.plugins.delete('copy') },
    devServer: { host: '127.0.0.1', port: 13140, allowedHosts: ['127.0.0.1'], hot: false, liveReload: false, client: false, webSocketServer: false,
      headers: { 'Content-Security-Policy': "default-src 'self'; connect-src 'none'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'", 'Referrer-Policy': 'no-referrer' } },
  })
  const probe = require('node:net').createServer()
  probe.once('error', error => { console.error(error.message); process.exitCode = 1 })
  probe.listen(13140, '127.0.0.1', () => probe.close(() => service.run('serve', { host: '127.0.0.1', port: 13140 }, []).catch(error => { console.error(error.message); process.exitCode = 1 })))
}
