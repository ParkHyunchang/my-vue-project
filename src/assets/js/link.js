import { lenis } from './smooth.js';

export function link() {
    document.querySelectorAll('a[data-scroll]').forEach((anchor) => {
        anchor.addEventListener("click", function () {
            const targetId = this.getAttribute("data-scroll");
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                if (lenis) {
                    lenis.scrollTo(targetElement, { offset: 0 });
                } else {
                    targetElement.scrollIntoView({ behavior: "smooth" });
                }
            }
        });
    });
}