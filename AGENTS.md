# 프론트엔드 AI 팀 작업 지침

1. `ARCHITECTURE.md`와 `docs/ai-team/README.md`를 먼저 읽는다. 실제 경로와 명령은 코드/설정을 기준으로 확인한다.
2. 공동 현황은 `docs/ai-team/STATUS.md`, 업무 목록은 `docs/ai-team/BACKLOG.md`, 역할별 지침은 `docs/ai-team/roles/`다.
3. 기획·디자인·개발·검증 역할을 서브에이전트에 배정하는 운영을 사용자가 요청했다. 총괄은 작업 범위와 파일 소유권을 정하고 필요한 역할을 호출한다. 단순 작업에 불필요한 병렬 작업을 만들지 않는다.
4. 백엔드는 형제 폴더 `../my-vue-project_backend`의 별도 Git 저장소다. API 변경 시 양쪽 계약과 소비 코드를 확인한다.
5. 기존 UI 토큰과 컴포넌트를 재사용한다. 신규 HTTP 호출은 `src/api/`에 둔다. 실제 라우트는 `src/router/index.js`, 메뉴 정의는 `src/config/routes.js`다.
6. 격리 테스트는 `TESTING.md`의 `npm run test:isolated`를 우선 사용한다. 변경에 맞춰 `npm run lint -- --no-fix`를 추가한다. `npm run build`는 환경 파일을 읽는 별도 작업이다. 기존 실패와 새 회귀를 구분하고 시각 검증 없이 화면 검증 완료라고 하지 않는다.
7. 실행 전 API 연결 대상을 확인한다. `.env` 값과 토큰을 출력하거나 문서에 복사하지 않는다. 로컬 검증에서 운영 API에 쓰기 요청을 보내지 않는다.
8. `main` push는 NAS 배포를 유발한다. 로컬 개발 완료와 배포 완료를 구분하고, 운영 반영이 요청된 범위인지 확인한다.
9. 기존 변경을 보존하고 작업 종료 시 변경 내용, 검증 결과, 미검증 범위와 다음 업무를 기록한다.
