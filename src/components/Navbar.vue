<template>
  <header id="header" role="banner">
    <div class="header__inner">
      <div class="header__logo">
        <router-link to="/">HYUNCHANG'S<br /><em>HOME</em></router-link>
      </div>
      <nav :class="['header__nav', { show: isOpen }]" role="navigation" aria-label="메인 메뉴">
        <ul>
          <li><router-link to="/" @click="closeMenu">HOME</router-link></li>
          <!-- <li><router-link to="/portfolio" @click="closeMenu">PORTFOLIO</router-link></li> -->
          <!-- <li><router-link to="/projects" @click="closeMenu">PROJECTS</router-link></li> -->
          <li><router-link to="/history" @click="closeMenu">HISTORY</router-link></li>
          <li><router-link to="/todos" @click="closeMenu">TODOS</router-link></li>
          <li><router-link to="/expense" @click="closeMenu">가계부</router-link></li>
        </ul>
      </nav>
      <div class="header__nav__mobile" @click="toggleMenu">
        <span></span>
      </div>
    </div>
  </header>
</template>

<script>
import { ref } from 'vue';
export default {
  name: 'Navbar',
  setup() {
    const isOpen = ref(false);
    const toggleMenu = () => {
      isOpen.value = !isOpen.value;
    };
    const closeMenu = () => {
      isOpen.value = false;
    };
    return { isOpen, toggleMenu, closeMenu };
  }
}
</script>

<style scoped>
/* 필요하다면 스타일 추가 */
</style>