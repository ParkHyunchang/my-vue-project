<template>
  <div class="register-form">
    <div class="form-container">
      <h2>회원가입</h2>
      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label for="userId">ID</label>
          <input
            id="userId"
            v-model="form.userId"
            type="text"
            required
            placeholder="ID를 입력하세요"
            @blur="checkUserId"
            :class="{ 'error': userIdError, 'success': userIdSuccess }"
          >
          <div
            v-if="userIdError"
            class="error-message"
          >
            {{ userIdError }}
          </div>
          <div
            v-if="userIdSuccess"
            class="success-message"
          >
            {{ userIdSuccess }}
          </div>
        </div>
        
        <div class="form-group">
          <label for="name">이름</label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            required
            placeholder="이름을 입력하세요"
          >
        </div>
        
        <div class="form-group">
          <label for="email">이메일</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            required
            placeholder="이메일을 입력하세요"
            @blur="checkEmail"
            :class="{ 'error': emailError, 'success': emailSuccess }"
          >
          <div
            v-if="emailError"
            class="error-message"
          >
            {{ emailError }}
          </div>
          <div
            v-if="emailSuccess"
            class="success-message"
          >
            {{ emailSuccess }}
          </div>
        </div>
        
        <div class="form-group">
          <label for="password">비밀번호</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            required
            placeholder="비밀번호를 입력하세요"
          >
        </div>
        
        <div class="form-group">
          <label for="confirmPassword">비밀번호 확인</label>
          <input
            id="confirmPassword"
            v-model="form.confirmPassword"
            type="password"
            required
            placeholder="비밀번호를 다시 입력하세요"
          >
          <div
            v-if="form.confirmPassword && !isPasswordMatch"
            class="error-message"
          >
            비밀번호가 일치하지 않습니다.
          </div>
        </div>
        
        <div class="form-group">
          <label for="phone">전화번호</label>
          <input
            id="phone"
            v-model="form.phone"
            type="tel"
            placeholder="전화번호를 입력하세요 (선택사항)"
          >
        </div>
        
        <button
          type="submit"
          :disabled="loading || !isFormValid"
          class="register-btn"
        >
          {{ loading ? '회원가입 중...' : '회원가입' }}
        </button>
        
        <div class="form-footer">
          <p>
            이미 계정이 있으신가요? <a
              href="#"
              @click.prevent="switchToLogin"
            >로그인</a>
          </p>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { mapActions } from 'vuex';

export default {
  name: 'RegisterForm',
  emits: ['switch-to-login'],
  data() {
    return {
      form: {
        userId: '',
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        role: 'USER'
      },
      loading: false,
      userIdError: '',
      userIdSuccess: '',
      emailError: '',
      emailSuccess: '',
      checkingUserId: false,
      checkingEmail: false
    };
  },
  computed: {
    isPasswordMatch() {
      return this.form.password === this.form.confirmPassword;
    },
    isFormValid() {
      return this.form.userId.trim() && 
             this.form.name.trim() &&
             this.form.email.trim() && 
             this.form.password.trim() && 
             this.isPasswordMatch &&
             !this.userIdError &&
             !this.emailError;
    }
  },
  methods: {
    ...mapActions('auth', ['register']),
    
    async checkUserId() {
      if (!this.form.userId.trim()) {
        this.userIdError = '';
        this.userIdSuccess = '';
        return;
      }
      
      if (this.checkingUserId) return;
      
      try {
        this.checkingUserId = true;
        this.userIdError = '';
        this.userIdSuccess = '';
        
        const axios = (await import('../axios')).default;
        const response = await axios.get(`/api/auth/check-username/${encodeURIComponent(this.form.userId)}`);
        
        if (response.data.available) {
          this.userIdSuccess = response.data.message;
          this.userIdError = '';
        } else {
          this.userIdError = response.data.message;
          this.userIdSuccess = '';
        }
      } catch (error) {
        this.userIdError = '아이디 확인 중 오류가 발생했습니다.';
        this.userIdSuccess = '';
      } finally {
        this.checkingUserId = false;
      }
    },
    
    async checkEmail() {
      if (!this.form.email.trim()) {
        this.emailError = '';
        this.emailSuccess = '';
        return;
      }
      
      if (this.checkingEmail) return;
      
      try {
        this.checkingEmail = true;
        this.emailError = '';
        this.emailSuccess = '';
        
        const axios = (await import('../axios')).default;
        const response = await axios.get(`/api/auth/check-email/${encodeURIComponent(this.form.email)}`);
        
        if (response.data.available) {
          this.emailSuccess = response.data.message;
          this.emailError = '';
        } else {
          this.emailError = response.data.message;
          this.emailSuccess = '';
        }
      } catch (error) {
        this.emailError = '이메일 확인 중 오류가 발생했습니다.';
        this.emailSuccess = '';
      } finally {
        this.checkingEmail = false;
      }
    },
    
    async handleRegister() {
      // 비밀번호 확인 검증
      if (!this.isPasswordMatch) {
        this.$store.dispatch('toast/showToast', {
          message: '비밀번호가 일치하지 않습니다.',
          type: 'error'
        });
        return;
      }
      
      this.loading = true;
      
      try {
        const registerData = { ...this.form };
        delete registerData.confirmPassword;
        const result = await this.register(registerData);
        
        if (result.success) {
          this.$store.dispatch('toast/showToast', {
            message: result.message,
            type: 'success'
          });
          this.$router.push('/');
        } else {
          this.$store.dispatch('toast/showToast', {
            message: result.message,
            type: 'error'
          });
        }
      } catch (error) {
        this.$store.dispatch('toast/showToast', {
          message: '회원가입 중 오류가 발생했습니다.',
          type: 'error'
        });
      } finally {
        this.loading = false;
      }
    },
    
    switchToLogin() {
      this.$emit('switch-to-login');
    }
  }
};
</script>

<style src="@/assets/css/auth.css" scoped></style>
