export function recordDates(record) {
  const start = record.dateType === 'range' ? record.startDate : record.date;
  const end = record.dateType === 'range' ? record.endDate || start : start;
  return [String(start || '').slice(0, 10), String(end || '').slice(0, 10)];
}

export function recordYears(records) {
  const years = new Set();
  records.forEach(record => {
    const [start, end] = recordDates(record);
    const first = Number(start.slice(0, 4));
    const last = Number(end.slice(0, 4));
    if (!first || !last || first > last) return;
    for (let year = first; year <= last; year++) years.add(String(year));
  });
  return [...years].sort((a, b) => Number(b) - Number(a));
}

export function browseRecords(records, year, order) {
  return records.filter(record => {
    if (!year) return true;
    const [start, end] = recordDates(record);
    return start <= `${year}-12-31` && end >= `${year}-01-01`;
  }).slice().sort((a, b) => {
    const left = recordDates(a)[0];
    const right = recordDates(b)[0];
    if (!left && !right) return 0;
    if (!left) return 1;
    if (!right) return -1;
    return order === 'oldest' ? left.localeCompare(right) : right.localeCompare(left);
  });
}
