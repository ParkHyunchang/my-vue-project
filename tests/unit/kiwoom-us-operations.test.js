const { usTodayOperations, usPendingOrder, usOrderLabel } = require('@/utils/kiwoomUsOperations');

const now = Date.parse('2026-11-24T15:30:00Z'); // 2026-11-25 00:30 KST
const row = (eventType, createdAt, id) => ({ eventType, createdAt, id });
test('US displayed daily counts use KST and only supplied audit events, excluding old, missing and future dates', () => {
  const source = [row('DECISION_RESULT', '2026-11-25T00:01:00', 1), row('BUY_ORDER', '2026-11-24T15:02:00Z', 2),
    row('SELL_FILLED', '2026-11-25T00:03:00+09:00', 3), row('ORDER_UNKNOWN', '2026-11-25T00:04:00', 4),
    row('BUY_FILLED', '2026-11-24T23:59:59', 5), row('BUY_ORDER', null, 6), row('BUY_ORDER', '2026-11-25T01:00:00', 7)];
  const result = usTodayOperations(source, now);
  expect(result).toMatchObject({ decisions: 1, orders: 1, fills: 1, blocks: 1 });
  expect(result.items.map(item => item.id)).toEqual([4, 3, 2, 1]);
  expect(source[0].id).toBe(1); // sorting must not mutate source history
});
test('US event type aliases count fill records, not quantity, and an empty loaded set means zero known events', () => {
  expect(usTodayOperations([{ type: 'BUY_FILLED', createdAt: '2026-11-25T00:01:00', quantity: 150 }], now).fills).toBe(1);
  expect(usTodayOperations([], now)).toMatchObject({ decisions: 0, orders: 0, fills: 0, blocks: 0 });
});
test.each(['SUBMITTING', 'ORDERED', 'PARTIALLY_FILLED', 'CANCEL_REQUESTED', 'UNKNOWN'])('unresolved %s stays in pending operations', status => {
  expect(usPendingOrder({ status })).toBe(true);
});
test.each(['FILLED', 'PARTIALLY_FILLED_CANCELED', 'CANCELED', 'FAILED'])('resolved %s is not pending', status => {
  expect(usPendingOrder({ status })).toBe(false);
});
test('unrecognized order state is visibly unknown rather than filled or canceled', () => {
  expect(usOrderLabel('new-broker-state')).toBe('상태 확인 필요');
});
