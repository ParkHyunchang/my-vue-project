/** @jest-environment jsdom */
const fs = require('fs');
const path = require('path');
const { parse, compileScript, compileTemplate } = require('@vue/compiler-sfc');
const { transformSync } = require('@babel/core');
const { createApp, nextTick } = require('vue');
const http = require('@/axios').default;

jest.mock('@/axios', () => ({ __esModule: true, default: {
  defaults: { baseURL: '' }, post: jest.fn(), delete: jest.fn(),
} }));
jest.mock('vuex', () => ({ useStore: () => ({ getters: {
  'auth/canCreate': () => true, 'auth/canUpdate': () => true, 'auth/canDelete': () => true,
} }) }));
jest.mock('@/composables/toast', () => ({ useToast: () => ({ showToast: jest.fn() }) }));
jest.mock('@/composables/useMidnightTicker', () => ({ useMidnightTicker: () => ({ nowTick: { value: Date.now() } }) }));

function component(relative, template = true) {
  const filename = path.resolve(__dirname, '../../src', relative);
  const { descriptor } = parse(fs.readFileSync(filename, 'utf8'), { filename });
  function evaluate(code) {
    const transformed = transformSync(code, { configFile: false, babelrc: false,
      plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
    const module = { exports: {} };
    new Function('require', 'module', 'exports', transformed)((request) => {
      if (request.endsWith('.vue') || request === 'heic2any') {
        return { __esModule: true, default: { render: () => null } };
      }
      return require(request.startsWith('.') ? path.resolve(path.dirname(filename), request) : request);
    }, module, module.exports);
    return module.exports;
  }
  const result = evaluate(compileScript(descriptor, { id: 'editor-test' }).content).default;
  result.render = template ? evaluate(compileTemplate({ source: descriptor.template.content,
    filename, id: 'editor-test' }).code).render : () => null;
  return result;
}
let app;
async function flush() { for (let i = 0; i < 8; i++) { await Promise.resolve(); await nextTick(); } }
function mount(type, props) {
  const host = document.createElement('div'); document.body.appendChild(host);
  app = createApp(type, props);
  return app.mount(host);
}
afterEach(() => { app?.unmount(); document.body.innerHTML = ''; jest.resetAllMocks(); });

test('travel saves and displays the generation snapshot despite edits before and after response', async () => {
  let resolve;
  http.post.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  const vm = mount(component('components/travel/PlannerPanel.vue'));
  vm.form.destination = '오사카'; vm.form.days = 3; vm.form.style = ['맛집'];
  const pending = vm.generate();
  vm.form.destination = '제주'; vm.form.days = 5; vm.form.style.push('자연');
  resolve({ data: { plan: { title: '오사카 여행', days: [{ day: 1, items: [] }] } } });
  await pending; await flush();
  expect(document.body.textContent).toContain('생성 기준: 오사카 · 3일');
  http.post.mockResolvedValue({});
  await vm.saveToItinerary();
  expect(http.post).toHaveBeenLastCalledWith('/api/travel/itinerary', expect.objectContaining({ destination: '오사카', days: 3 }));
  await vm.saveToWishlist();
  expect(http.post).toHaveBeenLastCalledWith('/api/travel/wishlist', expect.objectContaining({ title: '오사카', memo: '오사카 여행\n스타일: 맛집' }));
});

test('removing media only stages deletion; cancel and reopen restore originals', async () => {
  const original = { id: 1, title: '기록', date: '2020-01-01', category: 'travel',
    images: ['/old.jpg'], dateType: 'single' };
  const onSave = jest.fn(), onClose = jest.fn();
  const type = component('components/timeline/TimelineFormModal.vue', false);
  const vm = mount(type, { show: true, memory: original, menuPath: '/history',
    apiPath: '/api/histories', isEditing: true, onSave, onClose });
  vm.confirmRemoveImage(0); vm.removeImage();
  expect(vm.localMemory.images).toEqual([]);
  expect(original.images).toEqual(['/old.jpg']);
  expect(http.delete).not.toHaveBeenCalled();
  vm.onSave();
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ images: '[]', image: null }), ['/old.jpg']);
  vm.requestClose(); expect(onClose).toHaveBeenCalled();
  app.unmount();
  const reopened = mount(type, { show: true, memory: original, menuPath: '/history', apiPath: '/api/histories' });
  expect(reopened.localMemory.images).toEqual(['/old.jpg']);
});
