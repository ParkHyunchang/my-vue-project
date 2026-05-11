<template>
  <section id="site" class="site-section">
    <div class="site__inner">
      <h2 class="site__title">Works</h2>
      <div class="site__wrap">
        <article class="site__item s1">
          <span class="num">1.</span>
          <div class="text">
            <div>Frontend</div><div>Vue.js</div><div>Dev</div>
          </div>
          <h3 class="title">Vue.js 프론트엔드</h3>
          <div class="btn">
            <a href="https://github.com/ParkHyunchang/my-vue-project">code</a><br>
            <a href="https://hyunchang.synology.me:3100/#/">view</a>
          </div>
          <div class="info">
            <span>works</span>
            <span>production period : three days</span>
            <span>use stack : vue.js, axios, vue-router, lodash, lenis</span>
          </div>
        </article>
        <article class="site__item s2">
          <span class="num">2.</span>
          <div class="text">
            <div>Backend</div><div>Spring</div><div>Boot</div>
          </div>
          <h3 class="title">Spring Boot 백엔드</h3>
          <div class="btn">
            <a href="https://github.com/ParkHyunchang/my-vue-project_backend">code</a><br>
            <a href="https://hyunchang.synology.me:3100/#/">view</a>
          </div>
          <div class="info">
            <span>works</span>
            <span>production period : two days</span>
            <span>use stack : Spring Boot 3.2.0, MySQL 8.0, Spring Data JPA, Java21, docker</span>
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
