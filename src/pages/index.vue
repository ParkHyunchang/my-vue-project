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
          <h1 class="hero__title">안녕하세요, <span class="highlight">현창</span>입니다</h1>
          <p class="hero__subtitle">AI 웹 개발자 현창입니다.</p>
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
          <div class="career__list">

            <div class="career__item">
              <div class="career__header">
                <div class="career__icon">🤖</div>
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
                <div class="career__icon">💬</div>
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
                <div class="career__icon">🗺️</div>
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
                <div class="career__icon">🔒</div>
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
                <div class="career__icon">⚙️</div>
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
          <div class="experience__timeline">
            <div class="timeline__item">
              <div class="timeline__dot"></div>
              <div class="timeline__content">
                <h3>IT 융복합기기 회로설계 전문가과정</h3>
                <p class="timeline__subtitle">대한상공회의소</p>
                <p class="timeline__desc">PCB 설계, 회로 설계 및및 프로토타입 제작 등을 하며 실무 경험을 쌓았습니다.</p>
                <span class="timeline__period">2016.03.02 ~ 2016.06.01</span>
              </div>
            </div>
            
            <div class="timeline__item">
              <div class="timeline__dot"></div>
              <div class="timeline__content">
                <h3>멀티프레임워크기반 웹 전문 개발자</h3>
                <p class="timeline__subtitle">에이콘아카데미</p>
                <p class="timeline__desc">프론트엔드와 백엔드 전반에 걸친 웹 개발 기술을 체계적으로 학습하고 실무 프로젝트를 통해 실전 경험을 쌓았습니다..</p>
                <span class="timeline__period">2017.03.09 ~ 2017.09.12</span>
              </div>
            </div>
            
            <div class="timeline__item">
              <div class="timeline__dot"></div>
              <div class="timeline__content">
                <h3>회사 웹 개발자</h3>
                <p class="timeline__subtitle">회사</p>
                <p class="timeline__desc">여러 회사의 솔루션 및 개발 프로젝트를 수행하며 폭넓은 기술 경험과 프로젝트 관리 능력을 키워가고고 있습니다.</p>
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
                <a href="http://125.141.20.218:3100/#/">view</a>
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
                <a href="http://125.141.20.218:3100/#/">view</a>
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
              <h3 class="title">HTML / CSS</h3>
              <p class="desc">HTML/CSS를 활용한 반응형 웹</p>
              <p class="desc">CSS 애니메이션</p>
              <p class="desc">Sass(scss)</p>
            </article>
            <article class="port__item p2">
              <span class="num">02.</span>
              <h3 class="title">JavaScript</h3>
              <p class="desc">JQuery</p>
              <p class="desc">JSON/AJAX</p>
              <p class="desc">외부 API</p>
            </article>
            <article class="port__item p3">
              <span class="num">03.</span>
              <h3 class="title">JAVA</h3>
              <p class="desc">JSP/Servlet</p>
              <p class="desc">JDBC</p>
              <p class="desc">Tomcat</p>
            </article>
            <article class="port__item p4">
              <span class="num">04.</span>
              <h3 class="title">React</h3>
              <p class="desc">Context API</p>
              <p class="desc">외부 API</p>
            </article>
            <article class="port__item p5">
              <span class="num">05.</span>
              <h3 class="title">DB</h3>
              <p class="desc">Postgresql</p>
              <p class="desc">Oracle DB</p>
            </article>
          </div>
        </div>
      </section>
      
      <!-- Contact Section -->
      <section id="contact" class="contact-section">
        <div class="contact__inner">
          <h2 class="contact__title">Contact</h2>
          <div class="contact__content">
            <div class="contact__message">
              <h3>함께 일하고 싶으시다면</h3>
              <p>새로운 프로젝트나 협업 기회에 대해 언제든 연락주세요. 빠른 시일 내에 답변드리겠습니다.</p>
            </div>
            <div class="contact__methods">
              <div class="contact__method">
                <span class="contact__icon">📧</span>
                <a href="mailto:hyunchang1234@hanmail.net">hyunchang1234@hanmail.net</a>
              </div>
              <div class="contact__method">
                <span class="contact__icon">🐙</span>
                <a href="https://github.com/hyunchang" target="_blank">github.com/hyunchang</a>
              </div>
              <!-- 
              <div class="contact__method">
                <span class="contact__icon">💼</span>
                <a href="https://linkedin.com/in/hyunchang" target="_blank">linkedin.com/in/hyunchang</a>
              </div>
               -->
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
          이 사이트는 뷰3, springboot를 이용하여 제작하였습니다.
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
/* 전체 페이지 스크롤바 문제 해결 */
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

/* 전체 컨테이너 제거 */
#main {
  width: 100%;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
}

/* Hero Section */
.hero-section {
  min-height: 100vh;
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-align: center;
  width: 100vw;
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
  position: relative;
  overflow: hidden;
}

.hero__inner {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  width: 100%;
}

.hero__title {
  font-size: clamp(2.5rem, 8vw, 4rem);
  font-weight: bold;
  margin-bottom: 1rem;
  line-height: 1.2;
}

.hero__title .highlight {
  color: #ffd700;
}

.hero__subtitle {
  font-size: 1.2rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.hero__buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 12px 24px;
  border-radius: 25px;
  text-decoration: none;
  font-weight: bold;
  transition: all 0.3s ease;
  display: inline-block;
}

.btn-primary {
  background: white;
  color: #667eea;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.btn-secondary {
  background: transparent;
  color: white;
  border: 2px solid white;
}

.btn-secondary:hover {
  background: white;
  color: #667eea;
}

/* About Section */
.about-section {
  padding: 5rem 0;
  background: white;
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
  font-size: 2.5rem;
  font-weight: bold;
  text-align: center;
  margin-bottom: 3rem;
  position: relative;
}

.about__title::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 3px;
  background: #667eea;
}

.about__content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: start;
}

.about__philosophy h3,
.about__skills h3 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #333;
}

.about__philosophy p {
  line-height: 1.6;
  color: #666;
  margin-bottom: 1rem;
}

.skills__list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.skill__tag {
  background: #667eea;
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
}

/* Career & Projects Section */
.career-section {
  padding: 5rem 0;
  background: linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  color: white;
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
  font-size: 2.5rem;
  font-weight: bold;
  text-align: center;
  margin-bottom: 3.5rem;
  position: relative;
}

.career__title em {
  display: block;
  font-size: 1rem;
  font-weight: 400;
  opacity: 0.7;
  font-style: normal;
  margin-top: 0.4rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.career__title::after {
  content: '';
  position: absolute;
  bottom: -12px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 3px;
  background: #667eea;
}

.career__list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.career__item {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.career__item:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 40px rgba(102, 126, 234, 0.2);
}

.career__header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem 1.5rem 1rem;
}

.career__icon {
  font-size: 1.8rem;
  width: 52px;
  height: 52px;
  background: rgba(102, 126, 234, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.career__meta {
  flex: 1;
  min-width: 0;
}

.career__company {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0 0 0.25rem;
  color: #fff;
}

.career__period {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.55);
}

.career__badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.career__badge.current {
  background: rgba(102, 234, 139, 0.2);
  color: #6eea8b;
  border: 1px solid rgba(102, 234, 139, 0.3);
}

.career__body {
  padding: 0 1.5rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  margin-top: 0;
  padding-top: 1rem;
}

.career__role {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.75);
  margin-bottom: 1rem;
  line-height: 1.5;
}

.career__projects {
  list-style: none;
  padding: 0;
  margin: 0 0 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.career__projects li {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.85);
  padding-left: 1.2rem;
  position: relative;
  line-height: 1.5;
}

.career__projects li::before {
  content: '›';
  position: absolute;
  left: 0;
  color: #667eea;
  font-weight: bold;
}

.career__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.75rem;
}

.career__tags span {
  background: rgba(102, 126, 234, 0.2);
  color: #a5b4fc;
  border: 1px solid rgba(102, 126, 234, 0.3);
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 0.78rem;
  font-weight: 500;
}

/* Experience Section */
.experience-section {
  padding: 5rem 0;
  background: #f8f9fa;
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
  font-size: 2.5rem;
  font-weight: bold;
  text-align: center;
  margin-bottom: 3rem;
  position: relative;
}

.experience__title::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 3px;
  background: #667eea;
}

.experience__timeline {
  position: relative;
}

.experience__timeline::before {
  content: '';
  position: absolute;
  left: 20px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #667eea;
}

.timeline__item {
  position: relative;
  margin-bottom: 2rem;
  padding-left: 60px;
}

.timeline__dot {
  position: absolute;
  left: 11px;
  top: 0;
  width: 20px;
  height: 20px;
  background: #667eea;
  border-radius: 50%;
  border: 4px solid white;
  box-shadow: 0 0 0 2px #667eea;
}

.timeline__content {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.timeline__content h3 {
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: #333;
}

.timeline__subtitle {
  color: #667eea;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.timeline__desc {
  color: #666;
  line-height: 1.5;
  margin-bottom: 1rem;
}

.timeline__period {
  font-size: 0.9rem;
  color: #6c757d;
}

/* Site Section */
.site-section {
  padding: 5rem 0;
  background: white;
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
  font-size: 2.5rem;
  font-weight: bold;
  text-align: center;
  margin-bottom: 3rem;
  position: relative;
}

.port__title {
  text-align: center;
  font-size: 2.5rem;
  font-weight: bold;
  margin-bottom: 3rem;
  position: relative;
  padding-top: 2rem;
}

/* Portfolio Section */
.port-section {
  position: relative;
  height: 100vh;
  width: 100vw;
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
  overflow: hidden;
  background: #f8f9fa;
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
  text-align: center;
  font-size: 2.5rem;
  font-weight: bold;
  margin-bottom: 3rem;
  position: relative;
  padding-top: 2rem;
}

.port__title::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 3px;
  background: #667eea;
}

/* Contact Section */
.contact-section {
  padding: 5rem 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
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
  font-size: 2.5rem;
  font-weight: bold;
  margin-bottom: 3rem;
  position: relative;
}

.contact__title::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 3px;
  background: white;
}

.contact__content {
  background: rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 2rem;
  backdrop-filter: blur(10px);
}

.contact__message h3 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.contact__message p {
  margin-bottom: 2rem;
  opacity: 0.9;
}

.contact__methods {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.contact__method {
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: center;
}

.contact__icon {
  font-size: 1.2rem;
}

.contact__method a {
  color: white;
  text-decoration: none;
  transition: opacity 0.3s ease;
}

.contact__method a:hover {
  opacity: 0.8;
}

.contact__button {
  margin-top: 2rem;
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .about__content {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  
  .career__header {
    flex-wrap: wrap;
  }

  .career__badge {
    margin-left: auto;
  }
  
  .contact__methods {
    align-items: center;
  }
  
  .contact__method {
    flex-direction: column;
    text-align: center;
  }
  
  /* 모바일에서 패딩 조정 */
  .about__inner,
  .career__inner,
  .experience__inner,
  .site__inner,
  .contact__inner {
    padding: 0 1rem;
  }
}

/* 800px 이상에서 왼쪽 공간 제거 */
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

/* 기존 스타일 유지 */
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

/* 모바일 다크모드 설정 */
@media (prefers-color-scheme: dark) {
  :root {
    --mainBg-color: #23201c;
    --subBg100: #3a332a;
    --subBg200: #4a4238;
    --subBg300: #686056;
    --subBg400: #7a726a;
    --subBg500: #8a827a;

    --white: #f5f0ea;
    --black: #23201c;
    --black100: #e0e0e0;
    --black200: #b0b0b0;
    --black300: #888888;
    --black400: #444444;
  }
}
</style>
