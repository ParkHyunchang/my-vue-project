<template>
  <section
    id="site"
    class="site-section"
  >
    <div class="site__inner">
      <div class="home-section-heading">
        <span class="section-sub">SELECTED WORK</span>
        <h2 class="site__title">
          직접 만들고, 사용하는 서비스
        </h2>
        <p class="section-description">
          화면에서 서버까지, 하나의 경험으로 이어지는 프로젝트입니다.
        </p>
      </div>
      <div class="site__wrap">
        <article class="site__item">
          <div class="site__card-top">
            <span class="site__category">FRONTEND</span><span class="num">01</span>
          </div>
          <div
            class="site__visual"
            aria-hidden="true"
          >
            <div class="site__visual-bar">
              <i /><i /><i />
            </div>
            <div class="site__visual-grid">
              <span /><span /><span />
            </div>
          </div>
          <h3 class="title">
            일상을 담는 웹 공간
          </h3>
          <p class="site__description">
            개발 포트폴리오와 기록, 생활 관리 도구를 연결한 Vue.js 프론트엔드입니다.
          </p>
          <ul
            class="site__tags"
            aria-label="프론트엔드 기술"
          >
            <li>Vue.js</li><li>Axios</li><li>Vue Router</li>
          </ul>
          <div class="site__actions">
            <a href="https://github.com/ParkHyunchang/my-vue-project">소스 코드 <span aria-hidden="true">↗</span></a>
            <router-link to="/">
              사이트 보기 <span aria-hidden="true">↗</span>
            </router-link>
          </div>
        </article>
        <article class="site__item">
          <div class="site__card-top">
            <span class="site__category">BACKEND</span><span class="num">02</span>
          </div>
          <div
            class="site__visual site__visual--server"
            aria-hidden="true"
          >
            <span>API</span><i /><span>SERVICE</span><i /><span>DATA</span>
          </div>
          <h3 class="title">
            경험을 연결하는 서버
          </h3>
          <p class="site__description">
            사용자와 데이터를 연결하고, 서비스의 기능을 지원하는 Spring Boot 백엔드입니다.
          </p>
          <ul
            class="site__tags"
            aria-label="백엔드 기술"
          >
            <li>Spring Boot</li><li>Java</li><li>MySQL</li><li>Docker</li>
          </ul>
          <div class="site__actions">
            <a href="https://github.com/ParkHyunchang/my-vue-project_backend">소스 코드 <span aria-hidden="true">↗</span></a>
            <router-link to="/">
              사이트 보기 <span aria-hidden="true">↗</span>
            </router-link>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'SiteSection',
};
</script>
