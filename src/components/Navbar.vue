<template>
  <header id="header" role="banner">
    <div class="header__inner">
      <div class="header__logo">
        <router-link to="/">HYUNCHANG'S<br /><em>PORTFOLIO</em></router-link>
      </div>
      <nav class="header__nav" role="navigation" aria-label="메인 메뉴">
        <ul>
          <li><router-link to="/">HOME</router-link></li>
          <li><router-link to="/history">HISTORY</router-link></li>
          <li><router-link to="/projects">PROJECTS</router-link></li>
          <li><router-link to="/todos">TODOS</router-link></li>
          <li><router-link to="/count">COUNT</router-link></li>
        </ul>
      </nav>
    </div>
  </header>
</template>

<script>
export default {
  name: 'Navbar'
}
</script>

<style scoped>
/* 필요하다면 스타일 추가 */
</style>