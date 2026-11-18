import http from '@/axios';

const COMPLETED_URL = '/api/todos/completed';

export const previewCompletedTodos = filters => http.get(`${COMPLETED_URL}/preview`, { params: filters });
export const deleteCompletedTodos = ids => http.delete(COMPLETED_URL, { data: { ids } });
