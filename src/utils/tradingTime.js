// The deployed backend uses TZ=Asia/Seoul. Legacy LocalDateTime values have no offset.
export function tradingTimestamp(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  if (value instanceof Date) return value.getTime();
  if (typeof value !== 'string' || !value.trim()) return NaN;
  const text = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) return NaN;
  const zoned = /(?:Z|[+-]\d{2}:\d{2})$/.test(text) ? text : `${text}+09:00`;
  return Date.parse(zoned);
}
export function kstDayKey(value = Date.now()) {
  const time = tradingTimestamp(value);
  return Number.isFinite(time) ? new Date(time + 9 * 60 * 60 * 1000).toISOString().slice(0, 10) : '';
}
export function isTradingToday(value, now = Date.now()) {
  const time = tradingTimestamp(value), current = tradingTimestamp(now);
  return Number.isFinite(time) && Number.isFinite(current) && time <= current && kstDayKey(time) === kstDayKey(current);
}
