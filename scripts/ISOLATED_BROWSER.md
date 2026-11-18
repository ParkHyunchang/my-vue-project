# 실제 Vue 앱의 격리 브라우저 검증

먼저 백엔드의 격리 가드·테스트 DB·외부 API 차단 설정을 확인한다. 운영 `run-local.ps1`을 사용하지 않는다. 별도 격리 백엔드를 `127.0.0.1:13200`에 기동하고 준비 완료 응답을 확인한 뒤 프론트 폴더에서 아래 명령을 실행한다. 백엔드가 준비되지 않았으면 프론트를 열어도 API proxy ECONNREFUSED가 발생하므로 제품 오류로 분류하지 않는다.

```powershell
npm run serve:isolated
```

접속 주소: `http://localhost:13100`. 실제 src와 public을 개발 모드로 컴파일한다. 제품 코드와 기존 vue.config.js는 변경하지 않는다.

- 프로세스 환경은 test-environment.cjs의 시스템 변수 허용 목록만 상속하고 개발 모드·빈 API base URL로 덮어쓴다.
- Vue CLI Service의 loadEnv를 초기화 전에 비활성화해 `.env*`를 열지 않는다. loadUserOptions도 전용 테스트 설정만 반환한다.
- 서버는 `127.0.0.1:13100`에만 바인딩한다. `/api`와 `/uploads`는 `127.0.0.1:13200`만 프록시한다.
- HTTP 응답의 CSP가 외부 연결·스타일·폰트·이미지·iframe을 막는다. 개발 번들의 eval/inline 스타일은 허용한다. HMR/websocket/live reload는 끈다.
- 원본 public의 Bootstrap CDN과 외부 웹폰트, 지도 이미지 등은 차단되므로 그 의존성에 따른 화면 차이는 운영 UI 결함으로 단정하지 않는다. 외부 링크를 열지 말고 테스트 계정과 임시 데이터만 사용한다.
- 이 실행은 브라우저 테스트 환경이다. 외부 서비스의 실제 결과·실계좌 거래·운영 DB 정상 여부는 검증하지 않는다. OS 보안 샌드박스나 임의 파일 읽기 방어가 아니다.

중단은 해당 실행 터미널의 Ctrl+C를 사용한다. 다른 Node/Java 실행을 일괄 종료하지 않는다.
