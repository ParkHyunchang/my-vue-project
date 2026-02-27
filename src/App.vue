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
body {
  background: #f1f5f9;
  margin: 0;
}

.main-wrapper {
  padding-top: 68px;
  width: 100%;
  margin: 0;
  padding-left: 0;
  padding-right: 0;
  overflow-x: hidden;
  min-height: 100vh;
  background: #f1f5f9;
}
</style>
