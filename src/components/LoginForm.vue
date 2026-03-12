<template>
  <div class="login-form">
    <div class="form-container">
      <h2>로그인</h2>
      <form @submit.prevent="handleLogin">
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
          <label for="password">비밀번호</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            required
            placeholder="비밀번호를 입력하세요"
          />
        </div>
        
        <button type="submit" :disabled="loading" class="login-btn">
          {{ loading ? '로그인 중...' : '로그인' }}
        </button>
        
        <div class="form-footer">
          <p>계정이 없으신가요? <a href="#" @click.prevent="switchToRegister">회원가입</a></p>
          <div class="recovery-links">
            <button type="button" class="link-btn" @click="openFindIdModal">아이디 찾기</button>
            <span class="divider">|</span>
            <button type="button" class="link-btn" @click="openResetPasswordModal">비밀번호 초기화</button>
          </div>
        </div>
      </form>
    </div>

    <teleport to="#modal">
      <Modal v-if="showFindIdModal" @close="closeFindIdModal">
        <template #header>
          <h3>아이디 찾기</h3>
        </template>
        <template #body>
          <form class="modal-form" @submit.prevent="submitFindId">
            <div class="form-group">
              <label for="find-name">이름</label>
              <input
                id="find-name"
                v-model="findIdForm.name"
                type="text"
                required
                placeholder="이름을 입력하세요"
              />
            </div>
            <div class="form-group">
              <label for="find-email">이메일</label>
              <input
                id="find-email"
                v-model="findIdForm.email"
                type="email"
                required
                placeholder="이메일을 입력하세요"
              />
            </div>
            <div v-if="findIdResult" class="result-box">
              <p>찾은 아이디: <strong>{{ findIdResult }}</strong></p>
            </div>
          </form>
        </template>
        <template #footer>
          <button type="button" class="btn-secondary" @click="closeFindIdModal">닫기</button>
          <button
            type="button"
            class="btn-primary"
            :disabled="findIdLoading"
            @click="submitFindId"
          >
            {{ findIdLoading ? '조회 중...' : '아이디 찾기' }}
          </button>
        </template>
      </Modal>
    </teleport>

    <teleport to="#modal">
      <Modal v-if="showResetPasswordModal" @close="closeResetPasswordModal">
        <template #header>
          <h3>비밀번호 초기화</h3>
        </template>
        <template #body>
          <form class="modal-form" @submit.prevent="submitResetPassword">
            <div class="form-group">
              <label for="reset-userId">아이디</label>
              <input
                id="reset-userId"
                v-model="resetPasswordForm.userId"
                type="text"
                required
                placeholder="아이디를 입력하세요"
              />
            </div>
            <div class="form-group">
              <label for="reset-email">이메일</label>
              <input
                id="reset-email"
                v-model="resetPasswordForm.email"
                type="email"
                required
                placeholder="이메일을 입력하세요"
              />
            </div>
            <div class="form-group">
              <label for="reset-phone">전화번호</label>
              <input
                id="reset-phone"
                v-model="resetPasswordForm.phone"
                type="tel"
                required
                placeholder="전화번호를 입력하세요 (숫자만)"
              />
            </div>
            <div class="form-group">
              <label for="reset-password">새 비밀번호</label>
              <input
                id="reset-password"
                v-model="resetPasswordForm.newPassword"
                type="password"
                required
                minlength="8"
                placeholder="새 비밀번호 (8자 이상)"
              />
            </div>
            <div class="form-group">
              <label for="reset-password-confirm">새 비밀번호 확인</label>
              <input
                id="reset-password-confirm"
                v-model="resetPasswordForm.newPasswordConfirm"
                type="password"
                required
                minlength="8"
                placeholder="새 비밀번호를 다시 입력하세요"
              />
            </div>
          </form>
        </template>
        <template #footer>
          <button type="button" class="btn-secondary" @click="closeResetPasswordModal">닫기</button>
          <button
            type="button"
            class="btn-primary"
            :disabled="resetPasswordLoading"
            @click="submitResetPassword"
          >
            {{ resetPasswordLoading ? '변경 중...' : '비밀번호 변경' }}
          </button>
        </template>
      </Modal>
    </teleport>
  </div>
</template>

<script>
import { mapActions } from 'vuex';
import Modal from './Modal.vue';
import axios from '@/axios';

export default {
  name: 'LoginForm',
  components: {
    Modal
  },
  data() {
    return {
      form: {
        username: '',
        password: ''
      },
      loading: false,
      showFindIdModal: false,
      showResetPasswordModal: false,
      findIdForm: {
        name: '',
        email: ''
      },
      findIdLoading: false,
      findIdResult: '',
      resetPasswordForm: {
        userId: '',
        email: '',
        phone: '',
        newPassword: '',
        newPasswordConfirm: ''
      },
      resetPasswordLoading: false
    };
  },
  methods: {
    ...mapActions('auth', ['login']),
    
    async handleLogin() {
      this.loading = true;
      
      try {
        const result = await this.login(this.form);
        
        if (result.success) {
          this.$store.dispatch('toast/showToast', {
            message: result.message,
            type: 'success'
          });
          this.$router.push('/');
        } else {
          const isUsernameError = result.message.includes('존재하지 않는 아이디');
          const isPasswordError = result.message.includes('비밀번호가 올바르지 않습니다');
          
          this.$store.dispatch('toast/showToast', {
            message: result.message,
            type: 'error',
            duration: isUsernameError || isPasswordError ? 4000 : 3000
          });
        }
      } catch (error) {
        this.$store.dispatch('toast/showToast', {
          message: '로그인 중 오류가 발생했습니다.',
          type: 'error'
        });
      } finally {
        this.loading = false;
      }
    },
    
    switchToRegister() {
      this.$emit('switch-to-register');
    },

    openFindIdModal() {
      this.resetFindIdState();
      this.showFindIdModal = true;
    },

    closeFindIdModal() {
      this.showFindIdModal = false;
      this.resetFindIdState();
    },

    resetFindIdState() {
      this.findIdForm = { name: '', email: '' };
      this.findIdLoading = false;
      this.findIdResult = '';
    },

    async submitFindId() {
      if (!this.findIdForm.name.trim() || !this.findIdForm.email.trim()) {
        this.$store.dispatch('toast/showToast', {
          message: '이름과 이메일을 모두 입력해주세요.',
          type: 'error'
        });
        return;
      }

      this.findIdLoading = true;
      try {
        const response = await axios.post('/api/auth/find-id', {
          name: this.findIdForm.name.trim(),
          email: this.findIdForm.email.trim()
        });

        this.findIdResult = response.data.maskedUserId;
        this.$store.dispatch('toast/showToast', {
          message: response.data.message || '아이디를 찾았습니다.',
          type: 'success'
        });
      } catch (error) {
        const message = error.response?.data?.message || '아이디 찾기에 실패했습니다.';
        this.findIdResult = '';
        this.$store.dispatch('toast/showToast', {
          message,
          type: 'error'
        });
      } finally {
        this.findIdLoading = false;
      }
    },

    openResetPasswordModal() {
      this.resetPasswordState();
      this.showResetPasswordModal = true;
    },

    closeResetPasswordModal() {
      this.showResetPasswordModal = false;
      this.resetPasswordState();
    },

    resetPasswordState() {
      this.resetPasswordForm = {
        userId: '',
        email: '',
        phone: '',
        newPassword: '',
        newPasswordConfirm: ''
      };
      this.resetPasswordLoading = false;
    },

    async submitResetPassword() {
      const {
        userId,
        email,
        phone,
        newPassword,
        newPasswordConfirm
      } = this.resetPasswordForm;

      if (!userId.trim() || !email.trim() || !phone.trim() || !newPassword.trim() || !newPasswordConfirm.trim()) {
        this.$store.dispatch('toast/showToast', {
          message: '모든 항목을 입력해주세요.',
          type: 'error'
        });
        return;
      }

      if (newPassword.trim().length < 8) {
        this.$store.dispatch('toast/showToast', {
          message: '비밀번호는 8자 이상이어야 합니다.',
          type: 'error'
        });
        return;
      }

      if (newPassword.trim() !== newPasswordConfirm.trim()) {
        this.$store.dispatch('toast/showToast', {
          message: '새 비밀번호가 일치하지 않습니다.',
          type: 'error'
        });
        return;
      }

      this.resetPasswordLoading = true;
      try {
        const response = await axios.post('/api/auth/reset-password', {
          userId: userId.trim(),
          email: email.trim(),
          phone: phone.trim(),
          newPassword: newPassword.trim()
        });

        this.$store.dispatch('toast/showToast', {
          message: response.data?.message || '비밀번호가 변경되었습니다.',
          type: 'success'
        });
        this.closeResetPasswordModal();
      } catch (error) {
        const message = error.response?.data?.message || '비밀번호 초기화에 실패했습니다.';
        this.$store.dispatch('toast/showToast', {
          message,
          type: 'error'
        });
      } finally {
        this.resetPasswordLoading = false;
      }
    }
  }
};
</script>

<style scoped>
.login-form {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: var(--mainBg-color);
  padding: 20px;
}

.form-container {
  background: var(--card-bg);
  border: 1px solid var(--card-border-strong);
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.5);
  width: 100%;
  max-width: 400px;
}

h2 {
  text-align: center;
  margin-bottom: 30px;
  color: var(--accent);
  font-size: 28px;
  font-family: "Playfair Display", serif;
  letter-spacing: 0.04em;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

input {
  width: 100%;
  padding: 12px 14px;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  color: var(--input-text);
  border-radius: 6px;
  font-size: 15px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  box-sizing: border-box;
}

input:focus {
  outline: none;
  border-color: var(--input-focus-border);
  box-shadow: 0 0 0 3px var(--input-focus-shadow);
}

input::placeholder {
  color: var(--input-placeholder);
}

.login-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, var(--accent) 0%, #b8924a 100%);
  color: var(--text-on-accent);
  border: none;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.login-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--accent-light) 0%, var(--accent) 100%);
  box-shadow: 0 4px 14px var(--accent-glow);
  transform: translateY(-1px);
}

.login-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-footer {
  text-align: center;
  margin-top: 20px;
}

.form-footer p {
  color: var(--text-muted);
  margin: 0;
}

.form-footer a {
  color: var(--accent);
  text-decoration: none;
  font-weight: 500;
}

.form-footer a:hover {
  color: var(--accent-light);
  text-decoration: underline;
}

.recovery-links {
  margin-top: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
}

.link-btn {
  background: none;
  border: none;
  color: var(--accent);
  cursor: pointer;
  font-weight: 500;
  padding: 0;
  font-size: inherit;
}

.link-btn:hover {
  color: var(--accent-light);
  text-decoration: underline;
}

.divider {
  color: var(--card-border);
}

.modal-form .form-group label {
  margin-bottom: 6px;
}

.btn-primary,
.btn-secondary {
  padding: 10px 18px;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.btn-primary {
  background: linear-gradient(135deg, var(--accent) 0%, #b8924a 100%);
  color: var(--text-on-accent);
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--accent-light) 0%, var(--accent) 100%);
}

.btn-secondary {
  background: var(--subBg400);
  color: var(--text-secondary);
  border: 1px solid var(--card-border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--subBg500);
  color: var(--text-primary);
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.result-box {
  margin-top: 15px;
  padding: 12px;
  border-radius: 6px;
  background: var(--accent-dim);
  border: 1px solid var(--card-border);
  color: var(--text-secondary);
  text-align: center;
}

@media (max-width: 480px) {
  .form-container {
    padding: 28px 24px;
  }

  .recovery-links {
    flex-direction: column;
    gap: 4px;
  }

  .divider {
    display: none;
  }
}
</style>
