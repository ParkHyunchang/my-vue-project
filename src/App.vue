<template>
  <Navbar />
  <div class="container">
    <router-view />
  </div>

  <Toast />
</template>

<script>
import Toast from "@/components/Toast.vue";
import Navbar from "@/components/Navbar.vue";

export default {
  components: {
    Toast,
    Navbar,
  },
};
</script>

<style>
.container {
  padding-top: 100px; /* navbar 높이보다 더 크게 설정 */
  padding-left: 75px; /* 사이드 메뉴의 width와 동일하게 */
}
@media (max-width: 800px) {
  .container {
    padding-top: 120px; /* 모바일에서는 더 큰 패딩 */
    padding-left: 15px;
  }
}
</style>
