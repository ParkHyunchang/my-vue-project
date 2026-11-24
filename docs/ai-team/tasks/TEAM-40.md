# TEAM-40: 배포 후 모바일 메뉴 이동 실패 진단·수정

- 요청: AI 채팅/부동산/여행 및 간헐 다른 메뉴를 눌러도 이동하지 않는 문제 원인 확인·수정.
- 기준: FE3e57626(배포소스), 기록7384537. 사용자 새로고침 후 AI 채팅 정상, 부동산/여행 실패 지속.
- 역할: 총괄 운영 재현·통합, design Navbar 이벤트/레이어, verification 동적 라우트·배포 자산 검사.
- 범위: 확인된 원인에 따른 최소 수정과 회귀검증. 운영 개인정보/계좌/DB 쓰기 및 실제 주문 없음.
- 1차 관측: 새 운영 로그인 탭390px에서 메뉴를 통해 chat→realestate→travel 전환 모두 정상. 사용자 브라우저와 실패 상태 추가 확인 중. Navbar 이벤트 문제로 단정하지 않음.
- 상태: 확인된 실패 경로 수정·검증·배포 완료. 사용자 실제 Android 오류와의 동일성은 로그 미확보로 미확정.

## 진단 및 수정 검증
- 사용자 Android에서 메뉴닫힘·기존화면유지, 실패메뉴변동 보고. 실제휴대폰 오류로그는미확보이므로 원인전체확정은아님.
- 운영공개asset old app.4af7cafc.js:404 text/html+Cache-Control public,immutable 확인. HTML은no-cache/currentJS200. Navbar/router등록/권한소스에 클릭가로채기 근거없음.
- 수정전 production빌드에 lazychunk404 주입: 부동산클릭후메뉴만닫힘/hash홈유지+ChunkLoadError 재현.
- 수정: router청크오류한정 목적지유지1회문서reload, 세션루프가드/오프라인/저장소차단/경쟁탭 처리, 일반오류안내. nginxmissingstatic404 no-store. Navbar디자인은유지.
- 수정후 CUA+합성API 실제빌드: 단발404후부동산정상진입, document2회/주입실패1회. 지속404여행은document2회로중단·안내표시(무한reload없음). 로컬전용 scripts/route-recovery-preview.cjs로재현가능.
- 전체176 tests/16 suites, 전체lint, production build 통과. 독립검토blocking0. nginxCLI없음으로nginx -t 미실행; 배포후404헤더검사필요.
- 배포: 사용자요청한운영이동장애수정의연속작업으로프론트mainpush. 백엔드/DB불변. 롤백기준7384537(배포소스3e57626).

## 배포 후 결과
- a025c60 / Actions45349983520 success, 운영 app.7da95189.js 반영.
- oldapp.4af7cafc.js 운영404응답 Cache-Control:no-store 확인.
- 운영390px 메뉴클릭으로chat/realestate/travel/diary/admin/users/history/dating/todos/subscription/saju/stock/home 실제URL+화면제목확인. 초기빠른연속검사중미완료이동은목표URL완료대기로재검증, todos/saju/stock정상도달. 오류로그없음.
- 실제Android휴대폰은직접제어하지않았으므로사용자환경재확인필요. 무반응동일증상의파일로딩실패는격리브라우저에서수정전후재현검증됨.
- 검증기록만후속[skip ci]커밋, 배포소스는a025c60. 격리preview서버종료.
