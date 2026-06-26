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

<style src="@/assets/css/pages/change-password.css" scoped></style>
