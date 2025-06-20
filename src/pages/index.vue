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

<style scoped>
.portfolio-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  background: #f8f9fa;
}
header {
  text-align: center;
  margin-bottom: 2rem;
}
h1 {
  font-size: 2.8rem;
  margin-bottom: 0.5rem;
}
.subtitle {
  color: #888;
  font-size: 1.2rem;
}
.intro {
  background: #fff;
  padding: 2rem 3rem;
  border-radius: 1.5rem;
  box-shadow: 0 2px 16px rgba(0,0,0,0.07);
  text-align: center;
}
.profile-img {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  margin-bottom: 1rem;
  object-fit: cover;
  background: #eee;
}
.skills-group {
  display: flex;
  gap: 2rem;
  justify-content: center;
  margin: 2rem 0 1.5rem 0;
}
.skills-block {
  background: #f4f6fa;
  border-radius: 1rem;
  padding: 1.2rem 2rem;
  box-shadow: 0 1px 8px rgba(0,0,0,0.04);
  min-width: 180px;
}
.skills-title {
  font-weight: bold;
  font-size: 1.1rem;
  margin-bottom: 0.7rem;
  color: #42b983;
  text-align: center;
}
.skills-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}
.skills-list span {
  display: inline-block;
  background: #e3e7ed;
  color: #333;
  border-radius: 1rem;
  padding: 0.4rem 1.1rem;
  font-size: 1rem;
  margin: 0.2rem 0.3rem;
}
.btn-main {
  display: inline-block;
  margin-top: 1rem;
  padding: 0.7rem 2rem;
  background: #42b983;
  color: #fff;
  border-radius: 2rem;
  text-decoration: none;
  font-weight: bold;
  transition: background 0.2s;
}
.btn-main:hover {
  background: #369870;
}
</style>