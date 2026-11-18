/** @jest-environment jsdom */
const fs = require('fs')
const path = require('path')
const { parse, compileScript, compileTemplate } = require('@vue/compiler-sfc')
const { transformSync } = require('@babel/core')
const { createApp, nextTick, h } = require('vue')
const { createRouter, createMemoryHistory, RouterView } = require('vue-router')
const http = require('@/axios').default
const { diaryToday, shiftDiaryDate } = require('@/utils/diaryDate')

jest.mock('@/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() } }))

function evaluate(code) {
  const transformed = transformSync(code, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code
  const module = { exports: {} }
  new Function('require', 'module', 'exports', transformed)(request => request.endsWith('.vue')
    ? { __esModule: true, default: { render: () => null } } : require(request), module, module.exports)
  return module.exports
}
const filename = path.resolve(__dirname, '../../src/pages/diary.vue')
const { descriptor } = parse(fs.readFileSync(filename, 'utf8'), { filename })
const Diary = evaluate(compileScript(descriptor, { id: 'diary-test' }).content).default
Diary.render = evaluate(compileTemplate({ source: descriptor.template.content, filename, id: 'diary-test' }).code).render

let app, router, vm, dispatch
const A = { id: 1, diaryDate: '2026-11-18', content: 'A의 일기', aiAnalysis: null }
const B = { id: 2, diaryDate: '2026-11-17', content: 'B의 일기', aiAnalysis: null }
const analysis = JSON.stringify({ mood: '좋음', moodScore: 8, summary: 'A 분석', keywords: [], comment: '응원' })
const pending = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
async function flush() { for (let i = 0; i < 12; i++) { await Promise.resolve(); await nextTick() } }
async function mount() {
  router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/', redirect: '/diary' },
    { path: '/diary', component: { ...Diary, mounted() { vm = this; Diary.mounted.call(this) } } },
    { path: '/other', component: { render: () => h('div', '다른 화면') } },
  ] })
  dispatch = jest.fn()
  app = createApp({ render: () => h(RouterView) })
  app.config.globalProperties.$store = { dispatch }
  app.use(router)
  await router.push('/diary')
  await router.isReady()
  const host = document.createElement('div'); document.body.appendChild(host)
  app.mount(host)
  await flush()
}
async function type(value) {
  const textarea = document.querySelector('textarea')
  textarea.value = value
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
  await flush()
}
beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-11-17T15:30:00Z'))
  jest.clearAllMocks()
  http.get.mockResolvedValue({ data: [{ ...A }, { ...B }] })
  window.confirm = jest.fn(() => true)
  const modal = document.createElement('div'); modal.id = 'modal'; document.body.appendChild(modal)
})
afterEach(() => { app?.unmount(); app = null; document.body.innerHTML = ''; jest.useRealTimers() })

test('KST today and calendar navigation stay correct across midnight, month and leap day', () => {
  expect(diaryToday(new Date('2026-11-17T14:59:59Z'))).toBe('2026-11-17')
  expect(diaryToday(new Date('2026-11-17T15:00:00Z'))).toBe('2026-11-18')
  expect(shiftDiaryDate('2028-02-28', 1)).toBe('2028-02-29')
  expect(shiftDiaryDate('2026-12-31', 1)).toBe('2027-01-01')
})

test('late analysis for A cannot replace B editor or turn B deletion into A deletion', async () => {
  const response = pending(); http.post.mockReturnValue(response.promise)
  http.delete.mockResolvedValue({})
  await mount()
  document.querySelector('.btn-analyze').click(); await flush()
  document.querySelectorAll('.entry-item')[1].click(); await flush()
  response.resolve({ data: { ...A, aiAnalysis: analysis } }); await flush()
  expect(document.querySelector('textarea').value).toBe(B.content)
  expect(document.querySelector('.date-input').value).toBe(B.diaryDate)
  expect(vm.selectedEntry.id).toBe(B.id)
  expect(vm.entries.find(entry => entry.id === A.id).aiAnalysis).toBe(analysis)
  document.querySelector('.btn-delete').click(); await flush()
  expect(http.delete).toHaveBeenCalledWith('/api/diary/2')
})

test('analysis of a selected entry never overwrites new typing; saving waits for analysis', async () => {
  const response = pending(); http.post.mockReturnValue(response.promise)
  await mount()
  document.querySelector('.btn-analyze').click(); await flush()
  await type('분석 중 새로 작성한 본문')
  expect(document.querySelector('.btn-save').disabled).toBe(true)
  response.resolve({ data: { ...A, aiAnalysis: analysis } }); await flush()
  expect(vm.content).toBe('분석 중 새로 작성한 본문')
  expect(vm.isDirty).toBe(true)
  expect(document.querySelector('.analysis-card')).toBeNull()
  expect(document.querySelector('.btn-analyze').disabled).toBe(true)
})

test('canceling entry/date/route changes keeps the draft and restores the date input', async () => {
  await mount(); await type('잃으면 안 되는 초안')
  window.confirm.mockReturnValue(false)
  document.querySelectorAll('.entry-item')[1].click(); await flush()
  expect(vm.selectedEntry.id).toBe(A.id)
  const date = document.querySelector('.date-input'); date.value = B.diaryDate
  date.dispatchEvent(new Event('change', { bubbles: true })); await flush()
  expect(date.value).toBe(A.diaryDate)
  document.querySelector('.date-nav').click(); await flush()
  expect(vm.selectedDate).toBe(A.diaryDate)
  await router.push('/other'); await flush()
  expect(router.currentRoute.value.path).toBe('/diary')
  expect(vm.content).toBe('잃으면 안 되는 초안')
  window.confirm.mockReturnValue(true)
  await router.push('/other'); await flush()
  expect(router.currentRoute.value.path).toBe('/other')
})

test('tab close warns only for an unsaved draft and the listener is removed on unmount', async () => {
  await mount()
  let event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event); expect(event.defaultPrevented).toBe(false)
  await type('닫기 전 저장 필요')
  event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event); expect(event.defaultPrevented).toBe(true)
  app.unmount(); app = null
  event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event); expect(event.defaultPrevented).toBe(false)
})

test('save uses the returned entry, preserves date/content and enables immediate analysis without another list request', async () => {
  await mount(); await type('수정해 저장한 일기')
  const response = pending(); http.post.mockReturnValue(response.promise)
  document.querySelector('.btn-save').click(); await flush()
  document.querySelectorAll('.entry-item')[1].click(); await flush()
  expect(vm.selectedEntry.id).toBe(A.id)
  response.resolve({ data: { ...A, content: '수정해 저장한 일기' } }); await flush()
  expect(http.post).toHaveBeenCalledWith('/api/diary', { diaryDate: A.diaryDate, content: '수정해 저장한 일기' })
  expect(http.get).toHaveBeenCalledTimes(1)
  expect(vm.selectedEntry.id).toBe(A.id)
  expect(vm.content).toBe('수정해 저장한 일기')
  expect(vm.isDirty).toBe(false)
  expect(document.querySelector('.btn-analyze').disabled).toBe(false)
})

test('failed save retains the draft and a slow initial list does not overwrite typing', async () => {
  const initial = pending(); http.get.mockReturnValue(initial.promise)
  await mount(); await type('목록 로딩 중 작성')
  initial.resolve({ data: [{ ...A }, { ...B }] }); await flush()
  expect(vm.content).toBe('목록 로딩 중 작성')
  http.post.mockRejectedValue(new Error('offline'))
  document.querySelector('.btn-save').click(); await flush()
  expect(vm.content).toBe('목록 로딩 중 작성')
  expect(vm.isDirty).toBe(true)
  expect(dispatch).toHaveBeenCalledWith('toast/showToast', expect.objectContaining({ type: 'error' }))
})

test('today button recalculates KST day after an overnight open tab and asks before discarding', async () => {
  await mount(); await type('밤에 쓰던 일기')
  jest.setSystemTime(new Date('2026-11-18T15:00:01Z'))
  window.confirm.mockReturnValue(false)
  document.querySelector('.new-entry-btn').click(); await flush()
  expect(vm.selectedDate).toBe('2026-11-18')
  window.confirm.mockReturnValue(true)
  document.querySelector('.new-entry-btn').click(); await flush()
  expect(vm.selectedDate).toBe('2026-11-19')
  expect(vm.content).toBe('')
})
