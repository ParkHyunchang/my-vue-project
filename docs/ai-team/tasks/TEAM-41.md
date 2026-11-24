# TEAM-41: 기록 탐색 UX 및 주식 계좌 조회 개선

- 요청: 자주 쓰는 히스토리·데이팅·주식을 디자인/개발 관점에서 개선. 삼성증권·신한투자증권 국내/미국 보유 조회 통합 희망, 키움 자동매매 화면 개선.
- 사용자 확인: 기록 추가·지난 기록 검색·사진 보기·날짜/기념일 확인이 주요 목적. 삼성/신한 API/i indi/외부연동 신청 없음.
- 기준: FE41d8527, BEca3aa51. 양쪽 clean 상태에서 시작.
- 담당: design 기록 두 페이지/공통 Timeline 폼·리스트·필터·Dday/관련 CSS·helpers·tests; planning stock 화면 그룹·계좌조회 패널·기존 자동매매 표시 UX/FE계약; verification 공식증권API 조사 및 순수읽기 KIWOOM계좌조회 API/DTO/tests; 총괄 범위/계약검토·격리 UI 검증·기록.
- 기록 개선: 검색·연도·정렬·건수/초기화, 명확한 로딩/오류/빈상태, 보기→수정 및사진열기, 기념일원본이동, dirty닫기보호·업로드부분실패보존, 확정필터/카테고리버그수정.
- 주식 개선: 수기 포트폴리오/계좌조회/시장/자동매매 구분. 수기와연동자산중복합산·덮어쓰기 금지. 기존키움관리자권한 유지. 주문/전략/위험기준변경없음.
- 신규키움조회는 getBalance 등 실제조회전용경로 검토후 위험상태관측/DB동기화/주문없이 구현. 실제서버/API/계좌 호출은테스트에서 금지, 합성응답으로검증.
- 삼성/신한: 공식개인API 계약·미국주식지원확인 전 자동연동완료로표시하지않음. 신한i indi는Windows설치형이고 NAS직결API로간주하지않음. 계좌번호/키/비밀번호수집없음.
- 상태: 로컬 구현 및 격리 검증. 커밋/배포는 별도이며 실제 증권 계좌 연결 성공은 미검증.

## 구현 결과

- 히스토리/데이팅: 검색·연도 교차 기간 필터·최신/과거 정렬·URL 조건 복원, 검색 결과 수와 초기화, 로딩/오류/재시도/검색 0건 분리. 카드 보기→수정, 사진/+N 확대, 기념일 원본 기록 열기. 모바일 카테고리는 한 줄 가로 스크롤.
- 공통 폼: 작성 내용 폐기 확인 및 이동/새로고침 보호. 사진 일부 실패 시 성공분 유지, 전체 업로드 종료까지 잠금, 파일명과 실패 사유 안내. 기존 20개 제한 및 저장 후 삭제 순서 유지.
- 주식: 네 그룹과 모바일 하위 탭, 시장 상세 접기, 국내/미국 자동매매 상태·제어 영역 정리. 기존 두 자동매매 컴포넌트 script는 기준 HEAD와 동일. 연결 계좌를 수기 합계에 더하지 않음.
- ADMIN GET `/api/kiwoom/accounts/overview`: 국내/미국 조회를 독립 상태로 반환. 소수 수량·통화·조회 시각·알 수 없는 금액(null) 보존. 서버 설정 계좌 한 벌만 대상, 30초 캐시와 동시 조회 병합, HTTP no-store.
- 기존 balance/deposit wrapper에는 자동매매 API 실패 카운터와 DB 저장 부작용이 있어 그대로 재사용하지 않았다. 별도 display 메서드가 하위 조회 transport만 사용하며 주문/위험 상태 관측/DB 동기화를 수행하지 않음. 공유 인증 토큰·호출 제한기는 재사용.

## 검증 및 한계

- BE 전체 355 tests, 실패/오류 0, 기존 선택 replay 3 skip. 신규 11개: 권한, 시장별 실패, 소수 수량, null 금액, 페이지 반복 방지, 캐시 동시 조회, 자동매매 상태 호출 0 검증. 타깃 포맷 및 diff 검사 통과.
- FE 전체 lint 통과. 최종 20 suites / 189 tests 통과. 마지막 모바일 CSS·업로드 실패 사유까지 포함한 production build 성공(hash a5a37b1cd566dfce, 2026-11-24T08:22:08Z). 기존 Browserslist 데이터 및 번들 크기 경고는 남아 있음.
- CUA 실제 브라우저 + 로컬 합성 API: 320/390 모바일, 1440 데스크톱 확인. 연도 교차 검색/URL 복원/검색 0건/초기화/사진 +N 확대/기념일 원본 보기/수정 시 기존 카테고리/계좌 부분 실패/국내·미국 탭 전환 확인. 가로 넘침 없음. 실제 Android 기기 검증은 아님.
- dirty confirm 호출 시 인앱 브라우저 자동화 탭이 멈추어 브라우저에서 확인창 수락·취소는 검증하지 못함. 해당 동작은 단위 테스트로 검증했으며 새 출처 탭에서 나머지 UI 검증을 완료.
- 합성 API는 `node scripts/archive-stock-review-api.cjs`, FE는 `npm run serve:isolated`. loopback만 바인딩, 실서비스 upstream 없음, 모든 mutation 405. 기존 메뉴 fixture는 import 시 자동 browser 실행하지 않도록 main guard 추가.
- 실제 계좌/API·운영 DB 접근, 주문, 실사진 업로드/삭제, 커밋·푸시·배포 없음.

## 증권사 연결 조건

- 키움 REST는 공식 국내/미국 지원 안내 및 기존 프로젝트 API 계약을 사용: https://www.kiwoom.com/m/customer/download/VChannelOpenApiView
- 신한 i indi는 이용 신청과 Windows 실행 환경이 필요하며 미국 주식 조회 지원은 추가 확인 필요: https://www.shinhansec.com/siw/customer-center/channel/channel_homeTrading-indi/contents.do
- 삼성 개인 잔고 API/신청 경로는 공개 공식 자료에서 확인하지 못함(존재하지 않는다고 단정하지 않음). 화면 링크는 HTS 조회 안내이며 API 신청이 아님: https://samsungpop.com/contents/poptrading/help/4201.html
- 사용자 삼성/신한 연동 신청 없음. 두 증권사는 미연결 안내만 구현했고 실제 자동 조회는 미구현. 공식 개인 계좌 조회 제공 여부·국내/미국 범위·이용 계약/인증 방식 확인이 선행되어야 함.

## 운영 배포 요청 — 2026-11-24

사용자가 수정 내용 커밋·배포를 명시 요청했다. 검증 완료 소스 그대로 BE `41decc7`를 먼저 배포한 다음 FE를 배포한다. 새 API 추가이며 기존 API/DB 스키마/전략 설정 변경은 없다. 롤백은 FE 기존 `41d8527`, BE `ca3aa51` 소스로 revert하여 재배포할 수 있다. 삼성·신한 연결 조건과 실제 계좌 응답 미검증 범위는 배포 후에도 유지된다.

배포 완료: BE `41decc7` [Actions 성공](https://github.com/ParkHyunchang/my-vue-project_backend/actions/runs/45356196308), FE `865f7c0` [Actions 성공](https://github.com/ParkHyunchang/my-vue-project/actions/runs/45356627987). 운영 HTTPS 루트와 app/vendor JS 200, 운영 app 매핑의 stock `421.99d0b202.js`에 신규 overview API 포함, archive `453.9f16f6b5.js`/`841.ed834719.js`에 연도 필터 포함 및 모두 200 확인. 로컬·CI 환경 차이로 청크 해시는 다르므로 운영 app 매핑 기준으로 검증했다. 로그인 이후 실계좌 응답은 미검증이며 사용자 확인 예정. 이 배포 결과 문서는 `[skip ci]` 커밋으로 기록하여 동일 소스의 불필요한 재배포를 방지한다.
