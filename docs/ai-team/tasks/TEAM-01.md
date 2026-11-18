# TEAM-01: 운영 연결 없는 테스트 환경

- 상태: 완료 (전체 verify의 기존 스타일 부채는 TEAM-02로 인계)
- 날짜: 2026-11-17
- 담당: 기획 planning, 디자인/프론트 개발 design, 백엔드 개발/통합 총괄, 독립 검증 verification
- 기존 변경: TEAM-00의 AGENTS.md, docs, README/ARCHITECTURE 수정 유지

## 목표와 범위

기존 전체 테스트를 운영 DB·NAS·증권사·AI API에 연결하지 않고 실행한다. 전체 Spring Boot 앱과 브라우저 개발 서버 기동은 범위에서 제외한다. 애플리케이션 부팅에는 스케줄러·외부 조회·DB 초기화가 있어 단순 trade.enabled=false 설정은 격리 수단으로 충분하지 않다.

## 완료 기준

- AC-1: 비밀 파일을 읽지 않는 프론트/백엔드 검증 명령과 실행 안내.
- AC-2: 기존 테스트를 제외하지 않고 전체 실행, Mockito attach 정체 해결.
- AC-3: 메모리 H2에 URL을 고정한 실제 Repository CRUD 검증. 전체 앱/스케줄러/거래 빈 미등록.
- AC-4: 모의 HTTP/WS 사용 및 실제 네트워크 호출 차단 회귀 테스트.
- AC-5: 결과·실패·미검증 범위와 중단 방법 기록.

## 설계

- 화면 변경 없음. 별도 테스트 진입점으로 run-local.ps1과 구분하고 종료 코드를 그대로 전달한다.
- 백엔드: Maven isolated-tests 프로필, 시작 시 Byte Buddy agent 연결, Java 21 테스트 JVM 네트워크 guard, 명시적인 H2 Repository fixture.
- 프론트: Jest 전용 격리 진입점 및 네트워크 차단, 제품 src 변경 없음.
- API 계약/운영 설정 변경 없음.

## 구현

- 백엔드 `test-isolated.ps1`: JDK 21 확인, 환경변수 allowlist, Maven RC 비활성화, offline 모드, 실패 종료 코드 전달. `-Verify` 선택 시 패키징·스타일 포함.
- `pom.xml` isolated-tests: Byte Buddy premain 및 테스트 JVM 네트워크 guard, fork timeout 180초. 테스트용 코드만 추가해 제품 JAR에 포함하지 않는다.
- `IsolatedUserRepositoryTest`: User Entity/Repository만 구성해 H2 메모리에 저장→조회→수정→삭제. JDBC URL 확인, 전체 앱·runner·스케줄러 없음.
- 프론트 `test:isolated`: 환경변수 allowlist, 로컬 Jest 전체 실행, Node·브라우저 네트워크와 child process/worker 차단, 회귀 테스트.
- 양쪽 TESTING.md, README, AGENTS.md와 검증 역할 지침에 실행법 반영.

## 검증

| 기준 | 결과 | 근거 |
|---|---|---|
| AC-1 | 통과 | 전용 명령, env allowlist, dotenv 로더 미사용. JAVA_HOME 누락 시 Maven 실행 전 exit 1 확인 |
| AC-2 | 통과 | 백엔드 198 / 프론트 55 tests 통과, 제외 0. 아래 기존 fixture 수정 기록 |
| AC-3 | 통과 | 실제 UserRepository H2 CRUD 및 JDBC URL 확인 |
| AC-4 | 통과 | Java guard 회귀 3개, Node/jsdom 네트워크 차단 회귀. HTTP/WS 테스트는 대역 사용 |
| AC-5 | 통과 | TESTING.md에 결과/실패/중단/한계 명시. 실패한 verify의 exit 1 실제 확인 |

- 프론트: 4 suites / 55 tests 통과. 전체 lint 및 신규 CJS 명시 lint 통과.
- 백엔드: 독립 검증자가 `.\test-isolated.ps1 -Verify`로 198 tests, failures/errors/skipped 모두 0 확인. JAR 생성·재패키징 통과.
- 전체 verify는 Spotless에서 실패. 신규 isolation 3개는 이후 해당 파일만 포맷 수정했다. 기존 제품 src/main 5개 위반은 그대로 두었으며 전체 verify 성공으로 보고하지 않는다.
- 테스트 보호 코드가 제품 src/main에 들어가지 않았고 제품 소스 diff가 없는 것을 확인했다.
- 포맷 정리 후 최종 독립 재검증: 기본 `.\test-isolated.ps1` 198개 통과/exit 0, 신규 isolation 3개 Spotless 통과/exit 0. 전체 Spotless는 기존 src/main 5개만 위반/exit 1.

## 기존 테스트 fixture 수정

첫 전체 실행은 198개 중 실패 6·오류 3이었다. 과거 mock 계약과 현재 시각 의존으로 재현되는 실패였으며 아래 5개 테스트 파일만 수정했다.

- KiwoomUsAutoTradeServiceTest: 현재 lookup 반환 계약 fixture.
- KiwoomUsSignalModeTest: benchmarkStatus fixture.
- KiwoomUsExecutionSafetyTest / KiwoomUsTrendExitTest: 시장가 매도 테스트의 정규장 시간 명시.
- KiwoomUsTradeProtocolTest: 날짜 mock의 스레드 범위를 유지하도록 해당 테스트의 rate limiter만 대역화. 다음날 거래소 변경 기대값 유지 및 요청 횟수 assertion 추가.

제품 거래 로직 변경, 기대 결과 완화, 테스트 제외는 하지 않았다.

## 제한과 다음 업무

- 전체 앱/브라우저/운영 환경 검증을 의미하지 않는다. H2는 MySQL 전용 DDL 전체 검증을 대신하지 않는다.
- Java 21 guard 및 Jest patch는 신뢰된 코드의 우발적 호출 방지이며 OS 네트워크 샌드박스가 아니다. native 확장이나 새 통신 수단 추가 시 검토 필요.
- 기존 제품 파일 5개의 스타일 위반은 TEAM-02에 인계한다. 테스트 실행 준비는 완료이며 전체 verify의 스타일 통과는 별도 미완료 사항이다.
- 운영 반영: 미배포. 커밋/푸시, 운영 서버/DB 연결, 실제 주문 없음.
