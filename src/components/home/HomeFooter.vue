<template>
  <footer
    id="footer"
    role="contentinfo"
  >
    <div class="footer__inner">
      <div class="footer__identity">
        <span class="footer__brand">HYUNCHANG<span>.</span></span>
        <p>만들고 배우는 일의 기록.</p>
      </div>
      <nav
        class="footer__links"
        aria-label="블로그 링크"
      >
        <a href="https://hyunchang88.tistory.com/">Tistory <span aria-hidden="true">↗</span></a>
        <a href="https://blog.naver.com/minister_of_develop/">Naver Blog <span aria-hidden="true">↗</span></a>
      </nav>
      <p class="footer__right">
        &copy; hyunchang's web · Vue.js &amp; Spring Boot
      </p>
    </div>
  </footer>
</template>

<script>
export default {
  name: 'HomeFooter',
};
</script>
