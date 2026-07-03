/**
 * 백엔드 에러를 사용자 토스트 문구로 변환.
 *
 * 우선순위:
 *  1) 403 → 서버가 보낸 권한 차단 사유, 없으면 "권한이 없습니다."
 *  2) 서버가 보낸 사용자용 메시지(string body 또는 { message })가 있으면 그대로 사용
 *  3) 응답이 없거나 비어있는 경우 → 네트워크/타임아웃/서버 오류 힌트를 fallback에 덧붙임
 *  4) 그 외 → fallback
 */
export function apiErrorMessage(err, fallback) {
  const status = err?.response?.status;
  const data = err?.response?.data;
  const code = err?.code;
  const rawText = typeof data === 'string'
    ? data
    : (data && typeof data === 'object' && typeof data.message === 'string'
      ? data.message
      : null);
  // 리버스 프록시(Synology 등)가 반환한 HTML 에러 페이지는 사용자 문구가 아님 — 폐기
  const looksLikeHtml = rawText && /^\s*(<!doctype|<html|<head|<body)/i.test(rawText);
  const serverMsg = looksLikeHtml || (rawText && rawText.length > 300) ? null : rawText;

  if (status === 403) {
    return serverMsg || '권한이 없습니다.';
  }
  // 401은 서버가 "Unauthorized"라는 모호한 문구를 주므로 사용자용으로 치환
  if (status === 401) {
    return '세션이 만료되었거나 로그인이 필요합니다. 다시 로그인해주세요.';
  }
  if (serverMsg) {
    return serverMsg;
  }

  // 서버 메시지가 없는 경우: 원인을 분류해서 사용자에게 힌트 제공
  if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
    return `${fallback} (요청 시간이 초과되었습니다)`;
  }
  if (code === 'ERR_NETWORK' || !err?.response) {
    return `${fallback} (서버에 연결할 수 없습니다)`;
  }
  if (typeof status === 'number') {
    if (status === 502 || status === 504 || status === 408) {
      return `${fallback} (서버 응답 대기 시간이 초과되었습니다 — 잠시 후 다시 시도해주세요)`;
    }
    if (status >= 500) return `${fallback} (서버 오류 ${status})`;
    if (status === 404) return `${fallback} (대상을 찾을 수 없습니다)`;
    if (status === 409) return `${fallback} (중복되거나 충돌하는 데이터가 있습니다)`;
    if (status >= 400) return `${fallback} (요청 오류 ${status})`;
  }
  return fallback;
}
