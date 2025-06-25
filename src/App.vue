<template>
  <Navbar />
  <div class="container">
    <router-view />
  </div>

  <Toast />
</template>

<script>
import Toast from '@/components/Toast.vue';
import Navbar from '@/components/Navbar.vue';

export default {
  components: {
    Toast,
    Navbar
  },
}
</script>

<style>
.container {
  padding-top: 51px; /* header/nav 높이만큼 조정 */
  padding-left: 75px; /* 사이드 메뉴의 width와 동일하게 */
}
@media (max-width: 800px) {
  .container {
    padding-top: 69px;
    padding-left: 15px;
  }
}
</style>