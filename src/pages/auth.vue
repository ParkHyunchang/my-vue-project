<template>
  <div class="auth-page">
    <LoginForm
      v-if="isLogin"
      @switch-to-register="isLogin = false"
    />
    <RegisterForm
      v-else
      @switch-to-login="isLogin = true"
    />
  </div>
</template>

<script>
import LoginForm from '../components/LoginForm.vue';
import RegisterForm from '../components/RegisterForm.vue';

export default {
  name: 'AuthPage',
  components: {
    LoginForm,
    RegisterForm
  },
  data() {
    return {
      isLogin: true
    };
  }
};
</script>

<style src="@/assets/css/pages/auth.css" scoped></style>
