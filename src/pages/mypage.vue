<template>
  <div class="mypage-wrap">
    <div class="mypage-card">
      <div class="mypage-header">
        <div class="mypage-avatar">{{ userInitial }}</div>
        <div>
          <h2 class="mypage-title">내 정보 수정</h2>
          <p class="mypage-sub">{{ user.username }} · {{ user.role }}</p>
        </div>
      </div>

      <form @submit.prevent="handleSubmit" class="mypage-form">
        <div class="form-group">
          <label>아이디 (변경 불가)</label>
          <input type="text" :value="user.username" disabled class="input-disabled" />
        </div>
        <div class="form-group">
          <label>이름</label>
          <input
            v-model="form.name"
            type="text"
            placeholder="이름을 입력하세요"
            :class="{ error: errors.name }"
          />
          <span v-if="errors.name" class="field-error">{{ errors.name }}</span>
        </div>
        <div class="form-group">
          <label>이메일</label>
          <input
            v-model="form.email"
            type="email"
            placeholder="이메일을 입력하세요"
            :class="{ error: errors.email }"
          />
          <span v-if="errors.email" class="field-error">{{ errors.email }}</span>
        </div>
        <div class="form-group">
          <label>전화번호</label>
          <input
            v-model="form.phone"
            type="tel"
            placeholder="전화번호를 입력하세요 (선택)"
          />
        </div>

        <div class="form-actions">
          <button type="button" class="btn-cancel" @click="$router.back()">취소</button>
          <button type="submit" class="btn-submit" :disabled="loading">
            {{ loading ? '저장 중...' : '저장' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';

export default {
  name: 'MyPage',
  setup() {
    const store = useStore();
    const user = computed(() => store.getters['auth/user']);
    const userInitial = computed(() => user.value?.username?.charAt(0)?.toUpperCase() || '?');
    const loading = ref(false);

    const form = ref({ name: '', email: '', phone: '' });
    const errors = ref({ name: '', email: '' });

    onMounted(async () => {
      const result = await store.dispatch('auth/fetchProfile');
      if (result) {
        form.value.name = result.name || '';
        form.value.email = result.email || '';
        form.value.phone = result.phone || '';
      }
    });

    const validate = () => {
      errors.value = { name: '', email: '' };
      if (!form.value.name.trim()) {
        errors.value.name = '이름을 입력해주세요.';
        return false;
      }
      if (!form.value.email.trim()) {
        errors.value.email = '이메일을 입력해주세요.';
        return false;
      }
      const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailReg.test(form.value.email)) {
        errors.value.email = '올바른 이메일 형식을 입력해주세요.';
        return false;
      }
      return true;
    };

    const handleSubmit = async () => {
      if (!validate()) return;
      loading.value = true;
      const result = await store.dispatch('auth/updateProfile', {
        name: form.value.name.trim(),
        email: form.value.email.trim(),
        phone: form.value.phone.trim() || null,
      });
      loading.value = false;
      if (result.success) {
        store.dispatch('toast/showToast', { message: '정보가 수정되었습니다.', type: 'success' });
      } else {
        store.dispatch('toast/showToast', { message: result.message || '수정에 실패했습니다.', type: 'error' });
      }
    };

    return { user, userInitial, form, errors, loading, handleSubmit };
  }
};
</script>

<style scoped>
.mypage-wrap {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: calc(100vh - 68px);
  padding: 48px 20px;
  background: var(--mainBg-color);
}

.mypage-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border-strong);
  border-radius: 12px;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.5);
  width: 100%;
  max-width: 460px;
  padding: 36px 40px;
}

.mypage-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--card-border);
}

.mypage-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), #8a6030);
  color: var(--text-on-accent);
  font-size: 22px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--accent-glow);
  flex-shrink: 0;
}

.mypage-title {
  font-size: 20px;
  font-family: "Playfair Display", serif;
  color: var(--accent);
  margin: 0 0 4px;
}

.mypage-sub {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.mypage-form .form-group {
  margin-bottom: 20px;
}

.mypage-form label {
  display: block;
  margin-bottom: 7px;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.mypage-form input {
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

.mypage-form input:focus {
  outline: none;
  border-color: var(--input-focus-border);
  box-shadow: 0 0 0 3px var(--input-focus-shadow);
}

.mypage-form input.error {
  border-color: var(--danger-color);
}

.input-disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
  .mypage-card { padding: 24px 20px; }
}
</style>
