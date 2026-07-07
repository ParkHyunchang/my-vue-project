<template>
  <div class="mypage-wrap">
    <div class="mypage-card">
      <div class="mypage-header">
        <div class="mypage-avatar">
          {{ userInitial }}
        </div>
        <div>
          <h2 class="mypage-title">
            내 정보 수정
          </h2>
          <p class="mypage-sub">
            {{ user.username }} · {{ user.role }}
          </p>
        </div>
      </div>

      <form
        @submit.prevent="handleSubmit"
        class="mypage-form"
      >
        <div class="form-group">
          <label>아이디 (변경 불가)</label>
          <input
            type="text"
            :value="user.username"
            disabled
            class="input-disabled"
          >
        </div>
        <div class="form-group">
          <label>이름</label>
          <input
            v-model="form.name"
            type="text"
            placeholder="이름을 입력하세요"
            :class="{ error: errors.name }"
          >
          <span
            v-if="errors.name"
            class="field-error"
          >{{ errors.name }}</span>
        </div>
        <div class="form-group">
          <label>이메일</label>
          <input
            v-model="form.email"
            type="email"
            placeholder="이메일을 입력하세요"
            :class="{ error: errors.email }"
          >
          <span
            v-if="errors.email"
            class="field-error"
          >{{ errors.email }}</span>
        </div>
        <div class="form-group">
          <label>전화번호</label>
          <input
            v-model="form.phone"
            type="tel"
            placeholder="전화번호를 입력하세요 (선택)"
          >
        </div>

        <div class="form-actions">
          <button
            type="button"
            class="btn-cancel"
            @click="$router.back()"
          >
            취소
          </button>
          <button
            type="submit"
            class="btn-submit"
            :disabled="loading"
          >
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

<style src="@/assets/css/pages/mypage.css" scoped></style>
