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
          />
        </div>
        
        <div class="form-group">
          <label for="email">이메일</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            required
            placeholder="이메일을 입력하세요"
          />
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
            <option value="ADMIN">관리자</option>
          </select>
        </div>
        
        <button type="submit" :disabled="loading || !isPasswordMatch" class="register-btn">
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
      loading: false
    };
  },
  computed: {
    isPasswordMatch() {
      return this.form.password === this.form.confirmPassword;
    }
  },
  methods: {
    ...mapActions('auth', ['register']),
    
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
        // confirmPassword 필드는 백엔드로 전송하지 않음
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
