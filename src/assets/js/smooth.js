import Lenis from "@studio-freight/lenis";

export let lenis = null;

export function smooth() {
    lenis = new Lenis({ 
        duration: 1,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    lenis.on("scroll", () => {
        // 스크롤 이벤트 처리
    });
}