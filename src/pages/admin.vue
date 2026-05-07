<template>
  <div class="admin-container">
    <div class="admin-header">
      <h1>사용자 관리</h1>
      <p>사용자 계정 관리</p>
    </div>

    <div class="admin-content">
      <UserListPanel
        :users="users"
        :loading-users="loadingUsers"
        :role-infos="roleInfos"
        @refresh="fetchUsers"
        @open-create="openCreateModal"
        @open-detail="openUserDetailModal"
      />
    </div>

    <UserCreateModal
      :show="showCreateModal"
      :loading="loadingCreate"
      :role-infos="roleInfos"
      :allowed-admins="allowedAdmins"
      @close="closeCreateModal"
      @create="createUser"
    />

    <UserDetailModal
      :show="showUserDetailModal"
      :user="selectedUser"
      :loading-update="loadingUpdate"
      :loading-password="loadingPassword"
      :role-infos="roleInfos"
      :allowed-admins="allowedAdmins"
      :current-user="currentUser"
      @close="closeUserDetailModal"
      @update="updateUserInfo"
      @password-change="changeUserPassword"
      @request-delete="confirmDelete"
    />

    <ConfirmDeleteModal
      :show="showDeleteModal"
      :user="deletingUser"
      :loading="loadingDelete"
      @close="closeDeleteModal"
      @confirm="deleteUser"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { useStore } from "vuex";
import axios from "../axios";
import UserListPanel from "@/components/admin/UserListPanel.vue";
import UserCreateModal from "@/components/admin/UserCreateModal.vue";
import UserDetailModal from "@/components/admin/UserDetailModal.vue";
import ConfirmDeleteModal from "@/components/admin/ConfirmDeleteModal.vue";

const parseApiError = (error, fallback) => {
  const data = error.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") {
    if (data.includes("가입된 메일주소가 있습니다")) return "이미 사용 중인 이메일 주소입니다.";
    if (data.includes("가입된 전화번호가 있습니다")) return "이미 사용 중인 전화번호입니다.";
    if (data.includes("이미 사용 중인 사용자ID")) return "이미 사용 중인 사용자ID입니다.";
    if (data.includes("관리자 권한을 설정할 수 없습니다")) return "관리자 권한을 설정할 수 없습니다.";
    if (data.includes("UK_") || data.includes("constraint") || data.includes("Duplicate")) {
      if (data.includes("email")) return "이미 사용 중인 이메일 주소입니다.";
      if (data.includes("phone")) return "이미 사용 중인 전화번호입니다.";
      if (data.includes("userId")) return "이미 사용 중인 사용자ID입니다.";
      return "입력한 정보에 문제가 있습니다. 다시 확인해주세요.";
    }
    return data;
  }
  return data.message || fallback;
};

export default {
  name: "AdminPage",
  components: { UserListPanel, UserCreateModal, UserDetailModal, ConfirmDeleteModal },
  setup() {
    const store = useStore();
    const users = ref([]);
    const roleInfos = ref([]);
    const allowedAdmins = ref([]);

    const loadingUsers = ref(false);
    const loadingCreate = ref(false);
    const loadingDelete = ref(false);
    const loadingUpdate = ref(false);
    const loadingPassword = ref(false);

    const showCreateModal = ref(false);
    const showUserDetailModal = ref(false);
    const showDeleteModal = ref(false);

    const selectedUser = ref(null);
    const deletingUser = ref(null);

    const currentUser = computed(() => store.getters["auth/user"]);

    const showToast = (message, type) =>
      store.dispatch("toast/showToast", { message, type });

    // ── 데이터 로드 ───────────────────────────────────────
    const loadRoles = async () => {
      try {
        const res = await axios.get("/api/admin/role-infos");
        roleInfos.value = res.data;
      } catch {
        roleInfos.value = [
          { roleName: "USER", displayName: "일반 사용자", isDefault: true },
          { roleName: "PREMIUM", displayName: "프리미엄 사용자", isDefault: true },
          { roleName: "ADMIN", displayName: "관리자", isDefault: true },
        ];
      }
    };

    const loadAllowedAdmins = async () => {
      try {
        const res = await axios.get("/api/admin/allowed-admins");
        allowedAdmins.value = res.data;
      } catch {
        allowedAdmins.value = ["hyunchang88", "admin"];
      }
    };

    const fetchUsers = async () => {
      try {
        loadingUsers.value = true;
        const response = await axios.get("/api/admin/users");
        users.value = response.data;
      } catch (error) {
        showToast(error.response?.data || "사용자 목록을 불러오는데 실패했습니다.", "error");
      } finally {
        loadingUsers.value = false;
      }
    };

    // ── 생성 ──────────────────────────────────────────────
    const openCreateModal = () => { showCreateModal.value = true; };
    const closeCreateModal = () => { showCreateModal.value = false; };

    const createUser = async (userData) => {
      try {
        loadingCreate.value = true;
        await axios.post("/api/admin/users", userData);
        await fetchUsers();
        showToast(`${userData.name} 사용자가 성공적으로 생성되었습니다.`, "success");
        closeCreateModal();
      } catch (error) {
        showToast(parseApiError(error, "사용자 생성에 실패했습니다."), "error");
      } finally {
        loadingCreate.value = false;
      }
    };

    // ── 상세 / 수정 ───────────────────────────────────────
    const openUserDetailModal = async (user) => {
      selectedUser.value = user;
      showUserDetailModal.value = true;
      try {
        const response = await axios.get(`/api/admin/users/${user.id}`);
        selectedUser.value = response.data;
      } catch { /* 캐시 데이터 유지 */ }
    };

    const closeUserDetailModal = () => {
      showUserDetailModal.value = false;
      selectedUser.value = null;
    };

    const updateUserInfo = async (payload) => {
      try {
        loadingUpdate.value = true;
        const response = await axios.put(`/api/admin/users/${payload.id}`, {
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          role: payload.role,
        });
        const updatedUser = response.data;
        const idx = users.value.findIndex((u) => u.id === payload.id);
        if (idx !== -1) users.value[idx] = updatedUser;

        showToast(`${payload.name}의 정보가 성공적으로 수정되었습니다.`, "success");
        closeUserDetailModal();
      } catch (error) {
        showToast(parseApiError(error, "사용자 정보 수정에 실패했습니다."), "error");
      } finally {
        loadingUpdate.value = false;
      }
    };

    const changeUserPassword = async (payload) => {
      try {
        loadingPassword.value = true;
        await axios.put(`/api/admin/users/${payload.id}/password`, {
          password: payload.password,
        });
        const target = selectedUser.value;
        showToast(`${target?.name || target?.userId}의 비밀번호가 변경되었습니다.`, "success");
      } catch (error) {
        showToast(parseApiError(error, "비밀번호 변경에 실패했습니다."), "error");
      } finally {
        loadingPassword.value = false;
      }
    };

    // ── 삭제 ──────────────────────────────────────────────
    const confirmDelete = (user) => {
      showUserDetailModal.value = false;
      deletingUser.value = user;
      showDeleteModal.value = true;
    };

    const closeDeleteModal = () => {
      showDeleteModal.value = false;
      deletingUser.value = null;
    };

    const deleteUser = async () => {
      try {
        loadingDelete.value = true;
        await axios.delete(`/api/admin/users/${deletingUser.value.id}`);
        users.value = users.value.filter((u) => u.id !== deletingUser.value.id);
        showToast(`${deletingUser.value.name} 사용자가 성공적으로 삭제되었습니다.`, "success");
        closeDeleteModal();
      } catch (error) {
        showToast(error.response?.data || "사용자 삭제에 실패했습니다.", "error");
      } finally {
        loadingDelete.value = false;
      }
    };

    onMounted(async () => {
      await Promise.all([loadRoles(), loadAllowedAdmins()]);
      await fetchUsers();
    });

    return {
      users, roleInfos, allowedAdmins,
      loadingUsers, loadingCreate, loadingDelete, loadingUpdate, loadingPassword,
      showCreateModal, showUserDetailModal, showDeleteModal,
      selectedUser, deletingUser, currentUser,
      fetchUsers,
      openCreateModal, closeCreateModal, createUser,
      openUserDetailModal, closeUserDetailModal, updateUserInfo, changeUserPassword,
      confirmDelete, closeDeleteModal, deleteUser,
    };
  },
};
</script>

<style src="@/assets/css/admin.css" scoped></style>
