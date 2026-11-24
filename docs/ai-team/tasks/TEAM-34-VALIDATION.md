# TEAM-34 디자인 검증

- 검증일: 2026-11-24
- 담당: 검증 서브에이전트(실제 diff 독립 검토·격리 테스트·브라우저 계측), 총괄(스크린샷 직접 시각 검토).
- 범위: 프론트 디자인 변경. 백엔드 실행·운영 DB·실계좌·주문·배포 없음.

## 판정

대표 화면의 데스크톱·모바일 렌더링과 주요 메뉴 키보드 동작을 확인했다. 격리 단위 테스트와 lint가 통과했다. 모든 라우트와 실제 서버 데이터의 E2E를 완료한 것은 아니다.

| 완료 기준 | 방법 | 결과 및 근거 |
|---|---|---|
| AC-1 일관된 디자인 | 실제 소스 기반 1440×1000 / 390×844 Chromium 캡처, 총괄 직접 시각 확인 | 홈·로그인·일기·Todo·주식·여행·구독·관리자 대표 화면 확인. 홈 모바일 2열과 관리자 모달 폭을 발견해 수정 후 재확인 |
| AC-2 기능·상태 보존 | Jest 전체, diff 검토, 합성 정상/빈/실패 응답 | 14 suites / 152 tests 통과. 홈 정상/빈 목록/503 오류 캡처. Todo 삭제 모달 Escape 닫기 두 해상도 통과. 실제 저장·서버 권한·운영 데이터는 미검증 |
| AC-3 모바일·키보드 | 브라우저 DOM 너비 계측, Enter/Tab/Escape 조작 | 20개 화면 시나리오·27개 캡처 체크포인트에서 문서 가로 넘침 0. 모바일 메인 메뉴 Enter 열기/Escape 닫기·버튼 복귀, 관리자 사이드바 Enter 열기/Tab 순환/Escape 복귀 통과 |
| AC-4 정적·자동 검사 | 전체 격리 Jest, 전체 lint, 후속 변경 파일 lint, diff check | 모두 통과. Browserslist 데이터 오래됨 경고와 Git 줄바꿈 안내는 남아 있음 |

## 재현과 증거

1. `npm run serve:isolated`로 127.0.0.1:13100에 실제 Vue 앱을 기동한다. `.env`를 읽지 않고 API 프록시는 loopback 13200으로만 설정된다.
2. `node scripts/design-review.cjs --label=final`을 실행한다. Playwright의 새 브라우저 컨텍스트에서 모든 `/api/`를 합성 응답으로 선제 대체한다. 정의하지 않은 API는 501로 실패시키고 외부 origin, 업로드 경로, 허용하지 않은 요청을 차단한다. 감사 이벤트 POST만 메모리 204 응답하며 저장 요청은 전송하지 않는다.
3. Chromium 시간은 2026-11-24, 한국어·Asia/Seoul·reduced-motion 조건이다. 이 환경의 Windows sandbox는 headless 실행/loopback 접근이 제한돼 자동 승인 검토를 거쳐 별도 권한으로 격리 서버와 브라우저를 실행했다. 설치된 Playwright 브라우저 캐시를 지정했으며 브라우저를 새로 설치하지 않았다.

최종 [계측 보고서](../evidence/TEAM-34/final/report.json): 20개 시나리오 모두 `captured`, 미설정 API 0, pageerror 0, 문서 가로 넘침 0. `captured`는 자동 계측 완료 의미이며 픽셀 디자인의 자동 합격 판정은 아니다.

- [홈 미리보기](../evidence/TEAM-34/final/home-preview.png)
- [모바일 홈](../evidence/TEAM-34/final/home-390.png)
- [모바일 메뉴](../evidence/TEAM-34/final/home-390-menu.png)
- [모바일 관리자 사이드바](../evidence/TEAM-34/final/admin-390-sidebar.png)
- [모바일 관리자 생성 모달](../evidence/TEAM-34/final/admin-390-create-dialog.png)
- [모바일 구독 차트](../evidence/TEAM-34/final/subscription-390.png)

구독 차트의 축 레이블 겹침과 반올림 중복을 총괄이 수정한 뒤 구독 화면만 다시 캡처했으며 최종 보고서·이미지에 반영했다. 별도 [차트 재검증 보고서](../evidence/TEAM-34/chart-final/report.json)와 [최신 모바일 차트 원본](../evidence/TEAM-34/chart-final/subscription-390.png)도 보존했다. 총괄이 최신 차트 이미지를 직접 확인했다.

## 독립 검토에서 수정한 사항

- 관리자 상위 메뉴 활성 CSS가 hash 라우트의 `#/admin`과 일치하지 않던 선택자 수정.
- 밝아진 성공·위험 배경과 기존 흰 글자의 대비 저하: 관리자 hover 및 히스토리/데이트 이미지 삭제 버튼을 어두운 전경으로 수정.
- 전체 캡처 뒤 키보드 상태를 검사하던 초기 계측은 스크린샷/비동기 포커스 반영 타이밍의 영향을 받았다. 키보드 조작을 캡처와 분리하고 상태 반영 뒤 확인한 최종 결과는 모두 통과한다.
- 최초 주식 대역에 빠진 `/api/stock/en-names`는 실제 소비 구조(심볼→영문명 객체)에 맞게 추가 후 재검사했다. 제품 결함으로 분류하지 않았다.

## 실행한 명령

- `npm run test:isolated`: 14 suites / 152 tests PASS, 22.583초.
- `npm run lint -- --no-fix`: PASS.
- `npx --no-install eslint src/assets/js/smooth.js src/assets/js/main.js --no-fix`: PASS.
- `npx --no-install eslint src/components/subscription/SubscriptionTrendChart.vue --no-fix`: PASS.
- `npx --no-install eslint scripts/design-review.cjs --no-fix`, `node --check scripts/design-review.cjs`: PASS.
- `git diff --check`: PASS.

## 한계

- 외부 Bootstrap·웹폰트·지도 자원은 CSP로 차단되어 콘솔에 차단 메시지가 남는다. 실제 외부 폰트를 받은 운영 환경과 시각 차이가 있을 수 있다.
- 게스트 인증은 403 대역이다. 기존 401→refresh 실패→로그인 이동 문제는 이번 디자인 검증에서 수정하거나 검증하지 않았다.
- 기존 공통 Modal의 전체 focus trap/aria-dialog 동작과 개별 폼의 모든 라벨 연결은 이번 범위에서 완료한 접근성 인증이 아니다. 새로 개선한 메뉴 키보드 동작과 구분한다.
- 대표 화면 정상/홈 빈·실패 상태 외의 모든 로딩·서버 오류 조합, 모든 금융/관리 하위 탭, 실제 외부 API·실계좌·운영 DB는 미검증이다.
- 합성 포트폴리오·사용자·구독 데이터는 디자인 확인용이며 사용자 실제 정보나 투자 결과가 아니다.
