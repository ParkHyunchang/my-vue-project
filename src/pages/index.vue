<template>
  <div class="home-page">
    <div id="skip">
      <a
        href="#header"
        @click.prevent="scrollToSection('header')"
      >헤더 영역 바로가기</a>
      <a
        href="#intro"
        @click.prevent="scrollToSection('intro')"
      >소개 영역 바로가기</a>
      <a
        href="#skill"
        @click.prevent="scrollToSection('skill')"
      >경력 영역 바로가기</a>
      <a
        href="#site"
        @click.prevent="scrollToSection('site')"
      >사이트 영역 바로가기</a>
      <a
        href="#port"
        @click.prevent="scrollToSection('port')"
      >포트폴리오 영역 바로가기</a>
      <a
        href="#contact"
        @click.prevent="scrollToSection('contact')"
      >연락처 영역 바로가기</a>
      <a
        href="#footer"
        @click.prevent="scrollToSection('footer')"
      >푸터 영역 바로가기</a>
    </div>

    <main
      id="main"
      role="main"
    >
      <!-- Hero Section -->
      <section
        id="intro"
        class="hero-section"
      >
        <div class="hero__inner">
          <div class="hero__copy">
            <span class="hero__eyebrow">HYUNCHANG · DEVELOPER</span>
            <h1 class="hero__title">
              아이디어를 만들고,<br><span class="highlight">일상에 연결합니다.</span>
            </h1>
            <p class="hero__subtitle">
              웹 개발부터 일상의 기록까지.<br>
              직접 만들고, 사용하며, 조금씩 더 나은 경험을 쌓아갑니다.
            </p>
            <div class="hero__buttons">
              <a
                href="#skill"
                class="btn btn-primary"
                @click.prevent="scrollToSection('skill')"
              >경력 살펴보기 <span aria-hidden="true">↗</span></a>
              <a
                href="#contact"
                class="btn btn-secondary"
                @click.prevent="scrollToSection('contact')"
              >연락하기</a>
            </div>
            <ul
              class="hero__stack"
              aria-label="개발 기술"
            >
              <li>Vue.js</li>
              <li>Spring Boot</li>
              <li>AI</li>
            </ul>
          </div>
          <aside
            class="hero__workspace"
            aria-label="이 공간의 구성"
          >
            <div class="workspace__heading">
              <span
                class="workspace__mark"
                aria-hidden="true"
              >H.</span>
              <div>
                <p class="workspace__eyebrow">
                  PERSONAL WORKSPACE
                </p>
                <h2>만들고, 기록하고, 연결하기</h2>
              </div>
            </div>
            <div class="workspace__row">
              <span class="workspace__number">01</span>
              <div><h3>개발과 프로젝트</h3><p>경력, 경험, 그리고 직접 만든 웹 서비스</p></div>
            </div>
            <div class="workspace__row">
              <span class="workspace__number">02</span>
              <div><h3>일상의 기록</h3><p>할 일과 일기, 여행을 모아두는 공간</p></div>
            </div>
            <div class="workspace__row">
              <span class="workspace__number">03</span>
              <div><h3>자산과 생활 관리</h3><p>주식과 부동산, 구독을 한곳에서 관리</p></div>
            </div>
            <p class="workspace__note">
              개인 도구는 로그인 후 권한에 따라 이용할 수 있습니다.
            </p>
          </aside>
        </div>
        <div class="hero__footer">
          <span>작은 아이디어에서 시작하는 더 나은 일상</span>
          <a
            href="#site"
            @click.prevent="scrollToSection('site')"
          >만든 프로젝트 보기 <span aria-hidden="true">↓</span></a>
        </div>
      </section>

      <!-- About Section -->
      <section
        id="about"
        class="about-section"
      >
        <div class="about__inner">
          <div class="home-section-heading">
            <span class="section-sub">ABOUT ME</span>
            <h2 class="about__title">
              꾸준히 만들며<br>배우는 개발자
            </h2>
          </div>
          <div class="about__content">
            <div class="about__philosophy">
              <p>아이디어가 코드가 되고, 코드가 쌓여 무언가가 완성될 때 가장 보람을 느낍니다. 그 작은 순간들이 모여 개발을 계속하게 만드는 이유가 됩니다.</p>
              <p>이 일이 좋은 건 결과물만이 아닙니다. 기술은 늘 새롭고, 배울 것은 언제나 남아 있습니다. 그 흐름 안에 있다는 것 자체가 동기가 됩니다.</p>
            </div>
          </div>
        </div>
      </section>

      <CareerSection
        :careers="careers"
        :parse-json="parseJson"
        :loading="sectionState.career.loading"
        :error="sectionState.career.error"
        @retry="loadCareers"
      />
      <ExperienceSection
        :experiences="experiences"
        :loading="sectionState.experience.loading"
        :error="sectionState.experience.error"
        @retry="loadExperiences"
      />
      <SiteSection />

      <!-- Portfolio Section -->
      <section
        id="port"
        class="port-section"
      >
        <div class="port__wrap-sticky">
          <div class="home-section-heading">
            <span class="section-sub">TOOLKIT</span>
            <h2 class="port__title">
              프로젝트를 만드는 기술
            </h2>
          </div>
          <div
            v-if="sectionState.portfolio.loading"
            class="home-section-state home-section-state--portfolio"
            role="status"
            aria-live="polite"
          >
            포트폴리오 정보를 불러오는 중입니다...
          </div>
          <div
            v-else-if="sectionState.portfolio.error"
            class="home-section-state home-section-state--error home-section-state--portfolio"
            role="alert"
          >
            <p>{{ sectionState.portfolio.error }}</p>
            <button
              type="button"
              class="home-section-retry"
              @click="loadPortfolioSkills"
            >
              다시 시도
            </button>
          </div>
          <div
            v-else-if="portfolioSkills.length === 0"
            class="home-section-state home-section-state--portfolio"
          >
            등록된 포트폴리오 항목이 없습니다.
          </div>
          <div
            v-else
            class="port__wrap"
          >
            <article
              v-for="(skill, index) in portfolioSkills"
              :key="skill.id"
              class="port__item"
              :class="skill.cssClass"
            >
              <span class="num">{{ String(index + 1).padStart(2, '0') }}.</span>
              <h3 class="title">
                {{ skill.title }}
              </h3>
              <p
                v-for="(desc, i) in parseJson(skill.descriptions)"
                :key="i"
                class="desc"
              >
                {{ desc }}
              </p>
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
import axios from '@/axios';
import { apiErrorMessage } from '@/utils/apiError';
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
      sectionState: {
        career: {
          loading: true,
          error: '',
        },
        experience: {
          loading: true,
          error: '',
        },
        portfolio: {
          loading: true,
          error: '',
        },
      },
    };
  },
  async mounted() {
    await this.loadAll();
  },
  methods: {
    async loadAll() {
      await Promise.all([
        this.loadCareers(),
        this.loadExperiences(),
        this.loadPortfolioSkills(),
      ]);
    },
    async loadHomeSection(key, request, assignData, fallbackMessage) {
      this.sectionState[key].loading = true;
      this.sectionState[key].error = '';

      try {
        const { data } = await request();
        assignData(Array.isArray(data) ? data : []);
      } catch (e) {
        this.sectionState[key].error = apiErrorMessage(e, fallbackMessage);
      } finally {
        this.sectionState[key].loading = false;
      }
    },
    loadCareers() {
      return this.loadHomeSection(
        'career',
        () => axios.get('/api/public/career'),
        data => { this.careers = data; },
        '경력 정보를 불러오지 못했습니다.'
      );
    },
    loadExperiences() {
      return this.loadHomeSection(
        'experience',
        () => axios.get('/api/public/experience'),
        data => { this.experiences = data; },
        '경험 정보를 불러오지 못했습니다.'
      );
    },
    async loadPortfolioSkills() {
      await this.loadHomeSection(
        'portfolio',
        () => axios.get('/api/public/portfolio-skills'),
        data => { this.portfolioSkills = data; },
        '포트폴리오 정보를 불러오지 못했습니다.'
      );
    },
    parseJson(json) {
      try { return JSON.parse(json) || []; } catch { return []; }
    },
    scrollToSection(id) {
      const el = document.getElementById(id);
      if (el) {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
        el.focus({ preventScroll: true });
      }
    },
  },
};
</script>

<style src="@/assets/css/home.css"></style>
