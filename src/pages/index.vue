<template>
  <div>
    <div id="skip">
      <a href="#header" @click.prevent="scrollToSection('header')">헤더 영역 바로가기</a>
      <a href="#intro" @click.prevent="scrollToSection('intro')">소개 영역 바로가기</a>
      <a href="#skill" @click.prevent="scrollToSection('skill')">경력 영역 바로가기</a>
      <a href="#site" @click.prevent="scrollToSection('site')">사이트 영역 바로가기</a>
      <a href="#port" @click.prevent="scrollToSection('port')">포트폴리오 영역 바로가기</a>
      <a href="#contact" @click.prevent="scrollToSection('contact')">연락처 영역 바로가기</a>
      <a href="#footer" @click.prevent="scrollToSection('footer')">푸터 영역 바로가기</a>
    </div>

    <main id="main" role="main">
      <!-- Hero Section -->
      <section id="intro" class="hero-section">
        <div class="hero__inner">
          <span class="hero__eyebrow">AI Web Developer</span>
          <h1 class="hero__title">Building Ideas<br><span class="highlight">Into Reality.</span></h1>
          <p class="hero__subtitle">Full Stack · Spring Boot · Vue.js</p>
          <div class="hero__buttons">
            <a href="#skill" class="btn btn-primary" @click.prevent="scrollToSection('skill')">경력 보기</a>
            <a href="#contact" class="btn btn-secondary" @click.prevent="scrollToSection('contact')">연락하기</a>
          </div>
        </div>
      </section>
      
      <!-- About Section -->
      <section id="about" class="about-section">
        <div class="about__inner">
          <h2 class="about__title">About Me</h2>
          <div class="section-divider"></div>
          <span class="section-sub">Who I Am</span>
          <div class="about__content">
            <div class="about__philosophy">
              <p>아이디어가 코드가 되고, 코드가 쌓여 무언가가 완성될 때 가장 보람을 느낍니다. 그 작은 순간들이 모여 개발을 계속하게 만드는 이유가 됩니다.</p>
              <p>이 일이 좋은 건 결과물만이 아닙니다. 기술은 늘 새롭고, 배울 것은 언제나 남아 있습니다. 그 흐름 안에 있다는 것 자체가 동기가 됩니다.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Career & Projects Section -->
      <section id="skill" class="career-section">
        <div class="career__inner">
          <h2 class="career__title">Career</h2>
          <div class="section-divider"></div>
          <span class="section-sub">Work History</span>
          <div class="career__list">
            <div v-for="item in careers" :key="item.id" class="career__item">
              <div class="career__header">
                <div class="career__icon">{{ item.icon }}</div>
                <div class="career__meta">
                  <h3 class="career__company">{{ item.company }}</h3>
                  <span class="career__period">{{ item.period }}</span>
                </div>
                <span v-if="item.badge" class="career__badge current">{{ item.badge }}</span>
              </div>
              <div class="career__body">
                <p class="career__role">{{ item.roleDesc }}</p>
                <ul class="career__projects">
                  <li v-for="(proj, i) in parseJson(item.projects)" :key="i">{{ proj }}</li>
                </ul>
                <div class="career__tags">
                  <span v-for="(tag, i) in parseJson(item.tags)" :key="i">{{ tag }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Experience Section -->
      <section id="experience" class="experience-section">
        <div class="experience__inner">
          <h2 class="experience__title">Experience</h2>
          <div class="section-divider"></div>
          <span class="section-sub">Learning & Growth</span>
          <div class="experience__timeline">
            <div v-for="item in experiences" :key="item.id" class="timeline__item">
              <div class="timeline__dot"></div>
              <div class="timeline__content">
                <h3>{{ item.title }}</h3>
                <p class="timeline__subtitle">{{ item.subtitle }}</p>
                <p class="timeline__desc">{{ item.description }}</p>
                <span class="timeline__period">{{ item.period }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <!-- Site Section -->
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
      
      <!-- Portfolio Section -->
      <section id="port" class="port-section">
        <div class="port__wrap-sticky">
          <div class="port__title">Portfolio</div>
          <div class="port__wrap">
            <article
              v-for="(skill, index) in portfolioSkills"
              :key="skill.id"
              class="port__item"
              :class="skill.cssClass"
            >
              <span class="num">{{ String(index + 1).padStart(2, '0') }}.</span>
              <h3 class="title">{{ skill.title }}</h3>
              <p v-for="(desc, i) in parseJson(skill.descriptions)" :key="i" class="desc">{{ desc }}</p>
            </article>
          </div>
        </div>
      </section>
      
      <!-- Contact Section -->
      <section id="contact" class="contact-section">
        <div class="contact__inner">
          <h2 class="contact__title">Contact</h2>
          <div class="section-divider"></div>
          <span class="section-sub">함께 일해요</span>
          <div class="contact__content">
            <div class="contact__message">
              <h3>함께 일하고 싶으시다면</h3>
              <p>새로운 프로젝트나 협업 기회에 대해 언제든 연락주세요. 빠른 시일 내에 답변드리겠습니다.</p>
            </div>
            <div class="contact__methods">
              <div class="contact__method">
                <span class="contact__icon">Email</span>
                <a href="mailto:hyunchang1234@hanmail.net">hyunchang1234@hanmail.net</a>
              </div>
              <div class="contact__method">
                <span class="contact__icon">Github</span>
                <a href="https://github.com/hyunchang" target="_blank">github.com/hyunchang</a>
              </div>
            </div>
            <div class="contact__button">
              <a href="mailto:hyunchang1234@hanmail.net" class="btn btn-primary">이메일 보내기</a>
            </div>
          </div>
        </div>
      </section>
    </main>
    
    <footer id="footer" role="contentinfo">
      <div class="footer__inner">
        <div class="footer__text">
          <span>hyunchang</span>
          <span>hyunchang's web</span>
        </div>
        <div class="footer__info">
          <div class="center">
            <h3>social</h3>
            <ul>
              <li>
                <a href="https://hyunchang88.tistory.com/">tistory</a>
                <em>티스토리에 들어오시면 좋은 정보 볼 수 있습니다.</em>
              </li>
              <li>
                <a href="https://blog.naver.com/minister_of_develop/">naverBlog</a>
                <em>네이버블로그에 들어오시면 좋은 정보 볼 수 있습니다.</em>
              </li>
            </ul>
          </div>
        </div>
        <div class="footer__right">
          © hyunchang's web<br />
          이 사이트는 Vue3, Spring Boot를 이용하여 제작하였습니다.
        </div>
      </div>
    </footer>
  </div>
</template>

<script>
import { port } from '@/assets/js/port.js';
import axios from '@/axios';

export default {
  name: 'HomePage',
  data() {
    return {
      careers: [],
      experiences: [],
      portfolioSkills: [],
    };
  },
  async mounted() {
    await this.loadAll();
    this.$nextTick(() => port());
  },
  methods: {
    async loadAll() {
      try {
        const [careerRes, expRes, skillRes] = await Promise.all([
          axios.get('/api/public/career'),
          axios.get('/api/public/experience'),
          axios.get('/api/public/portfolio-skills'),
        ]);
        this.careers = careerRes.data;
        this.experiences = expRes.data;
        this.portfolioSkills = skillRes.data;
      } catch (e) {
        // API 실패 시 빈 배열 유지 (섹션이 비어 보임)
      }
    },
    parseJson(json) {
      try { return JSON.parse(json) || []; } catch { return []; }
    },
    scrollToSection(id) {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    },
  },
};
</script>

<style src="@/assets/css/style.css"></style>

<style>
/* 전체 페이지 */
html, body {
  overflow-x: hidden;
  width: 100%;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

* {
  box-sizing: border-box;
}

#main {
  width: 100%;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
}

/* ========================
   Animations
   ======================== */
@keyframes heroFadeUp {
  from { opacity: 0; transform: translateY(40px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes glowPulse {
  0%, 100% { box-shadow: 0 0 8px rgba(201, 169, 110, 0.3); }
  50%       { box-shadow: 0 0 16px rgba(201, 169, 110, 0.5); }
}

/* ========================
   Hero Section
   ======================== */
.hero-section {
  min-height: 100vh;
  display: flex;
  align-items: center;
  background-color: #07070d;
  background-image:
    radial-gradient(ellipse 80% 60% at 15% 40%, rgba(201, 169, 110, 0.08) 0%, transparent 60%),
    radial-gradient(ellipse 60% 80% at 85% 65%, rgba(100, 80, 180, 0.06) 0%, transparent 55%),
    radial-gradient(ellipse 40% 50% at 50% 5%, rgba(201, 169, 110, 0.04) 0%, transparent 50%);
  color: #f0ece4;
  text-align: center;
  width: 100vw;
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
  position: relative;
  overflow: hidden;
}

.hero-section::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none;
  opacity: 0.8;
}

.hero__inner {
  max-width: 900px;
  margin: 0 auto;
  padding: 6rem 2rem 4rem;
  width: 100%;
  position: relative;
  z-index: 1;
}

.hero__eyebrow {
  display: inline-block;
  font-size: 0.7rem;
  letter-spacing: 0.4em;
  text-transform: uppercase;
  color: #c9a96e;
  margin-bottom: 2.5rem;
  animation: heroFadeUp 0.8s ease both;
  opacity: 0.9;
}

.hero__title {
  font-family: "Playfair Display", serif;
  font-size: clamp(3.5rem, 10vw, 7rem);
  font-weight: 700;
  margin-bottom: 1.5rem;
  line-height: 0.95;
  letter-spacing: -0.02em;
  animation: heroFadeUp 0.8s ease 0.1s both;
  color: #f0ece4;
}

.hero__title .highlight {
  color: #c9a96e;
  font-style: italic;
  display: inline-block;
}

.hero__subtitle {
  font-size: 0.8rem;
  margin-bottom: 3.5rem;
  color: rgba(240, 236, 228, 0.4);
  letter-spacing: 0.3em;
  text-transform: uppercase;
  font-weight: 300;
  animation: heroFadeUp 0.8s ease 0.2s both;
}

.hero__buttons {
  display: flex;
  gap: 1.2rem;
  justify-content: center;
  flex-wrap: wrap;
  animation: heroFadeUp 0.8s ease 0.3s both;
}

/* ========================
   Buttons (홈 페이지 스코프)
   ======================== */
#main .btn {
  padding: 14px 36px;
  border-radius: 1px;
  text-decoration: none;
  font-weight: 400;
  transition: color 0.35s ease;
  display: inline-block;
  font-size: 0.75rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  position: relative;
  overflow: hidden;
  min-height: auto;
  background-color: transparent;
}

#main .btn-primary {
  background: transparent;
  color: #c9a96e;
  border: 1px solid #c9a96e;
}

#main .btn-primary::before {
  content: '';
  position: absolute;
  inset: 0;
  background: #c9a96e;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.35s ease;
  z-index: -1;
}

#main .btn-primary:hover {
  color: #0b0b10;
  background-color: transparent;
}

#main .btn-primary:hover::before {
  transform: scaleX(1);
}

#main .btn-secondary {
  background: transparent;
  color: rgba(240, 236, 228, 0.6);
  border: 1px solid rgba(240, 236, 228, 0.2);
}

#main .btn-secondary:hover {
  color: #f0ece4;
  border-color: rgba(240, 236, 228, 0.5);
  background: rgba(240, 236, 228, 0.04);
  transform: none;
  box-shadow: none;
}

/* ========================
   Section Shared Styles
   ======================== */
.section-divider {
  width: 30px;
  height: 1px;
  background: #c9a96e;
  margin: 0.8rem auto 0.8rem;
}

.section-sub {
  display: block;
  text-align: center;
  font-size: 0.7rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #c9a96e;
  margin-bottom: 4.5rem;
  opacity: 0.8;
}

/* ========================
   About Section
   ======================== */
.about-section {
  padding: 7rem 0;
  background: #161626;
  border-top: 1px solid rgba(201, 169, 110, 0.1);
  width: 100vw;
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
  position: relative;
  overflow: hidden;
}

.about__inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  width: 100%;
}

.about__title {
  font-family: "Playfair Display", serif;
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 400;
  text-align: center;
  margin-bottom: 0.6rem;
  color: #f0ece4;
  letter-spacing: -0.01em;
}

.about__title::after {
  display: none;
}

.about__content {
  max-width: 640px;
  margin: 0 auto;
}

.about__philosophy h3,
.about__skills h3 {
  font-family: "Playfair Display", serif;
  font-size: 1.25rem;
  font-weight: 400;
  margin-bottom: 1.2rem;
  color: #f0ece4;
  border-bottom: 1px solid rgba(201, 169, 110, 0.15);
  padding-bottom: 0.75rem;
  letter-spacing: 0.01em;
}

.about__philosophy p {
  line-height: 1.9;
  color: #8a8580;
  margin-bottom: 1rem;
  font-size: 0.92rem;
}

.skills__list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.skill__tag {
  background: transparent;
  color: #c9a96e;
  padding: 5px 13px;
  border-radius: 0;
  font-size: 0.72rem;
  font-weight: 400;
  border: 1px solid rgba(201, 169, 110, 0.25);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transition: all 0.3s ease;
}

.skill__tag:hover {
  background: rgba(201, 169, 110, 0.07);
  border-color: rgba(201, 169, 110, 0.6);
}

/* ========================
   Career Section
   ======================== */
.career-section {
  padding: 7rem 0;
  background: #0a0a12;
  border-top: 1px solid rgba(201, 169, 110, 0.08);
  color: #f0ece4;
  width: 100vw;
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
  position: relative;
  overflow: hidden;
}

.career__inner {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 2rem;
  width: 100%;
}

.career__title {
  font-family: "Playfair Display", serif;
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 400;
  text-align: center;
  margin-bottom: 0.6rem;
  color: #f0ece4;
  letter-spacing: -0.01em;
}

.career__title::after {
  display: none;
}

.career__title em {
  display: block;
  font-size: 0.68rem;
  font-weight: 400;
  opacity: 0.55;
  font-style: normal;
  margin-top: 0.6rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  font-family: "DM Sans", "Montserrat", sans-serif;
  color: #c9a96e;
}

.career__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.career__item {
  background: #151524;
  border: 1px solid rgba(201, 169, 110, 0.08);
  border-left: 2px solid rgba(201, 169, 110, 0.25);
  border-radius: 0;
  overflow: visible;
  transition: background 0.3s ease, border-color 0.3s ease, transform 0.25s ease;
  padding: 1.75rem 1.5rem;
}

.career__item:hover {
  background: #1a1a2e;
  border-left-color: #c9a96e;
  transform: translateX(4px);
  box-shadow: none;
}

.career__header {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  padding: 0 0 0.75rem;
}

.career__icon {
  font-size: 0.6rem;
  font-weight: 500;
  width: 46px;
  height: 46px;
  background: transparent;
  border: 1px solid rgba(201, 169, 110, 0.25);
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #c9a96e;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.career__meta {
  flex: 1;
  min-width: 0;
}

.career__company {
  font-family: "Playfair Display", serif;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.2rem;
  color: #f0ece4;
}

.career__period {
  font-size: 0.75rem;
  color: #8a8580;
  letter-spacing: 0.05em;
}

.career__badge {
  padding: 4px 12px;
  border-radius: 0;
  font-size: 0.65rem;
  font-weight: 400;
  flex-shrink: 0;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.career__badge.current {
  background: transparent;
  color: #c9a96e;
  border: 1px solid rgba(201, 169, 110, 0.35);
}

.career__body {
  padding: 0;
  border-top: none;
  padding-top: 0.25rem;
  padding-left: 58px;
}

.career__role {
  font-size: 0.88rem;
  color: #8a8580;
  margin-bottom: 0.9rem;
  line-height: 1.6;
  font-style: italic;
}

.career__projects {
  list-style: none;
  padding: 0;
  margin: 0 0 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.career__projects li {
  font-size: 0.87rem;
  color: #c8c3bb;
  padding-left: 1.2rem;
  position: relative;
  line-height: 1.6;
}

.career__projects li::before {
  content: '—';
  position: absolute;
  left: 0;
  color: rgba(201, 169, 110, 0.5);
  font-size: 0.7rem;
  top: 0.3em;
}

.career__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  margin-top: 0.9rem;
}

.career__tags span {
  background: transparent;
  color: #8a8580;
  border: none;
  border-left: 1px solid rgba(201, 169, 110, 0.2);
  padding: 2px 10px;
  border-radius: 0;
  font-size: 0.7rem;
  font-weight: 400;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.career__tags span:first-child {
  border-left: none;
  padding-left: 0;
}

/* ========================
   Experience Section
   ======================== */
.experience-section {
  padding: 7rem 0;
  background: #1a1a2a;
  border-top: 1px solid rgba(201, 169, 110, 0.1);
  width: 100vw;
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
  position: relative;
  overflow: hidden;
}

.experience__inner {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 2rem;
  width: 100%;
}

.experience__title {
  font-family: "Playfair Display", serif;
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 400;
  text-align: center;
  margin-bottom: 0.6rem;
  color: #f0ece4;
  letter-spacing: -0.01em;
}

.experience__title::after {
  display: none;
}

.experience__timeline {
  position: relative;
}

.experience__timeline::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 8px;
  bottom: 8px;
  width: 1px;
  background: linear-gradient(to bottom, rgba(201, 169, 110, 0.5), rgba(201, 169, 110, 0.05));
}

.timeline__item {
  position: relative;
  margin-bottom: 0;
  padding-left: 48px;
  padding-bottom: 3rem;
}

.timeline__item:last-child {
  padding-bottom: 0;
}

.timeline__item:last-child .timeline__content {
  border-bottom: 1px solid rgba(201, 169, 110, 0.07);
}

.timeline__dot {
  position: absolute;
  left: 0;
  top: 14px;
  width: 11px;
  height: 11px;
  background: #1a1a2a;
  border-radius: 50%;
  border: 1px solid #c9a96e;
  animation: glowPulse 3s ease-in-out infinite;
  z-index: 1;
}

.timeline__content {
  background: #111121;
  padding: 1.5rem;
  border-radius: 0;
  box-shadow: none;
  border: 1px solid rgba(201, 169, 110, 0.07);
  border-left: 2px solid rgba(201, 169, 110, 0.2);
  transition: border-color 0.3s ease;
  margin-bottom: 0;
}

.timeline__item:last-child .timeline__content {
  margin-bottom: 0;
}

.timeline__item:hover .timeline__content {
  border-left-color: rgba(201, 169, 110, 0.5);
}

.timeline__content h3 {
  font-family: "Playfair Display", serif;
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.4rem;
  color: #f0ece4;
}

.timeline__subtitle {
  color: #c9a96e;
  font-weight: 400;
  margin-bottom: 0.6rem;
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.timeline__desc {
  color: #8a8580;
  line-height: 1.8;
  margin-bottom: 0.8rem;
  font-size: 0.9rem;
}

.timeline__period {
  font-size: 0.75rem;
  color: #8a8580;
  letter-spacing: 0.06em;
  display: inline-block;
}

/* ========================
   Site Section
   ======================== */
.site-section {
  padding: 7rem 0 0;
  background: #0b0b14;
  border-top: 1px solid rgba(201, 169, 110, 0.08);
  width: 100vw;
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
  position: relative;
  overflow: hidden;
}

.site__inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  width: 100%;
}

.site__title {
  font-family: "Playfair Display", serif;
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 400;
  text-align: center;
  margin-bottom: 0.6rem;
  color: #f0ece4;
  letter-spacing: -0.01em;
  text-transform: none;
}

/* ========================
   Portfolio Section
   ======================== */
.port-section {
  position: relative;
  height: 100vh;
  width: 100vw;
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
  overflow: hidden;
  background: #0e0e1c;
  border-top: 1px solid rgba(201, 169, 110, 0.08);
}

.port__wrap-sticky {
  position: sticky;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.port__title {
  font-family: "Playfair Display", serif;
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 400;
  text-align: center;
  margin-bottom: 3rem;
  position: relative;
  padding-top: 2rem;
  color: #f0ece4;
  letter-spacing: -0.01em;
  text-transform: none;
}

.port__title::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 30px;
  height: 1px;
  background: #c9a96e;
}

/* ========================
   Contact Section
   ======================== */
.contact-section {
  padding: 7rem 0;
  background: #161626;
  border-top: 1px solid rgba(201, 169, 110, 0.1);
  color: #f0ece4;
  width: 100vw;
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
  position: relative;
  overflow: hidden;
}

.contact__inner {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 2rem;
  text-align: center;
  width: 100%;
}

.contact__title {
  font-family: "Playfair Display", serif;
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 400;
  margin-bottom: 0.6rem;
  position: relative;
  color: #f0ece4;
  letter-spacing: -0.01em;
  text-transform: none;
}

.contact__title::after {
  display: none;
}

.contact__content {
  background: #111121;
  border: 1px solid rgba(201, 169, 110, 0.1);
  border-top: 2px solid rgba(201, 169, 110, 0.3);
  border-radius: 0;
  padding: 3rem 3.5rem;
  backdrop-filter: none;
}

.contact__message h3 {
  font-family: "Playfair Display", serif;
  font-size: 1.3rem;
  font-weight: 400;
  margin-bottom: 0.9rem;
  color: #f0ece4;
}

.contact__message p {
  margin-bottom: 2.5rem;
  color: #8a8580;
  font-size: 0.9rem;
  line-height: 1.9;
}

.contact__methods {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  margin-bottom: 2.5rem;
}

.contact__method {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  justify-content: center;
}

.contact__icon {
  font-size: 0.65rem;
  color: #c9a96e;
  font-weight: 400;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  min-width: 48px;
  text-align: right;
}

.contact__method a {
  color: #c8c3bb;
  text-decoration: none;
  transition: color 0.3s ease;
  font-size: 0.9rem;
  letter-spacing: 0.02em;
}

.contact__method a:hover {
  color: #c9a96e;
}

.contact__button {
  margin-top: 2.5rem;
}

/* ========================
   Responsive
   ======================== */
@media (max-width: 768px) {
  .about__content {
    grid-template-columns: 1fr;
    gap: 3rem;
  }

  /* Career */
  .career-section { padding: 4rem 0; }
  .career__header { flex-wrap: wrap; }
  .career__badge { margin-left: auto; }
  .career__body { padding-left: 0; padding-top: 0.5rem; }
  .career__item { padding: 1.25rem 1rem; }
  .career__tags { flex-wrap: wrap; }
  .section-sub { margin-bottom: 2.5rem; }

  /* Experience */
  .experience-section { padding: 4rem 0; }
  .timeline__item { padding-left: 32px; padding-bottom: 2rem; }
  .experience__timeline::before { left: 4px; }
  .timeline__dot { width: 9px; height: 9px; top: 16px; }
  .timeline__content { padding: 1rem; }
  .timeline__content h3 { font-size: 0.95rem; }

  /* Contact */
  .contact__content { padding: 2rem 1.5rem; }
  .contact__method { flex-direction: column; gap: 0.5rem; }
  .contact__icon { text-align: center; }

  .about__inner,
  .career__inner,
  .experience__inner,
  .site__inner,
  .contact__inner {
    padding: 0 1.2rem;
  }
}

@media (max-width: 480px) {
  .career-section { padding: 3rem 0; }
  .career__icon { width: 38px; height: 38px; font-size: 0.55rem; }
  .career__company { font-size: 0.95rem; }
  .career__item { padding: 1rem 0.875rem; }
  .experience-section { padding: 3rem 0; }
  .timeline__item { padding-left: 24px; }
}

@media (min-width: 800px) {
  html, body {
    margin: 0;
    padding: 0;
    overflow-x: hidden;
  }

  #main {
    margin: 0;
    padding: 0;
    width: 100%;
  }

  .hero-section,
  .about-section,
  .career-section,
  .experience-section,
  .site-section,
  .port-section,
  .contact-section {
    margin-left: calc(-50vw + 50%);
    margin-right: calc(-50vw + 50%);
    width: 100vw;
  }
}

/* Legacy */
.skill__title {
  margin-bottom: 2rem;
  word-break: keep-all;
}
.skill__desc > div {
  margin-top: 1.5rem;
}
.skill__desc > div:first-child {
  margin-top: 0;
}
</style>
