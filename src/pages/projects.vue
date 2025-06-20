<template>
  <div class="projects-landing">
    <!-- 섹션 1: 인트로 -->
    <section class="section intro">
      <h2>경력 및 프로젝트</h2>
      <p>다양한 기업에서 쌓은 실무 경험과 주요 프로젝트를 소개합니다.</p>
    </section>

    <!-- 섹션 2: 포니링크 -->
    <section class="section company">
      <h3>포니링크 <span>2025.04 ~ (재직중)</span></h3>
      <ul>
        <li>LLM 개발운영 - 대규모 언어 모델 프로젝트</li>
      </ul>
    </section>

    <!-- 섹션 3: 엔에이치엔다이퀘스트 -->
    <section class="section company">
      <h3>엔에이치엔다이퀘스트 <span>2021.11 ~ 2024.10 (35개월)</span></h3>
      <ul>
        <li>국민은행 - 챗봇/콜봇 SI 1차</li>
        <li>법률구조공단 - 챗봇 백엔드 개발</li>
        <li>국민은행 - 챗봇/콜봇 SI 고도화</li>
        <li>한전, 신한은행, 흥국화재, 하나손보, 신한라이프, 신한투자증권, 삼성카드 등 SM</li>
      </ul>
    </section>

    <!-- 섹션 4: 아이나비모빌리티 -->
    <section class="section company">
      <h3>아이나비모빌리티 <span>2021.10 ~ 2021.11 (1개월)</span></h3>
      <ul>
        <li>네비게이션 로그 개발</li>
      </ul>
    </section>

    <!-- 섹션 5: 나일소프트 -->
    <section class="section company">
      <h3>나일소프트 <span>2017.09 ~ 2021.09 (49개월)</span></h3>
      <ul>
        <li>교통안전공단, 아산병원 - 웹 취약점 점검 프로젝트 SI</li>
        <li>국민카드 - 웹 취약점 점검 프로젝트 SM</li>
      </ul>
    </section>

    <!-- 섹션 6: 칼라세븐 -->
    <section class="section company">
      <h3>칼라세븐 <span>2016.11 ~ 2017.02 (3개월)</span></h3>
      <ul>
        <li>생리통 치료기기 임베디드 개발</li>
      </ul>
    </section>
  </div>
</template>

<script>
export default {
  name: 'ProjectsPage'
}
</script>

<style scoped>
.projects-landing {
  width: 100%;
  overflow-x: hidden;
}
.section {
  min-height: 40vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  transition: background 0.5s;
}
.intro {
  background: #f8f9fa;
  text-align: center;
}
.company {
  background: #fff;
  border-bottom: 1px solid #eee;
  text-align: left;
}
.company h3 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #42b983;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
}
.company h3 span {
  font-size: 1rem;
  color: #888;
  font-weight: normal;
}
.company ul {
  margin: 0;
  padding-left: 1.2rem;
}
.company li {
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
  color: #333;
}
</style> 