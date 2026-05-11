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

      <CareerSection :careers="careers" :parse-json="parseJson" />
      <ExperienceSection :experiences="experiences" />
      <SiteSection />

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

      <ContactSection />
    </main>

    <HomeFooter />
  </div>
</template>

<script>
import { port } from '@/assets/js/port.js';
import axios from '@/axios';
import CareerSection from '@/components/home/CareerSection.vue';
import ExperienceSection from '@/components/home/ExperienceSection.vue';
import SiteSection from '@/components/home/SiteSection.vue';
import ContactSection from '@/components/home/ContactSection.vue';
import HomeFooter from '@/components/home/HomeFooter.vue';

export default {
  name: 'HomePage',
  components: {
    CareerSection,
    ExperienceSection,
    SiteSection,
    ContactSection,
    HomeFooter,
  },
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
<style src="@/assets/css/home.css"></style>
