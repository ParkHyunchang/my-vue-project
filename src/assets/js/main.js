import { link } from "./link.js";
import { smooth } from "./smooth.js";

// SPA 라이프사이클과 무관하게 1회만 실행되는 전역 효과:
// - smooth(): Lenis 스무스 스크롤 초기화
// - link(): data-scroll 앵커 초기 바인딩
//
// 메뉴는 Navbar 컴포넌트가 처리하며 홈은 기본 문서 스크롤을 사용한다.
window.addEventListener("load", function () {
    smooth();
    link();
});
