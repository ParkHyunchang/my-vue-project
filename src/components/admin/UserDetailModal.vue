<template>
  <Modal v-if="show" @close="$emit('close')">
    <template #header>
      <h3>사용자 상세 정보</h3>
    </template>
    <template #body>
      <div class="user-detail-content">
        <div class="user-detail-header">
          <div class="user-avatar-lg">
            <span class="avatar-text">{{ editingUserInfo?.name?.charAt(0) || 'U' }}</span>
          </div>
          <div class="user-basic-info">
            <h4>{{ editingUserInfo?.name || '-' }}</h4>
            <p class="user-id-text">{{ user?.userId || '-' }}</p>
            <span :class="['role-badge-large', editingUserInfo?.role?.toLowerCase()]">
              {{ getRoleDisplayName(editingUserInfo?.role) }}
            </span>
          </div>
        </div>

        <div class="tab-content">
          <div class="info-section">
            <h5>기본 정보</h5>
            <div class="info-grid">
              <div class="info-item">
                <label>이름:</label>
                <input
                  v-model="editingUserInfo.name"
                  type="text"
                  class="form-control-edit"
                  placeholder="이름을 입력하세요"
                />
              </div>
              <div class="info-item">
                <label>이메일:</label>
                <input
                  v-model="editingUserInfo.email"
                  type="email"
                  class="form-control-edit"
                  placeholder="이메일을 입력하세요"
                />
              </div>
              <div class="info-item">
                <label>전화번호:</label>
                <input
                  v-model="editingUserInfo.phone"
                  type="tel"
                  class="form-control-edit"
                  placeholder="전화번호를 입력하세요"
                />
              </div>
              <div class="info-item">
                <label>권한:</label>
                <select
                  v-model="editingUserInfo.role"
                  class="form-control-edit"
                  :disabled="user?.role === 'ADMIN' && !isAllowedAdmin(user?.userId)"
                >
                  <option
                    v-for="roleInfo in assignableRoles(user?.userId)"
                    :key="roleInfo.roleName"
                    :value="roleInfo.roleName"
                  >
                    {{ roleInfo.displayName }}
                  </option>
                </select>
              </div>
              <div class="info-item">
                <label>가입일:</label>
                <span class="readonly-info">{{ formatDate(user?.createdAt) }}</span>
              </div>
              <div class="info-item">
                <label>수정일:</label>
                <span class="readonly-info">{{ formatDate(user?.updatedAt) }}</span>
              </div>
            </div>
          </div>

          <!-- 비밀번호 변경 -->
          <div class="info-section password-section">
            <h5>비밀번호 변경</h5>
            <div class="info-grid">
              <div class="info-item">
                <label>새 비밀번호:</label>
                <input v-model="newPassword" type="password" class="form-control-edit" placeholder="새 비밀번호 (최소 6자)" />
                <div v-if="newPassword && newPassword.length < 6" class="error-message">최소 6자 이상이어야 합니다.</div>
              </div>
              <div class="info-item">
                <label>비밀번호 확인:</label>
                <input v-model="confirmNewPassword" type="password" class="form-control-edit" placeholder="비밀번호 확인" />
                <div v-if="newPassword && confirmNewPassword && newPassword !== confirmNewPassword" class="error-message">비밀번호가 일치하지 않습니다.</div>
              </div>
            </div>
            <div class="password-change-action">
              <button
                class="btn btn-secondary"
                :disabled="loadingPassword || !isPasswordChangeValid"
                @click="onPasswordChange"
              >
                {{ loadingPassword ? '변경 중...' : '비밀번호 변경' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="modal-actions-horizontal">
        <div class="modal-actions-left">
          <button
            class="btn btn-delete"
            :disabled="user?.userId === currentUser?.username || user?.role === 'ADMIN'"
            :title="user?.userId === currentUser?.username ? '본인 계정은 삭제할 수 없습니다' : user?.role === 'ADMIN' ? '관리자 계정은 삭제할 수 없습니다' : ''"
            @click="$emit('request-delete', user)"
          >
            삭제
          </button>
        </div>
        <div class="modal-actions-right">
          <button
            class="btn btn-edit"
            :disabled="loadingUpdate || !hasUserInfoChanged"
            @click="onUpdate"
          >
            {{ loadingUpdate ? '수정 중...' : '정보 수정' }}
          </button>
          <button class="btn btn-secondary" @click="$emit('close')">닫기</button>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script>
import { ref, computed, watch } from "vue";
import Modal from "@/components/Modal.vue";

const EMPTY_INFO = { name: "", email: "", phone: "", role: "USER" };

export default {
  name: "UserDetailModal",
  components: { Modal },
  props: {
    show: { type: Boolean, default: false },
    user: { type: Object, default: null },
    loadingUpdate: { type: Boolean, default: false },
    loadingPassword: { type: Boolean, default: false },
    roleInfos: { type: Array, default: () => [] },
    allowedAdmins: { type: Array, default: () => [] },
    currentUser: { type: Object, default: null },
  },
  emits: ["close", "update", "password-change", "request-delete"],
  setup(props, { emit }) {
    const editingUserInfo = ref({ ...EMPTY_INFO });
    const newPassword = ref("");
    const confirmNewPassword = ref("");

    watch(
      () => props.user,
      (user) => {
        if (user) {
          editingUserInfo.value = {
            name: user.name || "",
            email: user.email || "",
            phone: user.phone || "",
            role: user.role || "USER",
          };
        } else {
          editingUserInfo.value = { ...EMPTY_INFO };
        }
      },
      { immediate: true },
    );

    watch(
      () => props.show,
      (show) => {
        if (!show) {
          newPassword.value = "";
          confirmNewPassword.value = "";
        }
      },
    );

    const isAllowedAdmin = (username) => props.allowedAdmins.includes(username);

    const assignableRoles = (userId) =>
      props.roleInfos.filter((r) => {
        if (r.roleName === "ADMIN") return isAllowedAdmin(userId);
        return true;
      });

    const getRoleDisplayName = (role) => {
      const found = props.roleInfos.find((r) => r.roleName === role);
      return found ? found.displayName : (role || "-");
    };

    const formatDate = (dateString) => {
      if (!dateString) return "-";
      const date = new Date(dateString);
      return date.toLocaleDateString("ko-KR", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
      });
    };

    const hasUserInfoChanged = computed(() => {
      if (!props.user) return false;
      return editingUserInfo.value.name !== (props.user.name || "") ||
        editingUserInfo.value.email !== (props.user.email || "") ||
        editingUserInfo.value.phone !== (props.user.phone || "") ||
        editingUserInfo.value.role !== (props.user.role || "USER");
    });

    const isPasswordChangeValid = computed(() => {
      return newPassword.value.length >= 6 &&
        newPassword.value === confirmNewPassword.value;
    });

    const onUpdate = () => {
      emit("update", {
        id: props.user.id,
        name: editingUserInfo.value.name,
        email: editingUserInfo.value.email,
        phone: editingUserInfo.value.phone,
        role: editingUserInfo.value.role,
      });
    };

    const onPasswordChange = () => {
      emit("password-change", {
        id: props.user.id,
        password: newPassword.value,
      });
      newPassword.value = "";
      confirmNewPassword.value = "";
    };

    return {
      editingUserInfo, newPassword, confirmNewPassword,
      hasUserInfoChanged, isPasswordChangeValid,
      assignableRoles, isAllowedAdmin,
      getRoleDisplayName, formatDate,
      onUpdate, onPasswordChange,
    };
  },
};
</script>

<style src="@/assets/css/admin.css" scoped></style>
