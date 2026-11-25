import http from '@/axios';

const MANUAL_RECORDS_PATH = '/api/portfolio/manual-records';
export const fetchManualRecordsSummary = () => http.get(`${MANUAL_RECORDS_PATH}/summary`);
export const deleteManualRecords = () => http.delete(MANUAL_RECORDS_PATH, {
  data: { confirmation: 'DELETE_MANUAL_RECORDS' },
});
