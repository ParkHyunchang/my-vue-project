<template>
  <Navbar />
  <div class="main-wrapper">
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
.main-wrapper {
  padding-top: 100px; /* navbar 높이보다 더 크게 설정 */
  width: 100%;
  margin: 0;
  padding-left: 0; /* 사이드 메뉴 제거로 인한 패딩 제거 */
  padding-right: 0;
  overflow-x: hidden;
}
@media (max-width: 800px) {
  .main-wrapper {
    padding-top: 120px; /* 모바일에서는 더 큰 패딩 */
    padding-left: 0;
    padding-right: 0;
  }
}
</style>
