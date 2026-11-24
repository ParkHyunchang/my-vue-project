/** @jest-environment jsdom */
import { createApp, reactive, ref, nextTick } from 'vue';
import { useTimelineBrowse } from '@/composables/useTimelineBrowse';

let mockRoute;
const mockReplace = jest.fn();
jest.mock('vue-router', () => ({ useRoute: () => mockRoute, useRouter: () => ({ replace: mockReplace }) }));
let app;
function mount(query = {}) {
  mockRoute = reactive({ path: '/history', query });
  const search = ref(''), category = ref('all'), media = ref('all');
  let flow;
  app = createApp({ setup() {
    flow = useTimelineBrowse(ref([]), search, category, media, [{ id: 'all' }, { id: 'travel' }]);
    return () => null;
  } });
  app.mount(document.createElement('div'));
  return { flow, search, category, media };
}
beforeEach(() => { jest.useFakeTimers(); mockReplace.mockReset(); });
afterEach(() => { app?.unmount(); jest.useRealTimers(); });

test('restores valid deep-link search, media, year and order without persistent storage', () => {
  const c = mount({ q: '제주', category: 'travel', media: 'image', year: '2023', order: 'oldest' });
  expect(c.search.value).toBe('제주');
  expect(c.category.value).toBe('travel');
  expect(c.media.value).toBe('image');
  expect(c.flow.selectedYear.value).toBe('2023');
  expect(c.flow.sortOrder.value).toBe('oldest');
});
test('writes filter state with replace and retains unrelated query keys', async () => {
  const c = mount({ source: 'bookmark' });
  c.search.value = ' 부산 '; c.flow.selectedYear.value = '2024';
  await nextTick(); jest.advanceTimersByTime(250);
  expect(mockReplace).toHaveBeenCalledWith({ query: { source: 'bookmark', q: ' 부산 ', year: '2024' } });
});
test('back navigation restores conditions and pending timers cannot change another page', async () => {
  const c = mount({ q: '제주' });
  mockRoute.query = { q: '서울', year: '2022' };
  await nextTick();
  expect(c.search.value).toBe('서울');
  expect(c.flow.selectedYear.value).toBe('2022');
  c.search.value = '새 검색'; await nextTick();
  mockRoute.path = '/dating'; jest.advanceTimersByTime(250);
  expect(mockReplace).not.toHaveBeenCalled();
});
