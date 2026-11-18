# 현재 상태 — 2026-11-17

## 분석 범위

대상은 `my-vue-project`와 `my-vue-project_backend` 두 Git 저장소다. 기획·디자인·검증 서브에이전트가 각각 분석했고 총괄이 개발 구조와 결과를 통합했다. 운영 서버, DB, 실계좌, 배포 이력은 조회하지 않았다. 코드에 존재한다는 사실은 운영 정상 동작을 의미하지 않는다.

## 제품과 기술

현재 구현은 공개 포트폴리오와 회원용 생활·자산 관리 도구를 통합한 웹앱이다. 사용자 확인에 따라 본인이 혼자 사용하는 사이트를 기준으로 기존 기능을 유지·개선한다. 다중 사용자 정책 확대보다 기록 보존과 정확한 표시를 우선한다.

| 영역 | 코드에서 확인한 범위 | 근거 |
|---|---|---|
| 공개 콘텐츠 | 소개, 경력, 포트폴리오, 프로젝트 | src/pages/index.vue, src/config/routes.js |
| 회원 기능 | 할 일, 일기, 기록, 구독, 여행 등 | src/pages/, src/router/index.js |
| 금융 및 분석 | 주식, 부동산, 자산, AI 분석 | src/api/, backend controller/ 및 service/ |
| 운영 도구 | 사용자, 역할, 메뉴, 프롬프트, 채팅 이력 | src/pages/admin*.vue |
| 거래 기능 | 국내/미국 자동매매, 전략·계좌 제어 | backend Kiwoom*Controller, 백엔드 루트 KIWOOM_UI_CONTROL_CHECKS.md |

- 프론트: Vue 3, Vue Router 4, Vuex 4, Axios, Vue CLI 5, Jest. 개발 포트는 vue.config.js 기준 3100.
- 백엔드: Spring Boot 3.2.0, JPA, MySQL, Spring Security/JWT, Maven. pom.xml과 Dockerfile 기준 Java 21.
- 인증: 프론트 Axios가 credentials와 CSRF 헤더를 사용하고 401 시 refresh를 공유해 1회 재시도한다(src/axios.js).
- 메뉴: 기본 역할 매핑은 src/config/routes.js에 있으나 서버 메뉴 정의가 적용될 수 있다. 기본값을 현재 운영 권한으로 단정하지 않는다.
- 배포: 양쪽 .github/workflows/deploy.yml은 main push → 이미지 빌드/GHCR → NAS 배포 구조다. 현재 운영 성공 여부는 미확인이다.

## 유지할 기반

- 양쪽 ARCHITECTURE.md에 레이어 책임과 기존 예외가 이미 정리되어 있다.
- 공통 CSS 토큰(base/vars.css), Navbar, SubMenuLayout, AdminLayout, Modal, Toast가 있어 점진 개선이 가능하다.
- 프론트 단위 테스트와 백엔드 mock 중심 테스트가 존재한다. 백엔드는 Test.java 파일 34개를 확인했다.

## 주요 개선점

| 우선 | 관찰 | 영향과 연결 업무 |
|---|---|---|
| P1 | 프론트 배포 CI에 lint/Jest 없음. 백엔드 Dockerfile은 package -DskipTests이며 verify까지 실행하지 않음 | 배포 전에 검증하지 못한 변경 유입 가능. TEAM-02 |
| P1 | 기본 로컬 백엔드는 서버 DB를 사용할 수 있음(backend README) | AI 개발과 테스트용 격리 환경을 먼저 확인·정립. TEAM-01 |
| P1 | Navbar의 클릭 div와 공통 Modal에 키보드·dialog·포커스 관리 보강 필요 | 공통 화면 조작 접근성 개선. TEAM-03 |
| P1 | diary.vue의 목록 로드 실패가 정상 빈 목록과 구별되지 않음 | 사용자에게 오류와 재시도 제공. TEAM-04 |
| P2 | 로그인 가드에서 목적지 보존 없이 로그인 후 홈으로 이동 | 보호된 화면의 작업 연속성. TEAM-05 |
| P2 | 직접 axios 호출, 일부 Entity 직접 응답 등 기존 아키텍처 예외 존재 | 변경하는 도메인부터 계약·테스트와 함께 점진 개선 |

근거: src/components/Navbar.vue, Modal.vue, src/pages/diary.vue, src/router/index.js, src/components/LoginForm.vue, 양쪽 ARCHITECTURE.md 및 CI/Dockerfile. UI 관찰은 정적 분석이며 실제 브라우저에서 시각·키보드 동작을 검증한 결과는 아니다.

## 초기 검증(TEAM-00)

| 검사 | 결과 |
|---|---|
| 프론트 npm run lint -- --no-fix | 통과 |
| 프론트 npm test -- --runInBand | 2 suites / 36 tests 통과 |
| 프론트 npm run build | 통과(exit 0). 자산 크기·CSS 호환성·Browserslist 데이터 경고 있음 |
| 백엔드 mvn -o test | 일부 테스트 후 Mockito/ByteBuddy attach 오류로 정체, 해당 실행 중단. 전체 통과 아님 |
| 브라우저/접근성/E2E | 미실행 |
| 운영 서버/DB/실주문/배포 상태 | 미검증 |

백엔드 테스트에서는 SpringBootTest/DataJpaTest/WebMvcTest/MockMvc 사용을 찾지 못했다. 따라서 현재 테스트를 HTTP 인증·인가/DB 통합 검증의 증거로 사용하지 않는다. attach 오류는 실행 환경 문제 가능성이 있으며 코드 결함 여부를 확정하지 않았다.

프론트 빌드는 최대 JS 청크 약 1.32 MiB, 앱 진입 묶음 약 339 KiB에 대한 크기 경고와 admin.css의 `end` 정렬 호환성 경고가 있었다. 실제 사용자 체감 성능은 측정하지 않았다.

## 이번 구성 변경

프로젝트별 AGENTS.md, 공동 운영 지침, 역할별 지침, 업무 목록, 작업 템플릿을 추가했다. README의 프론트 포트와 백엔드 Java 버전, 프론트 ARCHITECTURE.md의 라우터 경로를 실제 설정에 맞췄다. 애플리케이션 기능 변경이나 배포는 수행하지 않았다.

## TEAM-01 갱신 — 격리 테스트 환경

- 프론트 `npm run test:isolated`: 4 suites / 55 tests 통과. 네트워크/자식 프로세스/worker 차단과 환경변수 allowlist 포함. 전체 lint와 신규 CJS 명시 ESLint 통과.
- 백엔드 `.\test-isolated.ps1 -Verify`: 198 tests 통과(실패·오류·생략 0), JAR 패키징 통과. 전체 verify는 기존 제품 소스 포맷 위반으로 실패했다.
- 백엔드 Mockito attach 문제는 시작 시 Byte Buddy agent 연결로 해결했다. 전체 테스트 실행에서 드러난 기존 9개 fixture 실패는 모의 응답/시간 조건을 현재 계약에 맞춰 수정했으며 기대 결과를 완화하거나 테스트를 제외하지 않았다.
- 테스트 DB는 새 Repository 검증에서만 사용하는 UUID별 H2 메모리 DB다. 기존 서비스 테스트는 mock을 유지한다. 전체 Boot 앱과 운영 스케줄러는 실행하지 않는다.
- 제품 src/main 및 프론트 src, 운영 설정, CI 배포 워크플로 변경 없음. 운영 서비스·실주문·브라우저 E2E는 미검증.
- 두 TESTING.md와 [작업 기록](tasks/TEAM-01.md)에 실행법·제한을 기록했다. Java guard는 JDK 21 테스트 전용이며 OS 샌드박스가 아니다.

전체 Spotless에 남은 기존 파일: KiwoomUsAutoTradeController, KiwoomUsTechnicalSignalService, KiwoomUsTradeService, YahooFinanceService, KiwoomUsMarketHours. TEAM-02에서 배포 전 검사를 활성화하기 전 이 기존 부채를 처리해야 한다.

## 실제 브라우저/앱 검증 후속

테스트 전용 H2·외부 호출 차단 환경에서 실제 Spring Boot 및 Vue 앱을 기동했다. 브라우저 로그인, Todo 생성/수정/완료, 새로고침 인증·데이터 유지, 모바일 기본 조작, 로그아웃과 보호 경로 이동을 확인했다. API 가입/CRUD/권한 거부도 독립 확인했다.

결함: 서로 다른 USER가 같은 Todo를 조회·수정할 수 있음(TEAM-07, 개인 도구 기준 P1), 비로그인 공개 홈 새로고침이 로그인으로 이동(TEAM-08, P2). 제품 소스 수정·운영 배포는 하지 않았다. 외부 연동과 운영 MySQL은 이번 실행 범위 밖이다. 자세한 재현과 화면 증거는 [브라우저 검증 기록](tasks/TEAM-01-BROWSER.md)에 있다.

## 2026-11-18 개인 사용 오류 수정 (TEAM-09)

사용자가 승인한 검토 목록1~8을 모두 수정했다. [작업 기록](tasks/TEAM-09.md). 프론트89/백엔드201 테스트 통과, lint 통과, 실제 격리 앱 컴파일 및 일기 저장·데스크톱/모바일 화면 검증 완료. 전체8개 브라우저 E2E와 실제 외부 서비스는 미검증. 운영 미배포이며 Todo API 계약 변경으로 배포 시 백엔드 먼저 적용한다.
