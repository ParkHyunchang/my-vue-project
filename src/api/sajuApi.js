import http from '@/axios'

// OpenAPI 타입 참조 — `npm run gen:api` 실행 후 src/generated/api.d.ts 가 생성되면 활성화됨.
/** @typedef {import('@/generated/api').components['schemas']['SajuProfileResponse']} SajuProfileResponse */
/** @typedef {import('@/generated/api').components['schemas']['SajuAnalysisResponse']} SajuAnalysisResponse */

const CALCULATE_PATH = '/api/saju/calculate'
const PROFILES_PATH = '/api/saju/profiles'

const profilePath = (id) => `${PROFILES_PATH}/${encodeURIComponent(id)}`

/**
 * 생년월일시 요청 페이로드.
 * { label, calendarType: 'SOLAR'|'LUNAR', birthDate, lunarYear, lunarMonth, lunarDay, leapMonth, birthTime, timeUnknown }
 * calendarType이 'LUNAR'면 lunarYear/lunarMonth/lunarDay 필수, 'SOLAR'면 birthDate 필수.
 * @typedef {Object} SajuBirthPayload
 */

/**
 * 즉석 계산 — 저장 없이 사주팔자 계산 + AI 해석.
 * 응답: SajuAnalysisResponse — { found, blocked, message, palja, report, providerName, model, analyzedAt, retryAt, profileId }
 * @param {SajuBirthPayload} payload
 */
export function calculateSaju(payload) {
  return http.post(CALCULATE_PATH, payload)
}

/**
 * 저장된 사주 프로필 전체 조회.
 * 응답: SajuProfileResponse[] — { id, label, birthDate, birthTime, timeUnknown, calendarType,
 *   lunarYear, lunarMonth, lunarDay, leapMonth, paljaJson, lastReportMarkdown, analyzedAt, createdAt, updatedAt }
 */
export function fetchSajuProfiles() {
  return http.get(PROFILES_PATH)
}

/**
 * 사주 프로필 저장 (계산 + AI 해석 포함). 응답은 SajuAnalysisResponse.
 * @param {SajuBirthPayload} payload
 */
export function createSajuProfile(payload) {
  return http.post(PROFILES_PATH, payload)
}

/**
 * 사주 프로필 수정 (계산 + AI 재해석 포함). 응답은 SajuAnalysisResponse.
 * @param {number} id
 * @param {SajuBirthPayload} payload
 */
export function updateSajuProfile(id, payload) {
  return http.put(profilePath(id), payload)
}

/**
 * 저장된 프로필 재해석 (AI 재호출). 응답은 SajuAnalysisResponse.
 * @param {number} id
 */
export function reanalyzeSajuProfile(id) {
  return http.post(`${profilePath(id)}/reanalyze`)
}

/**
 * 사주 프로필 삭제.
 * @param {number} id
 */
export function deleteSajuProfile(id) {
  return http.delete(profilePath(id))
}
