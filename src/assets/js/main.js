import { link } from "./link.js";
import { smooth } from "./smooth.js";

// SPA 라이프사이클과 무관하게 1회만 실행되는 전역 효과:
// - smooth(): Lenis 스무스 스크롤 초기화
// - link(): data-scroll 앵커 초기 바인딩
//
// port()/menu()는 컴포넌트 단위로 호출하므로 여기서 제거
// (port는 pages/index.vue 마운트 시 호출, menu는 Navbar 컴포넌트가 자체 처리)
window.addEventListener("load", function () {
    smooth();
    link();
});
