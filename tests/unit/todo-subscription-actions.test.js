/** @jest-environment jsdom */
const fs = require('fs');
const path = require('path');
const { parse, compileScript, compileTemplate } = require('@vue/compiler-sfc');
const { transformSync } = require('@babel/core');
const { createApp, nextTick } = require('vue');
const http = require('@/axios').default;
const mockPush = jest.fn();
jest.mock('@/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }));
jest.mock('vue-router', () => ({ useRoute: () => ({ params: {} }), useRouter: () => ({ push: mockPush }) }));
jest.mock('@/composables/toast', () => ({ useToast: () => ({ showToast: jest.fn() }) }));
jest.mock('@/utils/logger', () => ({ logger: { error: jest.fn() } }));

function component(relative) {
  const filename = path.resolve(__dirname, '../../src', relative);
  const { descriptor } = parse(fs.readFileSync(filename, 'utf8'), { filename });
  const script = compileScript(descriptor, { id: relative });
  const template = compileTemplate({ source: descriptor.template.content, filename, id: relative });
  const source = script.content + '\n' + template.code + '\n__componentRender = render;';
  const { code } = transformSync(source, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] });
  const module = { exports: {} };
  const render = new Function('require', 'module', 'exports', 'let __componentRender;\n' + code + '\nreturn __componentRender;')(
    request => request.endsWith('.vue') ? { __esModule: true, default: { template: '<div />' }, CYCLE_OPTIONS: [], CATEGORY_OPTIONS: [], COLOR_OPTIONS: [] } : require(request), module, module.exports);
  return { ...module.exports.default, render };
}
let app;
async function flush() { for (let i = 0; i < 8; i++) { await Promise.resolve(); await nextTick(); } }
async function mount(relative) {
  document.body.innerHTML = '<div id="modal"></div>';
  const host = document.createElement('div'); document.body.append(host);
  app = createApp(component(relative)); const vm = app.mount(host); await flush(); return vm;
}
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
beforeEach(() => { jest.clearAllMocks(); localStorage.clear(); http.get.mockResolvedValue({ data: [], headers: {} }); });
afterEach(() => { app?.unmount(); document.body.innerHTML = ''; });

test('Todo rapid saves send one POST; failure releases lock and keeps entered text for retry', async () => {
  const vm = await mount('components/TodoForm.vue'); vm.todo.title = 'Keep this';
  const pending = deferred(); http.post.mockReturnValueOnce(pending.promise);
  const first = vm.onSave(); const second = vm.onSave(); await flush();
  expect(http.post).toHaveBeenCalledTimes(1); expect(vm.saving).toBe(true);
  expect(document.querySelector('fieldset').disabled).toBe(true);
  pending.reject(new Error('offline')); await Promise.all([first, second]);
  expect(vm.saving).toBe(false); expect(vm.todo.title).toBe('Keep this');
  http.post.mockResolvedValueOnce({ data: {} }); await vm.onSave();
  expect(http.post).toHaveBeenCalledTimes(2); expect(mockPush).toHaveBeenCalledWith('/todos');
});

test('Subscription rapid save and modal close cannot interrupt pending save; failure can retry', async () => {
  const vm = await mount('pages/subscription.vue'); vm.openCreateModal();
  vm.currentSubscription.name = 'Service'; vm.currentSubscription.amount = 1200;
  const pending = deferred(); http.post.mockReturnValueOnce(pending.promise);
  const first = vm.saveSubscription(); const second = vm.saveSubscription(); vm.closeFormModal();
  expect(http.post).toHaveBeenCalledTimes(1); expect(vm.showFormModal).toBe(true);
  pending.reject(new Error('offline')); await Promise.all([first, second]);
  expect(vm.saving).toBe(false); expect(vm.currentSubscription.name).toBe('Service');
  http.post.mockResolvedValueOnce({ data: {} }); await vm.saveSubscription();
  expect(http.post).toHaveBeenCalledTimes(2); expect(vm.showFormModal).toBe(false);
});

test('Todo bulk confirmation freezes all-page preview IDs even when filters change, and prevents double delete', async () => {
  const vm = await mount('pages/todos/index.vue'); vm.categoryFilter = 'work';
  http.get.mockResolvedValueOnce({ data: { ids: [11, 12], count: 2 } });
  await vm.openBulkDeleteModal();
  expect(http.get).toHaveBeenLastCalledWith('/api/todos/completed/preview', { params: { q: '', priority: null, category: 'work' } });
  vm.categoryFilter = 'home'; const pending = deferred(); http.delete.mockReturnValueOnce(pending.promise);
  const first = vm.confirmBulkDelete(); const second = vm.confirmBulkDelete(); vm.closeBulkDeleteModal();
  expect(vm.showBulkDeleteModal).toBe(true);
  expect(http.delete).toHaveBeenCalledTimes(1);
  expect(http.delete).toHaveBeenCalledWith('/api/todos/completed', { data: { ids: [11, 12] } });
  pending.resolve({ data: { deleted: 2 } }); await Promise.all([first, second]);
  expect(vm.showBulkDeleteModal).toBe(false);
});
