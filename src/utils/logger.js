// 환경별 로깅 래퍼.
// - 개발(NODE_ENV !== 'production')에서는 콘솔 출력
// - 운영에서는 silent. 필요 시 이곳에 외부 로깅 서비스(Sentry 등) 연동 지점.
//
// 이 유틸을 통해 console 직접 호출을 한 곳에서 통제하여 eslint-disable 주석 흩어지는 것을 방지한다.

const isDev = process.env.NODE_ENV !== "production";

/* eslint-disable no-console */
export const logger = {
  error(...args) {
    if (isDev) console.error(...args);
  },
  warn(...args) {
    if (isDev) console.warn(...args);
  },
  info(...args) {
    if (isDev) console.info(...args);
  },
  debug(...args) {
    if (isDev) console.debug(...args);
  },
};
/* eslint-enable no-console */

export default logger;
