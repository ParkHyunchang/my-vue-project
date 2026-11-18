import api from '@/axios'

const DIARY_PATH = '/api/diary'

/** Diary responses contain id, diaryDate (YYYY-MM-DD), content and optional aiAnalysis. */
export const diaryApi = {
  list: () => api.get(DIARY_PATH),
  save: ({ diaryDate, content }) => api.post(DIARY_PATH, { diaryDate, content }),
  analyze: id => api.post(`${DIARY_PATH}/${id}/analyze`),
  remove: id => api.delete(`${DIARY_PATH}/${id}`),
}
