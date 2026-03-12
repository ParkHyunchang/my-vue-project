<template>
  <div class="role-management-container">
    <div class="page-header">
      <div class="header-content">
        <h1>권한 관리</h1>
        <p>시스템에 정의된 사용자 권한(Role)을 조회하고 관리합니다</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-refresh" @click="loadRoleInfos" :disabled="loading">
          <span>🔄</span> 새로고침
        </button>
        <button class="btn btn-create" @click="openCreateModal">
          <span>＋</span> 새 권한 추가
        </button>
      </div>
    </div>

    <!-- 로딩 -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>권한 정보를 불러오는 중...</p>
    </div>

    <!-- 에러 -->
    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠️</span>
      <p>{{ error }}</p>
      <button class="btn btn-retry" @click="loadRoleInfos">다시 시도</button>
    </div>

    <template v-else>
      <!-- 요약 카드 -->
      <div class="summary-cards">
        <div
          v-for="role in roleInfos"
          :key="role.id"
          :class="['summary-card', `card-${role.roleName.toLowerCase()}`, { selected: selectedRole === role.roleName }]"
          @click="selectRole(role.roleName)"
        >
          <div class="card-icon">{{ getRoleIcon(role.roleName) }}</div>
          <div class="card-body">
            <p class="card-display-name">{{ role.displayName }}</p>
            <p class="card-role-name">{{ role.roleName }}</p>
            <p class="card-user-count">사용자 <strong>{{ role.userCount }}</strong>명</p>
          </div>
          <div class="card-badge">{{ role.roleName }}</div>
          <div v-if="role.isDefault" class="card-default-badge">기본</div>
        </div>
      </div>

      <!-- 권한 목록 테이블 -->
      <div class="section-card">
        <div class="section-header">
          <h2>권한 목록</h2>
          <p class="section-desc">권한 이름을 클릭하면 해당 권한의 사용자를 조회합니다 · 기본 권한은 삭제 불가</p>
        </div>
        <div class="table-wrapper">
          <table class="roles-table">
            <thead>
              <tr>
                <th>권한</th>
                <th>표시명</th>
                <th>설명</th>
                <th>사용자 수</th>
                <th>구분</th>
                <th>생성일</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="role in roleInfos"
                :key="role.id"
                :class="{ 'row-selected': selectedRole === role.roleName }"
                @click="selectRole(role.roleName)"
              >
                <td>
                  <span class="role-name-cell">
                    {{ getRoleIcon(role.roleName) }} {{ role.roleName }}
                  </span>
                </td>
                <td>{{ role.displayName }}</td>
                <td class="desc-cell">{{ role.description }}</td>
                <td>
                  <button class="user-count-btn" @click.stop="selectRole(role.roleName)">
                    {{ role.userCount }}명
                  </button>
                </td>
                <td>
                  <span :class="['type-badge', role.isDefault ? 'type-default' : 'type-custom']">
                    {{ role.isDefault ? '기본' : '커스텀' }}
                  </span>
                </td>
                <td class="date-cell">{{ formatDate(role.createdAt) }}</td>
                <td @click.stop>
                  <div class="action-btns">
                    <button class="btn btn-edit" @click="openEditModal(role)">수정</button>
                    <button
                      class="btn btn-delete"
                      :disabled="role.isDefault || deletingId === role.id"
                      :title="role.isDefault ? '기본 권한은 삭제할 수 없습니다' : '삭제'"
                      @click="deleteRole(role)"
                    >
                      {{ deletingId === role.id ? '삭제중' : '삭제' }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 선택된 권한의 사용자 목록 -->
      <div class="section-card user-section" v-if="selectedRole">
        <div class="section-header">
          <div>
            <h2>
              {{ getRoleIcon(selectedRole) }}
              {{ getDisplayName(selectedRole) }} 사용자 목록
            </h2>
            <p class="section-desc">해당 권한을 가진 사용자 전체 목록입니다</p>
          </div>
          <div class="header-actions">
            <span class="user-count-badge">총 {{ roleUsers.length }}명</span>
          </div>
        </div>

        <div v-if="usersLoading" class="loading-inline">
          <div class="spinner-sm"></div> 불러오는 중...
        </div>

        <div v-else-if="roleUsers.length === 0" class="empty-state">
          <span>👤</span>
          <p>해당 권한을 가진 사용자가 없습니다</p>
        </div>

        <div v-else class="table-wrapper">
          <table class="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>사용자 ID</th>
                <th>이름</th>
                <th>이메일</th>
                <th>전화번호</th>
                <th>권한 변경</th>
                <th>가입일</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in roleUsers" :key="user.id">
                <td>{{ user.id }}</td>
                <td><strong>{{ user.userId }}</strong></td>
                <td>{{ user.name || '-' }}</td>
                <td>{{ user.email }}</td>
                <td>{{ user.phone || '-' }}</td>
                <td>
                  <select
                    :value="user.role"
                    class="role-select"
                    @change="changeUserRole(user, $event.target.value)"
                    :disabled="changingRoleUserId === user.id"
                  >
                    <option v-for="r in defaultRoleNames" :key="r" :value="r">{{ r }}</option>
                  </select>
                </td>
                <td class="date-cell">{{ formatDate(user.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- 새 권한 생성 모달 -->
    <transition name="modal-fade">
      <div v-if="createModal.visible" class="modal-overlay" @click.self="closeCreateModal">
        <div class="modal-box">
          <div class="modal-header">
            <h3>새 권한 추가</h3>
            <button class="modal-close" @click="closeCreateModal">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>권한 이름 <span class="required">*</span></label>
              <input
                v-model="createForm.roleName"
                class="form-input"
                placeholder="예: MANAGER (영문 대문자 권장)"
                maxlength="50"
                @input="createForm.roleName = createForm.roleName.toUpperCase()"
              />
              <p class="form-hint">영문 대문자로 입력해 주세요. 생성 후 변경 불가합니다.</p>
            </div>
            <div class="form-group">
              <label>표시명 <span class="required">*</span></label>
              <input
                v-model="createForm.displayName"
                class="form-input"
                placeholder="예: 매니저"
                maxlength="100"
              />
            </div>
            <div class="form-group">
              <label>설명 <span class="required">*</span></label>
              <textarea
                v-model="createForm.description"
                class="form-textarea"
                placeholder="이 권한에 대한 설명을 입력해 주세요."
                maxlength="500"
                rows="3"
              ></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-cancel" @click="closeCreateModal">취소</button>
            <button class="btn btn-submit" @click="submitCreate" :disabled="creating">
              {{ creating ? '생성 중...' : '생성' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 권한 수정 모달 -->
    <transition name="modal-fade">
      <div v-if="editModal.visible" class="modal-overlay" @click.self="closeEditModal">
        <div class="modal-box">
          <div class="modal-header">
            <h3>권한 수정</h3>
            <button class="modal-close" @click="closeEditModal">✕</button>
          </div>
          <div class="modal-body">
            <!-- 권한 이름 (읽기 전용) -->
            <div class="form-group">
              <label>권한 이름</label>
              <div class="form-readonly">
                {{ getRoleIcon(editModal.role?.roleName) }} {{ editModal.role?.roleName }}
              </div>
              <p class="form-hint">권한 이름은 생성 후 변경할 수 없습니다.</p>
            </div>

            <div class="form-group">
              <label>표시명 <span class="required">*</span></label>
              <input
                v-model="editForm.displayName"
                class="form-input"
                placeholder="예: 매니저"
                maxlength="100"
              />
            </div>

            <div class="form-group">
              <label>설명 <span class="required">*</span></label>
              <textarea
                v-model="editForm.description"
                class="form-textarea"
                placeholder="이 권한에 대한 설명을 입력해 주세요."
                maxlength="500"
                rows="3"
              ></textarea>
            </div>

            <!-- 시스템 기본 권한(USER/PREMIUM/ADMIN)이 아닌 경우에만 isDefault 토글 표시 -->
            <div class="form-group" v-if="editModal.role && !systemDefaultNames.includes(editModal.role.roleName)">
              <label>삭제 보호 (기본 권한으로 지정)</label>
              <div class="toggle-row">
                <label class="toggle-switch">
                  <input type="checkbox" v-model="editForm.isDefault" />
                  <span class="toggle-track"></span>
                </label>
                <span class="toggle-label">
                  {{ editForm.isDefault ? '활성화 — 이 권한은 삭제할 수 없습니다' : '비활성화 — 이 권한은 삭제 가능합니다' }}
                </span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-cancel" @click="closeEditModal">취소</button>
            <button class="btn btn-submit" @click="submitEdit" :disabled="saving">
              {{ saving ? '저장 중...' : '저장' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 토스트 알림 -->
    <transition name="toast-fade">
      <div v-if="toast.visible" :class="['toast', `toast-${toast.type}`]">
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue';
import api from '../axios.js';

export default {
  name: 'AdminRoleManagement',
  setup() {
    const loading = ref(false);
    const error = ref(null);
    const roleInfos = ref([]);
    const selectedRole = ref(null);
    const roleUsers = ref([]);
    const usersLoading = ref(false);
    const saving = ref(false);
    const deletingId = ref(null);
    const changingRoleUserId = ref(null);

    const createModal = reactive({ visible: false });
    const createForm = reactive({ roleName: '', displayName: '', description: '' });
    const creating = ref(false);

    const editModal = reactive({ visible: false, role: null });
    const editForm = reactive({ displayName: '', description: '', isDefault: false });

    const systemDefaultNames = ['USER', 'PREMIUM', 'ADMIN'];

    const toast = reactive({ visible: false, message: '', type: 'success' });
    let toastTimer = null;

    const defaultRoleNames = ['USER', 'PREMIUM', 'ADMIN'];

    const showToast = (message, type = 'success') => {
      if (toastTimer) clearTimeout(toastTimer);
      toast.message = message;
      toast.type = type;
      toast.visible = true;
      toastTimer = setTimeout(() => { toast.visible = false; }, 3000);
    };

    const getRoleIcon = (roleName) => {
      const icons = { USER: '👤', PREMIUM: '⭐', ADMIN: '👑' };
      return icons[roleName] || '🔖';
    };

    const getDisplayName = (roleName) => {
      const found = roleInfos.value.find(r => r.roleName === roleName);
      return found ? found.displayName : roleName;
    };

    const formatDate = (dateStr) => {
      if (!dateStr) return '-';
      return new Date(dateStr).toLocaleDateString('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit'
      });
    };

    const loadRoleInfos = async () => {
      loading.value = true;
      error.value = null;
      try {
        const res = await api.get('/api/admin/role-infos');
        roleInfos.value = res.data;
      } catch (e) {
        error.value = '권한 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
      } finally {
        loading.value = false;
      }
    };

    const selectRole = async (roleName) => {
      if (selectedRole.value === roleName) {
        selectedRole.value = null;
        roleUsers.value = [];
        return;
      }
      selectedRole.value = roleName;
      usersLoading.value = true;
      try {
        const res = await api.get(`/api/admin/role-infos/${roleName}/users`);
        roleUsers.value = res.data.users || [];
      } catch (e) {
        showToast('사용자 목록 조회에 실패했습니다.', 'error');
        roleUsers.value = [];
      } finally {
        usersLoading.value = false;
      }
    };

    // ===== CREATE =====
    const openCreateModal = () => {
      createForm.roleName = '';
      createForm.displayName = '';
      createForm.description = '';
      createModal.visible = true;
    };

    const closeCreateModal = () => {
      createModal.visible = false;
    };

    const submitCreate = async () => {
      if (!createForm.roleName.trim()) {
        showToast('권한 이름을 입력해 주세요.', 'error');
        return;
      }
      if (!createForm.displayName.trim()) {
        showToast('표시명을 입력해 주세요.', 'error');
        return;
      }
      if (!createForm.description.trim()) {
        showToast('설명을 입력해 주세요.', 'error');
        return;
      }
      creating.value = true;
      try {
        const res = await api.post('/api/admin/role-infos', {
          roleName: createForm.roleName.trim().toUpperCase(),
          displayName: createForm.displayName.trim(),
          description: createForm.description.trim(),
        });
        roleInfos.value.push(res.data);
        closeCreateModal();
        showToast(`'${res.data.roleName}' 권한이 생성되었습니다.`);
      } catch (e) {
        showToast(e.response?.data || '권한 생성에 실패했습니다.', 'error');
      } finally {
        creating.value = false;
      }
    };

    // ===== UPDATE =====
    const openEditModal = (role) => {
      editModal.role = role;
      editForm.displayName = role.displayName;
      editForm.description = role.description;
      editForm.isDefault = role.isDefault;
      editModal.visible = true;
    };

    const closeEditModal = () => {
      editModal.visible = false;
      editModal.role = null;
    };

    const submitEdit = async () => {
      if (!editForm.displayName.trim() || !editForm.description.trim()) {
        showToast('표시명과 설명을 모두 입력해 주세요.', 'error');
        return;
      }
      saving.value = true;
      try {
        const payload = {
          displayName: editForm.displayName.trim(),
          description: editForm.description.trim(),
        };
        if (!systemDefaultNames.includes(editModal.role.roleName)) {
          payload.isDefault = editForm.isDefault;
        }
        const res = await api.put(`/api/admin/role-infos/${editModal.role.id}`, payload);
        const idx = roleInfos.value.findIndex(r => r.id === editModal.role.id);
        if (idx !== -1) roleInfos.value[idx] = res.data;
        closeEditModal();
        showToast('권한 정보가 수정되었습니다.');
      } catch (e) {
        showToast('수정에 실패했습니다.', 'error');
      } finally {
        saving.value = false;
      }
    };

    // ===== DELETE =====
    const deleteRole = async (role) => {
      if (role.isDefault) return;
      if (!confirm(`'${role.displayName}(${role.roleName})' 권한을 삭제하시겠습니까?`)) return;
      deletingId.value = role.id;
      try {
        await api.delete(`/api/admin/role-infos/${role.id}`);
        roleInfos.value = roleInfos.value.filter(r => r.id !== role.id);
        if (selectedRole.value === role.roleName) {
          selectedRole.value = null;
          roleUsers.value = [];
        }
        showToast(`'${role.roleName}' 권한이 삭제되었습니다.`);
      } catch (e) {
        showToast(e.response?.data || '삭제에 실패했습니다.', 'error');
      } finally {
        deletingId.value = null;
      }
    };

    // ===== 사용자 권한 변경 =====
    const changeUserRole = async (user, newRole) => {
      if (user.role === newRole) return;
      if (!confirm(`${user.userId} 사용자의 권한을 ${newRole}(으)로 변경하시겠습니까?`)) return;
      changingRoleUserId.value = user.id;
      try {
        await api.put(`/api/admin/users/${user.id}/role`, { role: newRole });
        user.role = newRole;
        showToast(`${user.userId}의 권한이 ${newRole}로 변경되었습니다.`);
        roleUsers.value = roleUsers.value.filter(u => u.id !== user.id);
        await loadRoleInfos();
      } catch (e) {
        showToast(e.response?.data || '권한 변경에 실패했습니다.', 'error');
      } finally {
        changingRoleUserId.value = null;
      }
    };

    onMounted(loadRoleInfos);

    return {
      loading, error, roleInfos, selectedRole, roleUsers, usersLoading,
      saving, editForm, deletingId, changingRoleUserId,
      createModal, createForm, creating,
      editModal, systemDefaultNames,
      toast, defaultRoleNames,
      getRoleIcon, getDisplayName, formatDate,
      loadRoleInfos, selectRole,
      openCreateModal, closeCreateModal, submitCreate,
      openEditModal, closeEditModal, submitEdit,
      deleteRole, changeUserRole,
    };
  }
};
</script>

<style src="@/assets/css/admin.css" scoped></style>
