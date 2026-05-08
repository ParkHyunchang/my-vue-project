/**
 * 백엔드가 보낸 에러 메시지를 안전하게 사용자 토스트 문구로 변환.
 *
 * 동작:
 * - 403: 서버가 보낸 메시지(권한 차단 사유) 우선, 없으면 기본 권한 거부 문구.
 * - 그 외: 서버 메시지가 string이거나 { message } 형태면 그대로 사용, 아니면 fallback.
 *
 * 백엔드 컨트롤러는 권한 차단 시 401/403 + plain string body를 반환합니다.
 * (예: ResponseEntity.status(FORBIDDEN).body("삭제 권한이 없습니다."))
 */
export function apiErrorMessage(err, fallback) {
  const status = err?.response?.status;
  const data = err?.response?.data;
  const serverMsg = typeof data === 'string'
    ? data
    : (data && typeof data === 'object' && typeof data.message === 'string'
      ? data.message
      : null);

  if (status === 403) {
    return serverMsg || '권한이 없습니다.';
  }
  return serverMsg || fallback;
}
