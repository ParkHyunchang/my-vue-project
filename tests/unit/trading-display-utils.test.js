import { tradingTimestamp, kstDayKey, isTradingToday } from '@/utils/tradingTime';
import { createTradingAlertDelivery } from '@/utils/tradingAlertDelivery';
import menuModule from '@/store/modules/menu';

test('KST day boundaries do not depend on the browser timezone', () => {
  expect(tradingTimestamp('2026-11-25T00:00:00')).toBe(Date.parse('2026-11-24T15:00:00Z'));
  expect(kstDayKey('2026-11-24T15:00:00Z')).toBe('2026-11-25');
  const now = Date.parse('2026-11-25T01:00:00+09:00');
  expect(isTradingToday('2026-11-24T23:59:59', now)).toBe(false);
  expect(isTradingToday('2026-11-25T00:00:00', now)).toBe(true);
  expect(isTradingToday('2026-11-25T02:00:00', now)).toBe(false);
  expect(isTradingToday('', now)).toBe(false);
  expect(kstDayKey('invalid')).toBe('');
});

test('alerts deduplicate repeated polls but notify again after an observed recovery', async () => {
  const delivery = createTradingAlertDelivery(), send = jest.fn();
  await delivery.sync([{ id: 'unknown' }], false, send); expect(send).not.toHaveBeenCalled();
  await delivery.sync([{ id: 'unknown' }], true, send);
  await delivery.sync([{ id: 'unknown', message: 'changed count' }], true, send);
  expect(send).toHaveBeenCalledTimes(1);
  await delivery.sync([], true, send);
  await delivery.sync([{ id: 'unknown' }], true, send);
  expect(send).toHaveBeenCalledTimes(2);
});

test('overlapping delivery reserves incidents and a failed notification can retry', async () => {
  const delivery = createTradingAlertDelivery();
  let release; const pending = new Promise(resolve => { release = resolve; });
  const send = jest.fn(() => pending);
  const first = delivery.sync([{ id: 'connection' }], true, send);
  await delivery.sync([{ id: 'connection' }], true, send);
  expect(send).toHaveBeenCalledTimes(1); release(); await first;
  const failing = jest.fn().mockRejectedValueOnce(new Error('permission')).mockResolvedValueOnce();
  await expect(delivery.sync([{ id: 'risk' }], true, failing)).rejects.toThrow('permission');
  await delivery.sync([{ id: 'risk' }], true, failing); expect(failing).toHaveBeenCalledTimes(2);
});

test('retired stock labels change without modifying menu permissions or custom labels', () => {
  const state = { allMenus: [] };
  menuModule.mutations.SET_ALL_MENUS(state, [{ path: '/stock', name: '주식 대시보드', navLabel: '주식', defaultRoles: ['ADMIN'] }, { path: '/history', name: '히스토리' }]);
  expect(state.allMenus[0]).toMatchObject({ name: '자동매매', navLabel: '자동매매', defaultRoles: ['ADMIN'] });
  expect(state.allMenus[1].name).toBe('히스토리');
  menuModule.mutations.SET_ALL_MENUS(state, [{ path: '/stock', name: '내 투자', navLabel: '운영' }]);
  expect(state.allMenus[0].name).toBe('내 투자');
});
