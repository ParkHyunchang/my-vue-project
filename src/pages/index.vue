<template>
  <div>
    <div id="skip">
      <a href="#header">헤더 영역 바로가기</a>
      <a href="#intro">소개 영역 바로가기</a>
      <a href="#skill">스킬 영역 바로가기</a>
      <a href="#site">사이트 영역 바로가기</a>
      <a href="#port">포트폴리오 영역 바로가기</a>
      <a href="#contact">연락처 영역 바로가기</a>
      <a href="#footer">푸터 영역 바로가기</a>
    </div>

    <!-- 메인화면 전용 왼쪽 메뉴 -->
    <aside class="main-side-menu">
      <ul>
        <li><a href="#intro">Intro</a></li>
        <li><a href="#skill">Skill</a></li>
        <li><a href="#site">Site</a></li>
        <li><a href="#port">Portfolio</a></li>
        <li><a href="#contact">Contact</a></li>
      </ul>
    </aside>

    <div class="main-content">
      <main id="main" role="main">
        <section id="intro">
          <div class="intro__inner">
            <h1 class="intro__title">hyunchang's home</h1>
            <div class="intro__lines" aria-hidden="true">
              <span class="line"></span><span class="line"></span><span class="line"></span><span class="line"></span><span class="line"></span><span class="line"></span><span class="line"></span>
            </div>
            <div class="intro__text">
              <div class="text">
                <div>개발자</div>
              </div>
              <div class="img">
                <img src="../assets/img/내사진2.jpg" alt="인시드니" />
              </div>
            </div>
            <div class="intro__lines bottom" aria-hidden="true">
              <span class="line"></span><span class="line"></span><span class="line"></span><span class="line"></span><span class="line"></span><span class="line"></span><span class="line"></span>
            </div>
          </div>
        </section>
        <section id="skill">
          <div class="skill__inner">
            <h2 class="skill__title">Challenge <em>나의 도전</em></h2>
            <div class="skill__desc">
              <div>
                <span>2017.09 ~ 2021.09</span>
                <h3>(주)나일소프트</h3>
                <p>웹 취약점점검 솔루션 개발 및 유지보수</p>
                <p>JAVA 웹 개발</p>
                <p>clireport 보고서 개발</p>
              </div>
              <div>
                <span>2021.09 ~ 2021.11</span>
                <h3>(주)아이나비모빌리티</h3>
                <p>서버개발</p>
              </div>
              <div>
                <span>2021.11 ~ 2024.10</span>
                <h3>(주)NHN다이퀘스트</h3>
                <p>AI 콜봇 개발 및 유지보수</p>
                <p>엔진 및 딥러닝 패치</p>
                <p>딥러닝 CI/CD 구축 (docker, 젠킨스, 깃)</p>
              </div>
              <div>
                <span>2025.04 ~ 재직중</span>
                <h3>(주)포니링크</h3>
                <p>LLM 개발운영 - 대규모 언어 모델 프로젝트</p>
              </div>
            </div>
          </div>
        </section>
        <section id="site">
          <div class="site__inner">
            <h2 class="site__title">Site coding <em>나의 작업물</em></h2>
            <div class="site__wrap">
              <article class="site__item s1">
                <span class="num">1.</span>
                <div class="text">
                  <div>Make</div><div>site compliant with</div><div>webstandard</div>
                </div>
                <h3 class="title">웹 표준을 준수한 사이트 제작</h3>
                <div class="btn">
                  <a href="https://github.com/ParkHyunchang/port2023-vite">code</a>
                  <a href="https://hyunchang-vite.netlify.app/">view</a>
                </div>
                <div class="info">
                  <span>site coding</span>
                  <span>production period : two days</span>
                  <span>use stack : html5/css3, CSS Variable, Vite</span>
                </div>
              </article>
              <article class="site__item s2">
                <span class="num">2.</span>
                <div class="text">
                  <div>Make</div><div>site compliant with</div><div>react.js</div>
                </div>
                <h3 class="title">리액트를 이용한 사이트 제작</h3>
                <div class="btn">
                  <a href="https://github.com/ParkHyunchang/port2023-react">code</a>
                  <a href="https://sydney-withsuhyun-react.netlify.app/">view</a>
                </div>
                <div class="info">
                  <span>site coding</span>
                  <span>production period : two days</span>
                  <span>use stack : HTML5/CSS3, CSS Variable, Vite</span>
                </div>
              </article>
              <article class="site__item s3">
                <span class="num">3.</span>
                <div class="text">
                  <div>Make</div><div>site compliant with</div><div>vue.js</div>
                </div>
                <h3 class="title">뷰를 이용한 사이트 제작</h3>
                <div class="btn">
                  <a href="https://github.com/ParkHyunchang/port2023-vue">code</a>
                  <a href="https://suhyun100-vue.netlify.app/">view</a>
                </div>
                <div class="info">
                  <span>site coding</span>
                  <span>production period : two days</span>
                  <span>use stack : vue.js, CSS Variable, vite</span>
                </div>
              </article>
              <article class="site__item s4">
                <span class="num">4.</span>
                <div class="text">
                  <div>Make</div><div>site compliant with</div><div>next.js</div>
                </div>
                <h3>넥스트를 이용한 사이트 제작</h3>
                <div class="btn">
                  <a href="https://github.com/ParkHyunchang/port2023-next">code</a>
                  <a href="https://osaka-with-suhyun-next.netlify.app/">view</a>
                </div>
                <div class="info">
                  <span>site coding</span>
                  <span>production period : two days</span>
                  <span>use stack : next.js, CSS Variable, Vite</span>
                </div>
              </article>
            </div>
          </div>
        </section>
        <section id="port">
          <div class="port__inner">
            <div class="port__title">portfolio <em>포폴 작업물</em></div>
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
              <article class="port__item p6">
                <span class="num">06.</span>
                <h3 class="title">추가예정</h3>
                <p class="desc">추가예정</p>
              </article>
              <article class="port__item p7">
                <span class="num">07.</span>
                <h3 class="title">추가예정</h3>
                <p class="desc">추가예정</p>
              </article>
              <article class="port__item p8">
                <span class="num">08.</span>
                <h3 class="title">추가예정</h3>
                <p class="desc">추가예정</p>
              </article>
              <article class="port__item p9">
                <span class="num">09.</span>
                <h3 class="title">추가예정</h3>
                <p class="desc">추가예정</p>
              </article>
              <article class="port__item p10">
                <span class="num">10.</span>
                <h3 class="title">추가예정</h3>
                <p class="desc">추가예정</p>
              </article>
            </div>
          </div>
        </section>
        <section id="contact">
          <div class="contact__inner">
            <h2 class="contact__title">Contact</h2>
            <div class="contact__lines" aria-hidden="true">
              <span class="line"></span><span class="line"></span><span class="line"></span><span class="line"></span><span class="line"></span><span class="line"></span><span class="line"></span>
            </div>
            <div class="contact__text">
              <div class="text">
                <div>
                  <a href="https://open.kakao.com/" target="_blank">KAKAO : hyunchang</a>
                </div>
                <div>
                  <a href="mailto:hyunchang1234@hanmail.net" target="_blank">mail : hyunchang1234@hanmail.net</a>
                </div>
              </div>
            </div>
            <div class="contact__lines bottom" aria-hidden="true">
              <span class="line"></span><span class="line"></span><span class="line"></span><span class="line"></span><span class="line"></span><span class="line"></span><span class="line"></span>
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
              </ul>
            </div>
          </div>
          <div class="footer__right">
            © 2023 hyunchang<br />
            이 사이트는 뷰3를 이용하여 제작하였습니다.
          </div>
        </div>
      </footer>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HomePage',
};
</script>

<style src="@/assets/css/style.css"></style>

<style>
/* 데스크탑(기존 스타일) */
.main-side-menu {
  position: fixed;
  top: 0;
  left: 0;
  width: 160px;
  height: 100vh;
  background: #e5ded8;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  box-shadow: 2px 0 8px rgba(0,0,0,0.03);
}
.main-side-menu ul {
  list-style: none;
  padding: 0;
  margin: 80px 0 0 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.main-side-menu li {
  margin: 0;
}
.main-side-menu a {
  display: block;
  padding: 18px 24px;
  color: #333;
  text-decoration: none;
  font-weight: bold;
  border-radius: 8px;
  transition: background 0.2s;
}
.main-side-menu a:hover,
.main-side-menu a:focus {
  background: #d6cec7;
}
.main-content {
  padding-left: 160px;
}

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

/* 모바일(800px 이하)에서만 본문 100%, 사이드 메뉴 숨김, 인트로 개선 */
@media (max-width: 800px) {
  .main-side-menu {
    display: none;
  }
  .main-content {
    padding-left: 0;
    width: 100%;
  }
  .intro__title {
    font-size: 2rem;
    text-align: center;
    margin-top: 2rem;
    word-break: keep-all;
  }
  .intro__inner {
    align-items: center;
    padding: 1rem;
  }
  .intro__text .img {
    width: 60vw;
    height: 60vw;
    max-width: 300px;
    max-height: 300px;
    margin: 0 auto;
  }
  .skill__title {
    font-size: 1.5rem;
    margin-bottom: 1.2rem;
  }
  .skill__desc > div {
    margin-top: 1rem;
  }
}
</style>
