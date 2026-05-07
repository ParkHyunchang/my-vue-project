<template>
  <Modal v-if="show" @close="$emit('close')">
    <template #header>
      <h3>새 사용자 생성</h3>
    </template>
    <template #body>
      <div class="create-form">
        <div class="form-group">
          <label>사용자ID:</label>
          <input v-model="newUser.userId" type="text" class="form-control" placeholder="사용자ID를 입력하세요" />
        </div>
        <div class="form-group">
          <label>이름:</label>
          <input v-model="newUser.name" type="text" class="form-control" placeholder="이름을 입력하세요" />
        </div>
        <div class="form-group">
          <label>이메일:</label>
          <input v-model="newUser.email" type="email" class="form-control" placeholder="이메일을 입력하세요" />
          <div v-if="newUser.email && !isNewUserEmailValid" class="error-message">
            올바른 이메일 형식이 아닙니다.
          </div>
        </div>
        <div class="form-group">
          <label>전화번호:</label>
          <input v-model="newUser.phone" type="tel" class="form-control" placeholder="전화번호를 입력하세요 (선택사항)" />
        </div>
        <div class="form-group">
          <label>비밀번호:</label>
          <input v-model="newUser.password" type="password" class="form-control" placeholder="비밀번호를 입력하세요" />
          <div v-if="newUser.password && newUser.password.length < 6" class="error-message">
            비밀번호는 최소 6자 이상이어야 합니다.
          </div>
        </div>
        <div class="form-group">
          <label>비밀번호 확인:</label>
          <input v-model="newUser.confirmPassword" type="password" class="form-control" placeholder="비밀번호를 다시 입력하세요" />
          <div v-if="newUser.password && newUser.confirmPassword && newUser.password !== newUser.confirmPassword" class="error-message">
            비밀번호가 일치하지 않습니다.
          </div>
        </div>
        <div class="form-group">
          <label>권한:</label>
          <select v-model="newUser.role" class="form-control">
            <option
              v-for="roleInfo in assignableRoles(newUser.userId)"
              :key="roleInfo.roleName"
              :value="roleInfo.roleName"
            >
              {{ roleInfo.displayName }}
            </option>
          </select>
          <div v-if="newUser.role === 'ADMIN' && !isAllowedAdmin(newUser.userId)" class="error-message">
            관리자 권한은 허용된 사용자만 설정할 수 있습니다.
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <button class="btn btn-secondary" @click="$emit('close')">취소</button>
      <button
        class="btn btn-primary"
        :disabled="loading || !isCreateFormValid"
        @click="onCreate"
      >
        {{ loading ? '생성 중...' : '생성' }}
      </button>
    </template>
  </Modal>
</template>

<script>
import { ref, computed, watch } from "vue";
import Modal from "@/components/Modal.vue";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPTY_USER = {
  userId: "", name: "", email: "", phone: "",
  password: "", confirmPassword: "", role: "USER",
};

export default {
  name: "UserCreateModal",
  components: { Modal },
  props: {
    show: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    roleInfos: { type: Array, default: () => [] },
    allowedAdmins: { type: Array, default: () => [] },
  },
  emits: ["close", "create"],
  setup(props, { emit }) {
    const newUser = ref({ ...EMPTY_USER });

    watch(
      () => props.show,
      (show) => {
        if (show) newUser.value = { ...EMPTY_USER };
      },
    );

    const isAllowedAdmin = (username) => props.allowedAdmins.includes(username);

    const assignableRoles = (userId) =>
      props.roleInfos.filter((r) => {
        if (r.roleName === "ADMIN") return isAllowedAdmin(userId);
        return true;
      });

    const isNewUserEmailValid = computed(() => EMAIL_RE.test(newUser.value.email.trim()));

    const isCreateFormValid = computed(() => {
      return newUser.value.userId.trim() &&
        newUser.value.name.trim() &&
        isNewUserEmailValid.value &&
        newUser.value.password.trim() &&
        newUser.value.password.length >= 6 &&
        newUser.value.confirmPassword.trim() &&
        newUser.value.password === newUser.value.confirmPassword &&
        newUser.value.role &&
        !(newUser.value.role === "ADMIN" && !isAllowedAdmin(newUser.value.userId));
    });

    const onCreate = () => {
      emit("create", {
        userId: newUser.value.userId,
        name: newUser.value.name,
        email: newUser.value.email,
        phone: newUser.value.phone,
        password: newUser.value.password,
        role: newUser.value.role,
      });
    };

    return {
      newUser,
      isNewUserEmailValid,
      isCreateFormValid,
      assignableRoles,
      isAllowedAdmin,
      onCreate,
    };
  },
};
</script>

<style src="@/assets/css/admin.css" scoped></style>
