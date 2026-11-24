# TEAM-38: 운영 점검 결함 수정·검증·배포

- 요청: TEAM-37에서 확인한 모바일 모달 버튼, 홈 이전 주소 링크, 비로그인 최초 홈 리디렉션, 일부 주식/환율 조회 실패를 수정하고 검증 후 커밋·배포.
- 기준: FE535892b, BE3f52eb5. 기존 TEAM-37 비식별 관찰 문서 보존.
- 역할: planning 인증 경로와 회귀 테스트; design 모달/홈 링크; verification 금융 시세 진단·개발; 총괄 브라우저/통합 검증, 교차 검토, 배포.
- 파일 소유: 인증 axios/store/auth 관련 테스트, 디자인 modal.css/Modal.vue/DeleteModal/SiteSection, 금융 BE 시세 서비스/DTO/테스트 및 필요한 FE 시세 소비; 총괄 scripts/docs.
- 완료 기준: 공개 홈 초기401에서도 유지·보호 경로 로그인 유지, 동시 refresh 회귀 없음; Bootstrap 적용 모바일 모달 320/390px 버튼 폭·44px 높이/본문 스크롤 확인; 사이트 링크 현재 origin 사용; 시세 원인에 근거한 오류 복구와 미확인 가격 보존; 격리 테스트/lint/build·독립 검토; 원격 main 배포 및 운영 확인.
- 실제 주문/계좌 설정/DB 직접 변경은 범위 밖. 운영 화면 데이터/자격 증명은 Git에 저장하지 않음.
- 배포 순서: 백엔드 변경이 있으면 검증 후 BE→FE. 되돌리기 기준은 위 두 커밋이며 새 커밋 revert 후 재배포한다.
- 상태: 진행.

## 구현 및 배포 전 검증
- 인증: 초기 세션 복원만 로그인 강제 이동 억제, 보호 API 만료/단일 refresh 유지. 인증 회귀 10개 포함 FE 15 suites/162 tests 통과.
- UI: Bootstrap footer 정렬/여백 충돌 해소, 중첩 슬롯 버튼 모바일 전체 폭·44px 보장. 홈 링크 2개 현재 origin RouterLink.
- 금융: query1 실패 시 query2 한 번 재시도, 빈 응답/잘못된 가격 검증. 신규7개 포함 BE344개 실패0/오류0/기존 선택3 skip. 타깃 Spotless 통과.
- 전체 FE lint 및 production build 통과. 기존 Browserslist/번들 크기 경고 유지.
- 운영 QLD/SCHD/환율 API는 변경 전 재조회에서 정상 응답: 근본 원인 확정이 아닌 간헐 실패 안정화. 운영 화면 표시까지 배포 후 재확인 필요.
- BE ca3aa51 main push 완료. FE 및 운영 검증 결과는 후속 배포 기록/완료 보고 참조.
