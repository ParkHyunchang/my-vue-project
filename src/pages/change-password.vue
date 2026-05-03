<template>
  <div class="changepw-wrap">
    <div class="changepw-card">
      <div class="changepw-header">
        <div class="changepw-icon">🔑</div>
        <div>
          <h2 class="changepw-title">비밀번호 수정</h2>
          <p class="changepw-sub">새 비밀번호는 8자 이상이어야 합니다</p>
        </div>
      </div>

      <form @submit.prevent="handleSubmit" class="changepw-form">
        <div class="form-group">
          <label>현재 비밀번호</label>
          <input
            v-model="form.currentPassword"
            type="password"
            placeholder="현재 비밀번호를 입력하세요"
            :class="{ error: errors.currentPassword }"
            autocomplete="current-password"
          />
          <span v-if="errors.currentPassword" class="field-error">{{ errors.currentPassword }}</span>
        </div>
        <div class="form-group">
          <label>새 비밀번호</label>
          <input
            v-model="form.newPassword"
            type="password"
            placeholder="새 비밀번호 (8자 이상)"
            :class="{ error: errors.newPassword }"
            autocomplete="new-password"
          />
          <span v-if="errors.newPassword" class="field-error">{{ errors.newPassword }}</span>
        </div>
        <div class="form-group">
          <label>새 비밀번호 확인</label>
          <input
            v-model="form.confirmPassword"
            type="password"
            placeholder="새 비밀번호를 다시 입력하세요"
            :class="{ error: errors.confirmPassword }"
            autocomplete="new-password"
          />
          <span v-if="errors.confirmPassword" class="field-error">{{ errors.confirmPassword }}</span>
        </div>

        <div class="form-actions">
          <button type="button" class="btn-cancel" @click="$router.back()">취소</button>
          <button type="submit" class="btn-submit" :disabled="loading">
            {{ loading ? '변경 중...' : '비밀번호 변경' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

export default {
  name: 'ChangePassword',
  setup() {
    const store = useStore();
    const router = useRouter();
    const loading = ref(false);

    const form = ref({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const errors = ref({ currentPassword: '', newPassword: '', confirmPassword: '' });

    const validate = () => {
      errors.value = { currentPassword: '', newPassword: '', confirmPassword: '' };
      if (!form.value.currentPassword) {
        errors.value.currentPassword = '현재 비밀번호를 입력해주세요.';
        return false;
      }
      if (!form.value.newPassword || form.value.newPassword.length < 8) {
        errors.value.newPassword = '새 비밀번호는 8자 이상이어야 합니다.';
        return false;
      }
      if (form.value.newPassword !== form.value.confirmPassword) {
        errors.value.confirmPassword = '비밀번호가 일치하지 않습니다.';
        return false;
      }
      return true;
    };

    const handleSubmit = async () => {
      if (!validate()) return;
      loading.value = true;
      const result = await store.dispatch('auth/changePassword', {
        currentPassword: form.value.currentPassword,
        newPassword: form.value.newPassword,
      });
      loading.value = false;
      if (result.success) {
        store.dispatch('toast/showToast', { message: '비밀번호가 변경되었습니다.', type: 'success' });
        router.push('/');
      } else {
        store.dispatch('toast/showToast', { message: result.message || '비밀번호 변경에 실패했습니다.', type: 'error' });
      }
    };

    return { form, errors, loading, handleSubmit };
  }
};
</script>

<style scoped>
.changepw-wrap {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: calc(100vh - 68px);
  padding: 48px 20px;
  background: var(--mainBg-color);
}

.changepw-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border-strong);
  border-radius: 12px;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.5);
  width: 100%;
  max-width: 420px;
  padding: 36px 40px;
}

.changepw-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--card-border);
}

.changepw-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--accent-dim);
  border: 2px solid var(--accent-glow);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.changepw-title {
  font-size: 20px;
  font-family: "Playfair Display", serif;
  color: var(--accent);
  margin: 0 0 4px;
}

.changepw-sub {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
}

.changepw-form .form-group {
  margin-bottom: 20px;
}

.changepw-form label {
  display: block;
  margin-bottom: 7px;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.changepw-form input {
  width: 100%;
  padding: 11px 14px;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  color: var(--input-text);
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  box-sizing: border-box;
}

.changepw-form input:focus {
  outline: none;
  border-color: var(--input-focus-border);
  box-shadow: 0 0 0 3px var(--input-focus-shadow);
}

.changepw-form input.error {
  border-color: var(--danger-color);
}

.field-error {
  display: block;
  margin-top: 5px;
  font-size: 12px;
  color: var(--danger-color);
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 28px;
}

.btn-cancel {
  flex: 1;
  padding: 11px;
  background: transparent;
  border: 1px solid var(--card-border-strong);
  color: var(--text-muted);
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel:hover {
  background: var(--sidebar-link-hover-bg);
  color: var(--text-primary);
}

.btn-submit {
  flex: 2;
  padding: 11px;
  background: linear-gradient(135deg, var(--accent) 0%, #b8924a 100%);
  color: var(--text-on-accent);
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 2px 8px rgba(201, 169, 110, 0.2);
}

.btn-submit:hover:not(:disabled) {
  box-shadow: 0 4px 14px rgba(201, 169, 110, 0.35);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .changepw-card { padding: 24px 20px; }
}
</style>
