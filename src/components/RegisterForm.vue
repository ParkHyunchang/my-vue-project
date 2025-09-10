<template>
  <div class="register-form">
    <div class="form-container">
      <h2>회원가입</h2>
      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label for="username">ID</label>
          <input
            id="username"
            v-model="form.username"
            type="text"
            required
            placeholder="ID를 입력하세요"
            @blur="checkUsername"
            :class="{ 'error': usernameError, 'success': usernameSuccess }"
          />
          <div v-if="usernameError" class="error-message">
            {{ usernameError }}
          </div>
          <div v-if="usernameSuccess" class="success-message">
            {{ usernameSuccess }}
          </div>
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
          />
          <div v-if="emailError" class="error-message">
            {{ emailError }}
          </div>
          <div v-if="emailSuccess" class="success-message">
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
          />
        </div>
        
        <div class="form-group">
          <label for="confirmPassword">비밀번호 확인</label>
          <input
            id="confirmPassword"
            v-model="form.confirmPassword"
            type="password"
            required
            placeholder="비밀번호를 다시 입력하세요"
          />
          <div v-if="form.confirmPassword && !isPasswordMatch" class="error-message">
            비밀번호가 일치하지 않습니다.
          </div>
        </div>
        
        <div class="form-group">
          <label for="role">권한</label>
          <select id="role" v-model="form.role" required>
            <option value="USER">일반 사용자</option>
            <option value="PREMIUM">프리미엄 사용자</option>
          </select>
        </div>
        
        <button type="submit" :disabled="loading || !isFormValid" class="register-btn">
          {{ loading ? '회원가입 중...' : '회원가입' }}
        </button>
        
        <div class="form-footer">
          <p>이미 계정이 있으신가요? <a href="#" @click.prevent="switchToLogin">로그인</a></p>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { mapActions } from 'vuex';

export default {
  name: 'RegisterForm',
  data() {
    return {
      form: {
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'USER'
      },
      loading: false,
      usernameError: '',
      usernameSuccess: '',
      emailError: '',
      emailSuccess: '',
      checkingUsername: false,
      checkingEmail: false
    };
  },
  computed: {
    isPasswordMatch() {
      return this.form.password === this.form.confirmPassword;
    },
    isFormValid() {
      return this.form.username.trim() && 
             this.form.email.trim() && 
             this.form.password.trim() && 
             this.isPasswordMatch &&
             !this.usernameError &&
             !this.emailError;
    }
  },
  methods: {
    ...mapActions('auth', ['register']),
    
    async checkUsername() {
      if (!this.form.username.trim()) {
        this.usernameError = '';
        this.usernameSuccess = '';
        return;
      }
      
      if (this.checkingUsername) return;
      
      try {
        this.checkingUsername = true;
        this.usernameError = '';
        this.usernameSuccess = '';
        
        const axios = (await import('../axios')).default;
        const response = await axios.get(`/api/auth/check-username/${encodeURIComponent(this.form.username)}`);
        
        if (response.data.available) {
          this.usernameSuccess = response.data.message;
          this.usernameError = '';
        } else {
          this.usernameError = response.data.message;
          this.usernameSuccess = '';
        }
      } catch (error) {
        this.usernameError = '아이디 확인 중 오류가 발생했습니다.';
        this.usernameSuccess = '';
      } finally {
        this.checkingUsername = false;
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
        const { confirmPassword, ...registerData } = this.form;
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

<style scoped>
.register-form {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.form-container {
  background: white;
  padding: 40px;
  border-radius: 10px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

h2 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
  font-size: 28px;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  color: #555;
  font-weight: 500;
}

input, select {
  width: 100%;
  padding: 12px;
  border: 2px solid #e1e5e9;
  border-radius: 6px;
  font-size: 16px;
  transition: border-color 0.3s ease;
  box-sizing: border-box;
}

input:focus, select:focus {
  outline: none;
  border-color: #667eea;
}

input.error {
  border-color: #dc3545;
}

input.success {
  border-color: #28a745;
}

.error-message {
  color: #dc3545;
  font-size: 12px;
  margin-top: 4px;
  font-weight: 500;
}

.success-message {
  color: #28a745;
  font-size: 12px;
  margin-top: 4px;
  font-weight: 500;
}

.register-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.register-btn:hover:not(:disabled) {
  transform: translateY(-2px);
}

.register-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.form-footer {
  text-align: center;
  margin-top: 20px;
}

.form-footer p {
  color: #666;
  margin: 0;
}

.form-footer a {
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
}

.form-footer a:hover {
  text-decoration: underline;
}

.error-message {
  color: #dc3545;
  font-size: 14px;
  margin-top: 5px;
}
</style>
