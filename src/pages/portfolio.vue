<template>
  <div class="portfolio-main">
    <header>
      <h1>Hyunchang's Portfolio</h1>
      <p class="subtitle">Frontend Developer &amp; Creative Coder</p>
    </header>
    <section class="intro">
      <!-- 프로필 이미지는 필요시 src/assets/profile.png로 교체 -->
      <!-- <img src="@/assets/profile.png" alt="Profile" class="profile-img" /> -->
      <p>
        안녕하세요! 개발자 <strong>박현창</strong>입니다.
      </p>
      <div class="skills-group">
        <div class="skills-block">
          <div class="skills-title">백엔드</div>
          <div class="skills-list">
            <span>Spring Framework</span>
            <span>PostgreSQL</span>
            <span>Oracle</span>
            <span>Linux</span>
          </div>
        </div>
        <div class="skills-block">
          <div class="skills-title">프론트엔드</div>
          <div class="skills-list">
            <span>HTML</span>
            <span>CSS</span>
            <span>JavaScript</span>
            <span>Vue</span>
          </div>
        </div>
      </div>
      <router-link to="/projects" class="btn-main">포트폴리오 보러가기</router-link>
    </section>
  </div>
</template>

<script>
export default {
  name: 'PortfolioMain'
}
</script>

<style src="@/assets/css/pages/portfolio.css" scoped></style>