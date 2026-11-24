import { browseRecords, recordYears } from '@/utils/timelineBrowse';

const records = [
  { id: 1, date: '2024-05-03' },
  { id: 2, dateType: 'range', startDate: '2022-12-25', endDate: '2023-01-03' },
  { id: 3, date: '2023-06-01' },
];
test('year choices include each year crossed by a period record', () => {
  expect(recordYears(records)).toEqual(['2024', '2023', '2022']);
});
test('year filtering includes overlapping ranges and sorts without mutating source', () => {
  expect(browseRecords(records, '2023', 'newest').map(r => r.id)).toEqual([3, 2]);
  expect(browseRecords(records, '2023', 'oldest').map(r => r.id)).toEqual([2, 3]);
  expect(records.map(r => r.id)).toEqual([1, 2, 3]);
  expect(browseRecords(records, '2020', 'newest')).toEqual([]);
});
