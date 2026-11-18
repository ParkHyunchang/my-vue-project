# 프론트 격리 단위 테스트

실제 브라우저·백엔드 결합 검증은 별도 [브라우저 실행 안내](scripts/ISOLATED_BROWSER.md)를 따른다. 최근 [브라우저 검증 결과](docs/ai-team/tasks/TEAM-01-BROWSER.md)에는 재현된 결함과 제한도 기록되어 있다.

프로젝트 폴더에서 다음 명령을 실행한다. 설치된 로컬 Node와 Jest를 사용하며 새 패키지를 설치하지 않는다.

```powershell
npm run test:isolated
```

이 명령은 전체 Jest suite를 순차 실행한다. Vue 개발 서버와 Spring Boot 서버를 기동하지 않고 Vue CLI 및 `.env` 로더를 호출하지 않는다. `VUE_APP_API_URL`은 테스트용 `http://isolated.invalid`로 고정한다. 운영 `.env`나 서버 실행은 준비 단계가 아니다.

Jest 자식 프로세스에는 시스템 실행·임시 파일·시간대·문자 인코딩을 위한 `SYSTEMROOT`, `WINDIR`, `COMSPEC`, `PATHEXT`, `TEMP`, `TMP`, `TMPDIR`, `LOCALAPPDATA`, `TZ`, `LANG`, `LC_ALL`만 상속한다(변수명 대소문자 무관). `NODE_ENV=test`, `BABEL_ENV=test`, 테스트 API 주소는 직접 설정한다. `PATH`, `HOME`, `USERPROFILE`, `JAVA_HOME`, DB/API 키, `NODE_OPTIONS` 등은 전달하지 않는다. Node와 Jest는 부모에서 확인한 절대 경로로 실행한다. 일반 `npm test`에는 이 환경변수 허용 목록이 적용되지 않으므로 전체 격리 진입점은 `test:isolated`다.

## 격리 범위

`tests/setup/network-isolation.cjs`가 모든 Jest suite에서 실제 Axios 기본 adapter, fetch, XHR, WebSocket, EventSource, sendBeacon, Node HTTP/HTTPS/TCP/TLS/HTTP2/UDP 및 DNS 호출(callback/promise Resolver 인스턴스 포함)을 차단한다. 요청은 `ISOLATED_NETWORK_BLOCKED` 오류를 내며 localhost도 허용하지 않는다. 기존 `jest.mock('@/axios')` 및 명시적인 응답 adapter는 사용할 수 있다. 일반 `npm test`에도 동일한 방어가 적용된다.

파일 시스템 읽기를 차단하는 샌드박스는 아니다. runner는 `.env`를 읽지 않지만 테스트가 임의로 파일을 읽는 행위까지 차단하지는 않는다.

테스트 내부의 `child_process` exec/spawn/fork 계열과 직접 ChildProcess.spawn, `worker_threads.Worker`도 차단한다. 이 방어는 신뢰된 단위 테스트의 실수 방지 장치이며 OS 네트워크 샌드박스가 아니다. 직접 native 코드, 방어 설치 전에 보관한 원본 함수, 차단 장치를 덮어쓰는 테스트까지 방어한다고 보장하지 않는다. 새 통신 기능을 추가할 때는 먼저 격리 수단과 회귀 테스트를 보강한다. 백엔드 DB/외부 서비스/스케줄러 검증 및 실제 브라우저 E2E 결과로 해석하지 않는다. npm과 runner를 시작하기 전 부모 프로세스에 이미 적용된 사전 로더는 되돌릴 수 없으므로 정상적인 신뢰된 셸에서 실행한다.

## 진행과 결과

- `[isolated]`: 실행 범위와 네트워크 방어 안내.
- `[running]`: 전체 테스트 실행 중. Jest가 suite별 결과와 최종 개수를 출력한다.
- `[passed]`: 모든 suite가 성공하고 종료 코드 0인 경우만 출력한다.
- `[failed]`: 테스트 또는 실행 오류. Jest의 실패 위치를 확인한 뒤 같은 명령으로 재실행한다.
- `[incomplete]`: 프로세스 실행 실패·중단·180초 제한. 일부 출력이 성공이어도 전체 통과가 아니다.

수동 중단은 실행 중인 터미널에서 Ctrl+C를 사용한다. 모든 Node/Java 프로세스를 일괄 종료하지 않는다. 이 runner는 작업 대상 Jest 실행에만 제한 시간을 적용한다. 별도 자식 프로세스를 만드는 테스트는 허용 범위 밖이다.

`ISOLATED_NETWORK_BLOCKED`가 발생하면 실제 서버 연결을 허용하지 말고 해당 요청의 응답 또는 오류를 mock으로 제공한다. 의존성 누락은 설치 환경 문제, assertion 실패는 테스트 기대 결과 문제로 구분해서 기록한다. 테스트를 제외하거나 skip해서 전체 성공으로 보고하지 않는다.

## 추가 검사

```powershell
npm run lint -- --no-fix
```

빌드/개발 서버는 Vue CLI가 환경 파일을 읽는 별도 작업이다. `test:isolated`는 이들을 호출하지 않는다. UI의 시각·키보드 검증은 격리된 API 대역을 사용하는 별도 브라우저 검증이 필요하다.
