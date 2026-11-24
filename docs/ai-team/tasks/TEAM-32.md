# TEAM-32: 커밋 대상 정리와 배포 범위 확정

- 상태: 완료(커밋 대상 정리·배포 범위 확정), 운영 미배포
- 시작/갱신일: 2026-11-23
- 사용자 요청: 연구 결과·캐시를 커밋 대상에서 정리하고 실제 배포할 기능 확정.
- 역할: 총괄(기획·Git 제외 규칙·배포 문서), 프론트 개발/검증, 백엔드 자료 의존성 검증.
- 기준: FE b966b33 / BE beed245. 기존 미커밋 변경은 보존한다.

## 범위와 완료 기준

1. 내려받은 시장자료·생성 원장·Python 캐시는 로컬에 보존하고 Git 대상에서 제외한다.
2. 소스, 합성 fixture, 테스트, 연구 요약 Markdown은 유지한다.
3. Docker 빌드 입력을 실제 Dockerfile 소비 파일로 제한한다.
4. 배포 기능과 기본 비활성 기능을 명시하고, 기본 비활성 모의매매 API를 호출하는 운영 탭을 기본 숨김 처리한다.
5. 제외 규칙과 영향받는 프론트 테스트를 검증한다. 운영 접속·활성화·커밋·푸시는 수행하지 않는다.

## 배포 범위

별도 [배포 범위 문서](../RELEASE_SCOPE.md)를 따른다. 이는 배포 대상 확정이며 운영 검증 완료 또는 배포 승인이 아니다.

## 검증

| 항목 | 실제 결과 |
|---|---|
| Git 제외 규칙 | 연구 파일/캐시 1,154개, 2,259.33 MiB 제외. 로컬 파일 삭제 없음 |
| 남은 백엔드 미추적 파일 | 226개, 약 1.62 MiB. 소스·테스트·보고서·새 Docker 제외 설정 포함 |
| 필수 파일 보존 | `git check-ignore`로 synthetic CSV, team17 계약, 연구실 소스, READINESS.md, Java 판단 fixture가 제외되지 않음 확인 |
| 프론트 | `npm run test:isolated`: 14 suites / 152 tests 통과 |
| 변경 프론트 파일 lint | `node node_modules/eslint/bin/eslint.js src/pages/stock.vue tests/unit/us-paper-trading.test.js --no-fix` 통과. Browserslist 노후 경고 |
| Python 자료 독립성 | 연구실+readiness 관련 42 tests 통과, 생략 없음. Python audit hook으로 `tools/*_data`, `*_results`, `reports` 파일 열기를 차단한 상태에서 검사 |
| 기본 성과 도구 테스트 | `python -B -m unittest discover -s tools/tests -v`: 10 tests 통과 |
| 공백 오류 | 양쪽 `git diff --check` 통과 |
| Docker 입력 | 백엔드는 pom.xml/src, 프론트는 dist/nginx.conf만 허용. 각 Dockerfile COPY 입력과 정적 대조. Docker 빌드는 미실행 |

기존 `research_lab/server_test.py`의 실제 다운로드 자료 의존을 3행 합성 Yahoo 응답으로 교체했다. `team31_test.py`는 임시 합성 48개 원장 형식을 사용하고 자료/원장/소스/감사/개수/요약/통과판정/승인 변조 거부를 검사한다. 실제 연구 자료를 검증하는 `team31_readiness.py`와 승인 기준은 수정하지 않았다. 합성 테스트 통과는 실제 성과 증거가 아니다.

프론트 모의매매는 명시적 빌드 옵션 `VUE_APP_US_PAPER_ENABLED=true`와 ADMIN일 때만 탭과 컴포넌트를 노출한다. 미설정/false/비관리자/명시적 활성 네 조건을 검사했다. 독립 로컬 모의매매 진입점은 유지한다.

## 인수인계

- 변경 파일: BE `.gitignore`, `.dockerignore`, Python 테스트 2개. FE `.dockerignore`, `src/pages/stock.vue`, `tests/unit/us-paper-trading.test.js`, 공동 현황/업무/배포 문서.
- Git index는 비어 있으며 커밋·푸시하지 않았다. 기존 제품 코드 변경은 보존했다.
- 백엔드 전체 Java 검사, 프로덕션 빌드, 실제 브라우저/운영 DB/실계좌 검증은 이번 정리에서 실행하지 않았다. 배포 직전 전체 검사와 DB 준비는 RELEASE_SCOPE.md 절차로 남는다.
- 운영 연결·자동매매·모의매매 서버·연구 스케줄러를 실행하거나 활성화하지 않았다.
