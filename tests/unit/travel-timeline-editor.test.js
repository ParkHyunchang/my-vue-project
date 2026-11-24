/** @jest-environment jsdom */
const fs = require('fs');
const path = require('path');
const { parse, compileScript, compileTemplate } = require('@vue/compiler-sfc');
const { transformSync } = require('@babel/core');
const { createApp, nextTick } = require('vue');
const http = require('@/axios').default;
const mockShowToast = jest.fn();

jest.mock('@/axios', () => ({ __esModule: true, default: {
  defaults: { baseURL: '' }, post: jest.fn(), delete: jest.fn(),
} }));
jest.mock('vuex', () => ({ useStore: () => ({ getters: {
  'auth/canCreate': () => true, 'auth/canUpdate': () => true, 'auth/canDelete': () => true,
} }) }));
jest.mock('@/composables/toast', () => ({ useToast: () => ({ showToast: mockShowToast }) }));
jest.mock('@/composables/useMidnightTicker', () => ({ useMidnightTicker: () => ({ nowTick: { value: Date.now() } }) }));
jest.mock('vue-router', () => ({ onBeforeRouteLeave: jest.fn() }));

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
  jest.spyOn(window, 'confirm').mockReturnValue(true);
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

test('cancelled discard keeps draft and prevents closing or deletion', () => {
  jest.spyOn(window, 'confirm').mockReturnValue(false);
  const onClose = jest.fn(), onRequestDelete = jest.fn();
  const vm = mount(component('components/timeline/TimelineFormModal.vue', false), {
    show: true, menuPath: '/history', apiPath: '/api/histories', onClose, onRequestDelete,
  });
  vm.localMemory.title = '작성 중인 기록';
  vm.requestClose(); vm.requestDelete();
  expect(onClose).not.toHaveBeenCalled();
  expect(onRequestDelete).not.toHaveBeenCalled();
  expect(vm.localMemory.title).toBe('작성 중인 기록');
});

test('partial upload keeps successes and stays locked until every request settles', async () => {
  let finish;
  http.post.mockRejectedValueOnce(new Error('connection lost'));
  http.post.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const vm = mount(component('components/timeline/TimelineFormModal.vue', false), {
    show: true, menuPath: '/history', apiPath: '/api/histories',
  });
  const pending = vm.handleFileUpload({ target: { files: [
    new File(['a'], 'failed.jpg', { type: 'image/jpeg' }),
    new File(['b'], 'kept.jpg', { type: 'image/jpeg' }),
  ] } });
  await flush();
  expect(vm.uploading).toBe(true);
  finish({ data: '/uploads/kept.jpg' });
  await pending;
  expect(vm.localMemory.images).toEqual(['/uploads/kept.jpg']);
  expect(vm.uploading).toBe(false);
  expect(http.delete).not.toHaveBeenCalled();
});

test('upload failures explain file validation and proxy size limits without showing HTML', async () => {
  http.post.mockRejectedValueOnce({ response: { status: 413, data: '<html>private proxy details</html>' } });
  const vm = mount(component('components/timeline/TimelineFormModal.vue', false), {
    show: true, menuPath: '/history', apiPath: '/api/histories',
  });
  await vm.handleFileUpload({ target: { files: [
    new File(['text'], 'notes.txt', { type: 'text/plain' }),
    new File(['image'], 'large.jpg', { type: 'image/jpeg' }),
  ] } });
  const message = mockShowToast.mock.calls.find(call => call[1] === 'danger')[0];
  expect(message).toContain('notes.txt');
  expect(message).toContain('이미지 또는 동영상');
  expect(message).toContain('large.jpg');
  expect(message).toContain('용량 제한');
  expect(message).not.toContain('<html>');
  expect(message).not.toContain('private proxy');
});
