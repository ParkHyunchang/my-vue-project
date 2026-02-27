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

<style scoped>
/* ===== 컨테이너 ===== */
.role-management-container {
  padding: 28px 32px;
  max-width: 1200px;
  margin: 0 auto;
}

/* ===== 헤더 ===== */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 28px;
  gap: 16px;
}

.header-content h1 {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 4px;
}

.header-content p {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

/* ===== 요약 카드 ===== */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 28px;
}

.summary-card {
  background: white;
  border-radius: 14px;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.07);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
}

.summary-card.selected {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
}

.card-icon {
  font-size: 26px;
  flex-shrink: 0;
}

.card-body {
  flex: 1;
  min-width: 0;
}

.card-display-name {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 2px;
}

.card-role-name {
  font-size: 11px;
  color: #94a3b8;
  margin: 0 0 4px;
  font-weight: 600;
}

.card-user-count {
  font-size: 12px;
  color: #475569;
  margin: 0;
}

.card-user-count strong {
  color: #3b82f6;
  font-size: 15px;
}

.card-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 20px;
  background: #e2e8f0;
  color: #475569;
}

.card-default-badge {
  position: absolute;
  bottom: 8px;
  right: 8px;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 20px;
  background: #dcfce7;
  color: #166534;
}

/* ===== 섹션 카드 ===== */
.section-card {
  background: white;
  border-radius: 14px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.07);
  margin-bottom: 24px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #f1f5f9;
  gap: 16px;
}

.section-header h2 {
  font-size: 17px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 4px;
}

.section-desc {
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
}

.user-count-badge {
  background: #eff6ff;
  color: #2563eb;
  font-size: 13px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 20px;
}

/* ===== 테이블 ===== */
.table-wrapper {
  overflow-x: auto;
}

.roles-table,
.users-table {
  width: 100%;
  border-collapse: collapse;
}

.roles-table th,
.users-table th {
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 10px 16px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
}

.roles-table td,
.users-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
  color: #374151;
  font-size: 14px;
  vertical-align: middle;
}

.roles-table tr:last-child td,
.users-table tr:last-child td {
  border-bottom: none;
}

.roles-table tbody tr {
  cursor: pointer;
  transition: background 0.15s;
}

.roles-table tbody tr:hover,
.users-table tbody tr:hover {
  background: #f8fafc;
}

.roles-table tbody tr.row-selected {
  background: #eff6ff;
}

.role-name-cell {
  font-weight: 600;
  font-size: 13px;
}

.desc-cell {
  max-width: 280px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.date-cell {
  white-space: nowrap;
  font-size: 13px;
  color: #94a3b8;
}

/* ===== 타입 배지 ===== */
.type-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  white-space: nowrap;
}

.type-default {
  background: #dcfce7;
  color: #166534;
}

.type-custom {
  background: #ede9fe;
  color: #5b21b6;
}

/* ===== 인라인 수정 입력 ===== */
.inline-input {
  width: 100%;
  min-width: 120px;
  padding: 5px 8px;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
}

.desc-input {
  min-width: 240px;
}

/* ===== 사용자 수 버튼 ===== */
.user-count-btn {
  background: #eff6ff;
  color: #2563eb;
  border: none;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.user-count-btn:hover {
  background: #dbeafe;
}

/* ===== 권한 변경 셀렉트 ===== */
.role-select {
  padding: 4px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
  background: white;
  cursor: pointer;
  outline: none;
}

.role-select:focus { border-color: #3b82f6; }
.role-select:disabled { opacity: 0.5; cursor: not-allowed; }

/* ===== 버튼 공통 ===== */
.btn {
  padding: 7px 14px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-refresh {
  background: #f1f5f9;
  color: #475569;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-refresh:hover:not(:disabled) { background: #e2e8f0; }

.btn-create {
  background: #3b82f6;
  color: white;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-create:hover { background: #2563eb; }

.btn-edit {
  background: #eff6ff;
  color: #2563eb;
}

.btn-edit:hover { background: #dbeafe; }

.btn-delete {
  background: #fff1f2;
  color: #e11d48;
}

.btn-delete:hover:not(:disabled) { background: #ffe4e6; }

.btn-save-inline {
  background: #22c55e;
  color: white;
}

.btn-save-inline:hover:not(:disabled) { background: #16a34a; }

.btn-cancel {
  background: #f1f5f9;
  color: #64748b;
}

.btn-cancel:hover { background: #e2e8f0; }

.btn-retry {
  background: #3b82f6;
  color: white;
  margin-top: 12px;
}

.btn-submit {
  background: #3b82f6;
  color: white;
  padding: 9px 24px;
}

.btn-submit:hover:not(:disabled) { background: #2563eb; }

.action-btns {
  display: flex;
  gap: 6px;
}

/* ===== 모달 ===== */
.modal-overlay {
  position: fixed;
  top: 68px; /* 상단 Navbar 높이 */
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2px);
  z-index: 9000;
  overflow-y: auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px 16px;
  box-sizing: border-box;
}

.modal-box {
  background: white;
  border-radius: 16px;
  width: 480px;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  overflow: hidden;
  margin: auto;
  flex-shrink: 0;
}

@media (max-width: 600px) {
  .modal-overlay {
    top: 68px;
    padding: 12px 8px;
  }
  .modal-box {
    border-radius: 16px;
    width: 100%;
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
  flex-shrink: 0;
}

.modal-header h3 {
  font-size: 17px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 18px;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  line-height: 1;
  transition: all 0.15s;
}

.modal-close:hover { background: #f1f5f9; color: #475569; }

.modal-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.required {
  color: #ef4444;
}

.form-input,
.form-textarea {
  padding: 9px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  color: #1e293b;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
  box-sizing: border-box;
}

.form-input:focus,
.form-textarea:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59,130,246,0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-hint {
  font-size: 12px;
  color: #94a3b8;
  margin: 0;
}

.form-readonly {
  padding: 9px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  color: #475569;
  font-weight: 600;
}

/* 토글 스위치 */
.toggle-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.toggle-track {
  position: absolute;
  inset: 0;
  background: #cbd5e1;
  border-radius: 24px;
  cursor: pointer;
  transition: background 0.2s;
}

.toggle-track::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  top: 3px;
  left: 3px;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.toggle-switch input:checked + .toggle-track {
  background: #3b82f6;
}

.toggle-switch input:checked + .toggle-track::before {
  transform: translateX(20px);
}

.toggle-label {
  font-size: 13px;
  color: #475569;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid #f1f5f9;
  flex-shrink: 0;
}

/* ===== 상태 ===== */
.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #94a3b8;
  gap: 12px;
  font-size: 14px;
}

.error-state { color: #ef4444; }
.error-icon { font-size: 32px; }

.loading-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 24px;
  color: #94a3b8;
  font-size: 14px;
}

/* ===== 스피너 ===== */
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.spinner-sm {
  width: 18px;
  height: 18px;
  border: 2px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ===== 토스트 ===== */
.toast {
  position: fixed;
  bottom: 28px;
  right: 28px;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  z-index: 9999;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  max-width: 360px;
}

.toast-success { background: #22c55e; color: white; }
.toast-error   { background: #ef4444; color: white; }

.toast-fade-enter-active,
.toast-fade-leave-active { transition: all 0.3s ease; }
.toast-fade-enter-from,
.toast-fade-leave-to { opacity: 0; transform: translateY(12px); }

/* ===== 모달 트랜지션 ===== */
.modal-fade-enter-active,
.modal-fade-leave-active { transition: all 0.25s ease; }
.modal-fade-enter-from,
.modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-from .modal-box,
.modal-fade-leave-to .modal-box { transform: scale(0.95); }

/* ===== 반응형 ===== */
@media (max-width: 768px) {
  .role-management-container { padding: 16px; }
  .summary-cards { grid-template-columns: 1fr 1fr; }
  .page-header { flex-direction: column; }
  .desc-cell { max-width: 160px; }
}

@media (max-width: 480px) {
  .summary-cards { grid-template-columns: 1fr; }
  .header-actions { width: 100%; }
  .btn-create, .btn-refresh { flex: 1; justify-content: center; }
}
</style>
