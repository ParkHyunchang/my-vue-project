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
          <h1 class="hero__title">안녕하세요,<br><span class="highlight">현창</span>입니다</h1>
          <p class="hero__subtitle">Full Stack · AI Specialist · Builder</p>
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
          <span class="section-sub">개발자 소개</span>
          <div class="about__content">
            <div class="about__philosophy">
              <h3>개발자로서의 철학</h3>
              <p>사용자 중심의 웹 개발을 지향합니다. 새로운 기술을 배우고 적용하는 것을 즐기며, 팀과의 협업을 통해 더 나은 결과물을 만들어내는 것을 목표로 합니다.</p>
              <p>지속적인 학습과 개선을 통해 사용자에게 최고의 경험을 제공하는 개발자가 되고자 합니다.</p>
            </div>
            <div class="about__skills">
              <h3>기술 스택</h3>
              <div class="skills__list">
                <span class="skill__tag">JavaScript</span>
                <span class="skill__tag">HTML5</span>
                <span class="skill__tag">CSS3</span>
                <span class="skill__tag">Tailwind CSS</span>
                <span class="skill__tag">Vue.js</span>
                <span class="skill__tag">Node.js</span>
                <span class="skill__tag">Git</span>
                <span class="skill__tag">Oracle DB</span>
                <span class="skill__tag">MySQL</span>
                <span class="skill__tag">Postgresql</span>
                <span class="skill__tag">Spring Framework</span>
                <span class="skill__tag">Spring Boot</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Career & Projects Section -->
      <section id="skill" class="career-section">
        <div class="career__inner">
          <h2 class="career__title">Career <em>경력 및 프로젝트</em></h2>
          <div class="section-divider"></div>
          <div class="career__list">

            <div class="career__item">
              <div class="career__header">
                <div class="career__icon">AI</div>
                <div class="career__meta">
                  <h3 class="career__company">(주)포니링크</h3>
                  <span class="career__period">2025.04.21 ~ 재직중</span>
                </div>
                <span class="career__badge current">재직중</span>
              </div>
              <div class="career__body">
                <p class="career__role">LLM 개발운영 — 대규모 언어 모델 프로젝트</p>
                <ul class="career__projects">
                  <li>SKT — LLM 서비스 개발 및 운영</li>
                  <li>H사 — 대규모 언어 모델 개발</li>
                </ul>
                <div class="career__tags">
                  <span>Python</span><span>LLM</span><span>Spring Boot</span><span>Docker</span>
                </div>
              </div>
            </div>

            <div class="career__item">
              <div class="career__header">
                <div class="career__icon">NLP</div>
                <div class="career__meta">
                  <h3 class="career__company">(주)NHN다이퀘스트</h3>
                  <span class="career__period">2021.11.29 ~ 2024.10.18 (35개월)</span>
                </div>
              </div>
              <div class="career__body">
                <p class="career__role">AI 콜봇·챗봇 개발 및 유지보수 / 딥러닝 CI/CD 구축</p>
                <ul class="career__projects">
                  <li>국민은행 — 챗봇/콜봇 SI 1차</li>
                  <li>법률구조공단 — 챗봇 백엔드 개발</li>
                  <li>국민은행 — 챗봇/콜봇 SI 고도화</li>
                  <li>한전, 신한은행, 흥국화재, 하나손보, 신한라이프, 신한투자증권, 삼성카드 등 SM</li>
                </ul>
                <div class="career__tags">
                  <span>Java</span><span>Spring</span><span>AI/NLP</span><span>Docker</span><span>Jenkins</span>
                </div>
              </div>
            </div>

            <div class="career__item">
              <div class="career__header">
                <div class="career__icon">NAV</div>
                <div class="career__meta">
                  <h3 class="career__company">(주)아이나비모빌리티</h3>
                  <span class="career__period">2021.10.05 ~ 2021.11.09 (1개월)</span>
                </div>
              </div>
              <div class="career__body">
                <p class="career__role">서버 개발</p>
                <ul class="career__projects">
                  <li>네비게이션 로그 개발</li>
                </ul>
                <div class="career__tags">
                  <span>Java</span><span>서버 개발</span>
                </div>
              </div>
            </div>

            <div class="career__item">
              <div class="career__header">
                <div class="career__icon">SEC</div>
                <div class="career__meta">
                  <h3 class="career__company">(주)나일소프트</h3>
                  <span class="career__period">2017.09.04 ~ 2021.09.24 (49개월)</span>
                </div>
              </div>
              <div class="career__body">
                <p class="career__role">웹 취약점 점검 솔루션 개발 및 유지보수 / Java 웹 개발</p>
                <ul class="career__projects">
                  <li>교통안전공단, 아산병원 — 웹 취약점 점검 프로젝트 SI</li>
                  <li>국민카드 — 웹 취약점 점검 프로젝트 SM</li>
                  <li>KB국민은행 등 다수 기업 SM</li>
                </ul>
                <div class="career__tags">
                  <span>Java</span><span>JSP</span><span>Oracle DB</span><span>보안 솔루션</span>
                </div>
              </div>
            </div>

            <div class="career__item">
              <div class="career__header">
                <div class="career__icon">EMB</div>
                <div class="career__meta">
                  <h3 class="career__company">칼라세븐</h3>
                  <span class="career__period">2016.11.02 ~ 2017.02.01 (3개월)</span>
                </div>
              </div>
              <div class="career__body">
                <p class="career__role">임베디드 개발</p>
                <ul class="career__projects">
                  <li>생리통 치료기기 임베디드 개발</li>
                </ul>
                <div class="career__tags">
                  <span>Embedded</span><span>C/C++</span>
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
          <span class="section-sub">교육 및 경험</span>
          <div class="experience__timeline">
            <div class="timeline__item">
              <div class="timeline__dot"></div>
              <div class="timeline__content">
                <h3>IT 융복합기기 회로설계 전문가과정</h3>
                <p class="timeline__subtitle">대한상공회의소</p>
                <p class="timeline__desc">PCB 설계, 회로 설계 및 프로토타입 제작 등을 하며 실무 경험을 쌓았습니다.</p>
                <span class="timeline__period">2016.03.02 ~ 2016.06.01</span>
              </div>
            </div>
            
            <div class="timeline__item">
              <div class="timeline__dot"></div>
              <div class="timeline__content">
                <h3>멀티프레임워크기반 웹 전문 개발자</h3>
                <p class="timeline__subtitle">에이콘아카데미</p>
                <p class="timeline__desc">프론트엔드와 백엔드 전반에 걸친 웹 개발 기술을 체계적으로 학습하고 실무 프로젝트를 통해 실전 경험을 쌓았습니다.</p>
                <span class="timeline__period">2017.03.09 ~ 2017.09.12</span>
              </div>
            </div>
            
            <div class="timeline__item">
              <div class="timeline__dot"></div>
              <div class="timeline__content">
                <h3>회사 웹 개발자</h3>
                <p class="timeline__subtitle">다수 기업</p>
                <p class="timeline__desc">여러 회사의 솔루션 및 개발 프로젝트를 수행하며 폭넓은 기술 경험과 프로젝트 관리 능력을 키워가고 있습니다.</p>
                <span class="timeline__period">2017.09 ~ 현재</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <!-- Site Section -->
      <section id="site" class="site-section">
        <div class="site__inner">
          <h2 class="site__title">Site coding</h2>
          <div class="site__wrap">
            <article class="site__item s1">
              <span class="num">1.</span>
              <div class="text">
                <div>Make</div><div>site with</div><div>vue.js</div>
              </div>
              <h3 class="title">vue.js를 이용한 프론트엔드</h3>
              <div class="btn">
                <a href="https://github.com/ParkHyunchang/my-vue-project">code</a><br>
                <a href="https://hyunchang.synology.me:3100/#/">view</a>
              </div>
              <div class="info">
                <span>site coding</span>
                <span>production period : three days</span>
                <span>use stack : vue.js, axios, vue-router, lodash, lenis</span>
              </div>
            </article>
            <article class="site__item s2">
              <span class="num">2.</span>
              <div class="text">
                <div>Make</div><div>site with</div><div>springboot</div>
              </div>
              <h3 class="title">springboot를 이용한 백엔드</h3>
              <div class="btn">
                <a href="https://github.com/ParkHyunchang/my-vue-project_backend">code</a><br>
                <a href="https://hyunchang.synology.me:3100/#/">view</a>
              </div>
              <div class="info">
                <span>site coding</span>
                <span>production period : two days</span>
                <span>use stack : Spring Boot 3.2.0, MySQL 8.0, Spring Data JPA, Java21, docker </span>
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
            <article class="port__item p1">
              <span class="num">01.</span>
              <h3 class="title">AI / LLM</h3>
              <p class="desc">Claude / OpenAI API 연동 및 활용</p>
              <p class="desc">프롬프트 엔지니어링 설계</p>
              <p class="desc">Anthropic Agent SDK 기반 개발</p>
              <p class="desc">RAG 파이프라인 구성</p>
              <p class="desc">AI 기능 서비스 통합 개발</p>
            </article>
            <article class="port__item p2">
              <span class="num">02.</span>
              <h3 class="title">Java</h3>
              <p class="desc">OOP 설계 (상속 / 다형성 / 캡슐화)</p>
              <p class="desc">JSP / Servlet 웹 애플리케이션</p>
              <p class="desc">JDBC 데이터베이스 연동</p>
              <p class="desc">Tomcat 서버 배포</p>
              <p class="desc">Maven / Gradle 빌드 관리</p>
            </article>
            <article class="port__item p3">
              <span class="num">03.</span>
              <h3 class="title">Spring / SpringBoot</h3>
              <p class="desc">MVC 패턴 기반 웹 개발</p>
              <p class="desc">REST API 설계 및 구현</p>
              <p class="desc">Spring Security 인증 / 인가</p>
              <p class="desc">JPA / Hibernate ORM</p>
              <p class="desc">MyBatis 연동</p>
            </article>
            <article class="port__item p4">
              <span class="num">04.</span>
              <h3 class="title">Vue 3</h3>
              <p class="desc">Composition API &amp; &lt;script setup&gt;</p>
              <p class="desc">Pinia 전역 상태 관리</p>
              <p class="desc">Vue Router SPA 구성</p>
              <p class="desc">Vite 빌드 환경 설정</p>
              <p class="desc">컴포넌트 기반 UI 설계</p>
            </article>
            <article class="port__item p5">
              <span class="num">05.</span>
              <h3 class="title">Database</h3>
              <p class="desc">PostgreSQL / Oracle / MySQL</p>
              <p class="desc">ERD 설계 및 정규화</p>
              <p class="desc">SQL 쿼리 최적화</p>
              <p class="desc">인덱스 / 트랜잭션 관리</p>
              <p class="desc">저장 프로시저 &amp; 뷰 활용</p>
            </article>
            <article class="port__item p6">
              <span class="num">06.</span>
              <h3 class="title">Linux Server</h3>
              <p class="desc">Ubuntu / CentOS 서버 환경</p>
              <p class="desc">SSH 원격 접속 &amp; 파일 관리</p>
              <p class="desc">Nginx / Apache 웹서버 설정</p>
              <p class="desc">Shell Script 배포 자동화</p>
              <p class="desc">방화벽(firewalld) &amp; 포트 관리</p>
            </article>
            <article class="port__item p7">
              <span class="num">07.</span>
              <h3 class="title">HTML / CSS</h3>
              <p class="desc">반응형 웹 레이아웃 (Flexbox / Grid)</p>
              <p class="desc">CSS 애니메이션 &amp; 트랜지션</p>
              <p class="desc">Sass(SCSS) 전처리기</p>
              <p class="desc">크로스 브라우저 호환성 대응</p>
              <p class="desc">BEM 방법론 기반 CSS 설계</p>
            </article>
            <article class="port__item p8">
              <span class="num">08.</span>
              <h3 class="title">JavaScript</h3>
              <p class="desc">ES6+ 문법 (Arrow / Destructuring 등)</p>
              <p class="desc">DOM 조작 &amp; 이벤트 핸들링</p>
              <p class="desc">jQuery 플러그인 활용</p>
              <p class="desc">JSON / AJAX 비동기 통신</p>
              <p class="desc">외부 REST API 연동</p>
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
          <span>© webs</span>
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
          © 2025 hyunchang<br />
          이 사이트는 Vue3, Spring Boot를 이용하여 제작하였습니다.
        </div>
      </div>
    </footer>
  </div>
</template>

<script>
import { port } from '@/assets/js/port.js';

export default {
  name: 'HomePage',
  mounted() {
    port();
  },
  methods: {
    scrollToSection(id) {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }
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
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5rem;
  align-items: start;
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

  .career__header {
    flex-wrap: wrap;
  }

  .career__badge {
    margin-left: auto;
  }

  .career__body {
    padding-left: 0;
    padding-top: 0.5rem;
  }

  .contact__content {
    padding: 2rem 1.5rem;
  }

  .contact__method {
    flex-direction: column;
    gap: 0.5rem;
  }

  .contact__icon {
    text-align: center;
  }

  .about__inner,
  .career__inner,
  .experience__inner,
  .site__inner,
  .contact__inner {
    padding: 0 1.2rem;
  }
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
