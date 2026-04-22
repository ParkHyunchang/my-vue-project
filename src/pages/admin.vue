<template>
  <div class="admin-container">
    <div class="admin-header">
      <h1>사용자 관리</h1>
      <p>사용자 계정 관리</p>
    </div>

    <div class="admin-content">
      <!-- 사용자 목록 -->
      <div class="users-section">
        <div class="section-header">
          <h2>사용자 목록</h2>
          <div class="header-actions">
            <button @click="openCreateModal" class="btn btn-create">
              새 사용자 생성
            </button>
            <div class="stats">
              <button @click="filterByRole('')" :class="['stat-item', { active: searchFilters.role === '' }]">
                전체: {{ users.length }}명
              </button>
              <button
                v-for="roleInfo in roleInfos"
                :key="roleInfo.roleName"
                @click="filterByRole(roleInfo.roleName)"
                :class="['stat-item', `stat-${roleInfo.roleName.toLowerCase()}`, { active: searchFilters.role === roleInfo.roleName }]"
              >
                {{ roleInfo.displayName }}: {{ countByRole(roleInfo.roleName) }}명
              </button>
            </div>
          </div>
        </div>

        <!-- 검색 및 필터 섹션 -->
        <div class="search-section">
          <div class="search-filters">
            <div class="filter-group">
              <label>회원분류:</label>
              <select v-model="searchFilters.role" class="filter-select">
                <option value="">전체</option>
                <option v-for="roleInfo in roleInfos" :key="roleInfo.roleName" :value="roleInfo.roleName">
                  {{ roleInfo.displayName }}
                </option>
              </select>
            </div>
            <div class="filter-group">
              <label>이름 / 사용자ID:</label>
              <input
                v-model="searchFilters.name"
                type="text"
                placeholder="이름 또는 사용자ID로 검색"
                class="filter-input"
              />
            </div>
            <div class="search-actions">
              <button @click="resetSearch" class="btn btn-reset">초기화</button>
            </div>
          </div>
        </div>

        <!-- 검색 결과 정보 -->
        <div class="search-results-info">
          <span>검색결과: {{ filteredUsers.length }} / 총 {{ users.length }}명</span>
        </div>

        <!-- 사용자 카드 리스트 -->
        <div class="users-cards-container">
          <div v-for="user in filteredUsers" :key="user.id" class="user-card">
            <div class="user-info">
              <div class="user-main">
                <span class="user-id">{{ user?.userId || '-' }}</span>
                <span class="user-name">({{ user?.name || '-' }})</span>
                <span :class="['role-badge', user?.role?.toLowerCase()]">
                  {{ getRoleDisplayName(user?.role) }}
                </span>
              </div>
              <div class="user-details">
                <div class="detail-item">
                  <span class="detail-label">이메일:</span>
                  <span class="detail-value">{{ user?.email || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">전화번호:</span>
                  <span class="detail-value">{{ user?.phone || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">가입일:</span>
                  <span class="detail-value">{{ formatDate(user?.createdAt) }}</span>
                </div>
              </div>
            </div>
            <div class="user-actions">
              <button 
                @click="openUserDetailModal(user)" 
                class="btn btn-detail"
              >
                상세
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>


    <!-- API 키 현황 -->
    <div class="api-info-section">
      <div :class="['api-info-card', 'api-status-' + krxApiStatus]">
        <div class="api-info-left">
          <span class="api-info-name">KRX Open API</span>
          <span :class="['api-status-badge', 'api-status-' + krxApiStatus]">{{ krxApiStatusText }}</span>
        </div>
        <div class="api-info-middle">
          유효기간: <strong>2026/04/22 ~ 2027/04/21</strong>
          <span class="api-info-sep">·</span>
          <span :class="['api-days', 'api-status-' + krxApiStatus]">D-{{ krxDaysRemaining }}</span>
        </div>
        <div class="api-info-right">
          <a
            href="https://openapi.krx.co.kr/contents/OPP/MYPG/mypage/OPPMYPG002.cmd"
            target="_blank"
            rel="noopener"
            class="api-renew-link"
          >인증키 갱신 →</a>
        </div>
      </div>
    </div>

    <!-- 사용자 생성 모달 -->
    <Modal v-if="showCreateModal" @close="closeCreateModal">
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
        <button @click="closeCreateModal" class="btn btn-secondary">취소</button>
        <button @click="createUser" class="btn btn-primary" :disabled="loading || !isCreateFormValid">
          {{ loading ? '생성 중...' : '생성' }}
        </button>
      </template>
    </Modal>

    <!-- 사용자 상세 정보 모달 -->
    <Modal v-if="showUserDetailModal" @close="closeUserDetailModal">
      <template #header>
        <h3>사용자 상세 정보</h3>
      </template>
      <template #body>
        <div class="user-detail-content">
          <div class="user-detail-header">
            <div class="user-avatar">
              <span class="avatar-text">{{ editingUserInfo?.name?.charAt(0) || 'U' }}</span>
            </div>
            <div class="user-basic-info">
              <h4>{{ editingUserInfo?.name || '-' }}</h4>
              <p class="user-id-text">{{ selectedUser?.userId || '-' }}</p>
              <span :class="['role-badge-large', selectedUser?.role?.toLowerCase()]">
                {{ getRoleDisplayName(selectedUser?.role) }}
              </span>
            </div>
          </div>
          
          <!-- 탭 네비게이션 -->
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
                    :disabled="selectedUser?.role === 'ADMIN' && !isAllowedAdmin(selectedUser?.userId)"
                  >
                    <option
                      v-for="roleInfo in assignableRoles(selectedUser?.userId)"
                      :key="roleInfo.roleName"
                      :value="roleInfo.roleName"
                    >
                      {{ roleInfo.displayName }}
                    </option>
                  </select>
                </div>
                <div class="info-item">
                  <label>가입일:</label>
                  <span class="readonly-info">{{ formatDate(selectedUser?.createdAt) }}</span>
                </div>
                <div class="info-item">
                  <label>수정일:</label>
                  <span class="readonly-info">{{ formatDate(selectedUser?.updatedAt) }}</span>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </template>
      <template #footer>
        <div class="modal-actions-horizontal">
          <div class="modal-actions-left">
            <button 
              @click="confirmDelete(selectedUser)" 
              class="btn btn-delete"
              :disabled="selectedUser?.userId === currentUser?.username || selectedUser?.role === 'ADMIN'"
              :title="selectedUser?.userId === currentUser?.username ? '본인 계정은 삭제할 수 없습니다' : selectedUser?.role === 'ADMIN' ? '관리자 계정은 삭제할 수 없습니다' : ''"
            >
              삭제
            </button>
          </div>
          <div class="modal-actions-right">
            <button
              @click="updateUserInfo"
              class="btn btn-edit"
              :disabled="loading"
            >
              {{ loading ? '수정 중...' : '정보 수정' }}
            </button>
            <button @click="closeUserDetailModal" class="btn btn-secondary">닫기</button>
          </div>
        </div>
      </template>
    </Modal>

    <!-- 삭제 확인 모달 -->
    <Modal v-if="showDeleteModal" @close="closeDeleteModal">
      <template #header>
        <h3>⚠️ 사용자 삭제 확인</h3>
      </template>
      <template #body>
        <div class="delete-warning">
          <div class="warning-icon">⚠️</div>
          <div class="warning-content">
            <h4>정말로 삭제하시겠습니까?</h4>
            <p><strong>{{ deletingUser?.name }}</strong> ({{ deletingUser?.email }}) 사용자를 삭제하려고 합니다.</p>
            <div class="warning-details">
              <p class="warning-text">⚠️ 이 작업은 되돌릴 수 없습니다!</p>
              <p class="warning-text">⚠️ 사용자의 모든 데이터가 영구적으로 삭제됩니다!</p>
              <p class="warning-text">⚠️ 삭제 후에는 복구가 불가능합니다!</p>
            </div>
            <div class="confirmation-input">
              <label for="delete-confirm">삭제를 확인하려면 "DELETE"를 입력하세요:</label>
              <input 
                id="delete-confirm"
                v-model="deleteConfirmation" 
                type="text" 
                class="form-control" 
                placeholder="DELETE 입력"
                @input="onDeleteConfirmationChange"
              />
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <button @click="closeDeleteModal" class="btn btn-secondary">취소</button>
        <button 
          @click="deleteUser" 
          class="btn btn-danger" 
          :disabled="loading || deleteConfirmation !== 'DELETE'"
        >
          {{ loading ? '삭제 중...' : '정말 삭제하기' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import axios from '../axios';
import Modal from '../components/Modal.vue';

export default {
  name: 'AdminPage',
  components: {
    Modal
  },
  setup() {
    const store = useStore();
    const users = ref([]);
    const loading = ref(false);
    const showDeleteModal = ref(false);
    const showCreateModal = ref(false);
    const showUserDetailModal = ref(false);
    const deletingUser = ref(null);
    const selectedUser = ref(null);
    const editingUserInfo = ref({
      name: '',
      email: '',
      phone: '',
      role: ''
    });
    const deleteConfirmation = ref('');
    const searchFilters = ref({
      role: '',
      name: ''
    });
    const newUser = ref({
      userId: '',
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: 'USER'
    });
    

    const currentUser = computed(() => store.getters['auth/user']);

    const parseApiError = (error, fallback) => {
      const data = error.response?.data;
      if (!data) return fallback;
      if (typeof data === 'string') {
        if (data.includes('가입된 메일주소가 있습니다')) return '이미 사용 중인 이메일 주소입니다.';
        if (data.includes('가입된 전화번호가 있습니다')) return '이미 사용 중인 전화번호입니다.';
        if (data.includes('이미 사용 중인 사용자ID')) return '이미 사용 중인 사용자ID입니다.';
        if (data.includes('관리자 권한을 설정할 수 없습니다')) return '관리자 권한을 설정할 수 없습니다.';
        if (data.includes('UK_') || data.includes('constraint') || data.includes('Duplicate')) {
          if (data.includes('email')) return '이미 사용 중인 이메일 주소입니다.';
          if (data.includes('phone')) return '이미 사용 중인 전화번호입니다.';
          if (data.includes('userId')) return '이미 사용 중인 사용자ID입니다.';
          return '입력한 정보에 문제가 있습니다. 다시 확인해주세요.';
        }
        return data;
      }
      return data.message || fallback;
    };
    const roleInfos = ref([]);

    const loadRoles = async () => {
      try {
        const res = await axios.get('/api/admin/role-infos');
        roleInfos.value = res.data;
      } catch (e) {
        // 로드 실패 시 기본값 유지
        roleInfos.value = [
          { roleName: 'USER',    displayName: '일반 사용자',    isDefault: true },
          { roleName: 'PREMIUM', displayName: '프리미엄 사용자', isDefault: true },
          { roleName: 'ADMIN',   displayName: '관리자',         isDefault: true },
        ];
      }
    };

    const countByRole = (roleName) => users.value.filter(u => u.role === roleName).length;

    const assignableRoles = (userId) => {
      return roleInfos.value.filter(r => {
        if (r.roleName === 'ADMIN') return isAllowedAdmin(userId);
        return true;
      });
    };

    const adminCount = computed(() => users.value.filter(u => u.role === 'ADMIN').length);
    const premiumCount = computed(() => users.value.filter(u => u.role === 'PREMIUM').length);
    const userCount = computed(() => users.value.filter(u => u.role === 'USER').length);
    
    const filteredUsers = computed(() => {
      let filtered = users.value;
      
      if (searchFilters.value.role) {
        filtered = filtered.filter(user => user.role === searchFilters.value.role);
      }
      
      if (searchFilters.value.name) {
        filtered = filtered.filter(user => 
          user.name?.toLowerCase().includes(searchFilters.value.name.toLowerCase()) ||
          user.userId?.toLowerCase().includes(searchFilters.value.name.toLowerCase())
        );
      }
      
      return filtered;
    });
    
    const isCreateFormValid = computed(() => {
      return newUser.value.userId.trim() && 
             newUser.value.name.trim() &&
             newUser.value.email.trim() && 
             newUser.value.password.trim() && 
             newUser.value.password.length >= 6 &&
             newUser.value.confirmPassword.trim() &&
             newUser.value.password === newUser.value.confirmPassword &&
             newUser.value.role &&
             !(newUser.value.role === 'ADMIN' && !isAllowedAdmin(newUser.value.userId));
    });

    const fetchUsers = async () => {
      try {
        loading.value = true;
        const response = await axios.get('/api/admin/users');
        users.value = response.data;
      } catch (error) {
        const errorMessage = error.response?.data || '사용자 목록을 불러오는데 실패했습니다.';
        store.dispatch('toast/showToast', {
          message: errorMessage,
          type: 'error'
        });
      } finally {
        loading.value = false;
      }
    };


    const openCreateModal = () => {
      newUser.value = {
        userId: '',
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        role: 'USER'
      };
      showCreateModal.value = true;
    };

    const closeCreateModal = () => {
      showCreateModal.value = false;
      newUser.value = {
        userId: '',
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        role: 'USER'
      };
    };

    const createUser = async () => {
      try {
        loading.value = true;
        
        const userData = {
          userId: newUser.value.userId,
          name: newUser.value.name,
          email: newUser.value.email,
          phone: newUser.value.phone,
          password: newUser.value.password,
          role: newUser.value.role
        };
        
        await axios.post('/api/admin/users', userData);
        
        await fetchUsers();
        
        store.dispatch('toast/showToast', {
          message: `${newUser.value.name} 사용자가 성공적으로 생성되었습니다.`,
          type: 'success'
        });

        closeCreateModal();
      } catch (error) {
        store.dispatch('toast/showToast', {
          message: parseApiError(error, '사용자 생성에 실패했습니다.'),
          type: 'error'
        });
      } finally {
        loading.value = false;
      }
    };


    const confirmDelete = (user) => {
      deletingUser.value = user;
      deleteConfirmation.value = '';
      showDeleteModal.value = true;
    };

    const closeDeleteModal = () => {
      showDeleteModal.value = false;
      deletingUser.value = null;
      deleteConfirmation.value = '';
    };

    const onDeleteConfirmationChange = () => {
      // 입력값을 대문자로 변환
      deleteConfirmation.value = deleteConfirmation.value.toUpperCase();
    };

    const deleteUser = async () => {
      try {
        loading.value = true;
        await axios.delete(`/api/admin/users/${deletingUser.value.id}`);

        users.value = users.value.filter(u => u.id !== deletingUser.value.id);

        store.dispatch('toast/showToast', {
          message: `${deletingUser.value.name} 사용자가 성공적으로 삭제되었습니다.`,
          type: 'success'
        });

        closeDeleteModal();
      } catch (error) {
        const errorMessage = error.response?.data || '사용자 삭제에 실패했습니다.';
        store.dispatch('toast/showToast', {
          message: errorMessage,
          type: 'error'
        });
      } finally {
        loading.value = false;
      }
    };

    const getRoleDisplayName = (role) => {
      const found = roleInfos.value.find(r => r.roleName === role);
      return found ? found.displayName : (role || '-');
    };

    const formatDate = (dateString) => {
      if (!dateString) return '-';
      const date = new Date(dateString);
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const isAllowedAdmin = (username) => {
      return username === 'hyunchang88' || username === 'admin';
    };

    const openUserDetailModal = async (user) => {
      selectedUser.value = user;
      editingUserInfo.value = {
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        role: user?.role || 'USER'
      };
      showUserDetailModal.value = true;
    };

    const closeUserDetailModal = () => {
      showUserDetailModal.value = false;
      selectedUser.value = null;
      editingUserInfo.value = {
        name: '',
        email: '',
        phone: '',
        role: 'USER'
      };
    };

    const updateUserInfo = async () => {
      try {
        loading.value = true;
        
        const updateData = {
          name: editingUserInfo.value.name,
          email: editingUserInfo.value.email,
          phone: editingUserInfo.value.phone,
          role: editingUserInfo.value.role
        };
        
        await axios.put(`/api/admin/users/${selectedUser.value.id}`, updateData);
        
        // 사용자 목록 업데이트
        const userIndex = users.value.findIndex(u => u.id === selectedUser.value.id);
        if (userIndex !== -1) {
          users.value[userIndex] = {
            ...users.value[userIndex],
            ...updateData
          };
        }
        
        // 선택된 사용자 정보도 업데이트
        selectedUser.value = {
          ...selectedUser.value,
          ...updateData
        };
        
        store.dispatch('toast/showToast', {
          message: `${editingUserInfo.value.name}의 정보가 성공적으로 수정되었습니다.`,
          type: 'success'
        });
        
        // 수정 완료 후 모달 닫기
        closeUserDetailModal();
        
      } catch (error) {
        store.dispatch('toast/showToast', {
          message: parseApiError(error, '사용자 정보 수정에 실패했습니다.'),
          type: 'error'
        });
      } finally {
        loading.value = false;
      }
    };

    const resetSearch = () => {
      searchFilters.value.role = '';
      searchFilters.value.name = '';
    };

    const filterByRole = (role) => {
      searchFilters.value.role = role;
    };

    // KRX API 키 만료 현황
    const KRX_EXPIRY = new Date('2027-04-21T23:59:59');
    const krxDaysRemaining = computed(() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return Math.ceil((KRX_EXPIRY - today) / (1000 * 60 * 60 * 24));
    });
    const krxApiStatus = computed(() => {
      const d = krxDaysRemaining.value;
      if (d < 0) return 'expired';
      if (d <= 30) return 'warning';
      return 'valid';
    });
    const krxApiStatusText = computed(() => {
      const d = krxDaysRemaining.value;
      if (d < 0) return '만료됨';
      if (d <= 30) return '만료 임박';
      return '정상';
    });
    

    onMounted(async () => {
      await loadRoles();
      await fetchUsers();
    });

    return {
      users,
      loading,
      showDeleteModal,
      showCreateModal,
      showUserDetailModal,
      deletingUser,
      selectedUser,
      editingUserInfo,
      newUser,
      deleteConfirmation,
      searchFilters,
      currentUser,
      roleInfos,
      countByRole,
      assignableRoles,
      adminCount,
      premiumCount,
      userCount,
      filteredUsers,
      isCreateFormValid,
      fetchUsers,
      loadRoles,
      openCreateModal,
      closeCreateModal,
      createUser,
      confirmDelete,
      closeDeleteModal,
      onDeleteConfirmationChange,
      deleteUser,
      openUserDetailModal,
      closeUserDetailModal,
      updateUserInfo,
      resetSearch,
      filterByRole,
      getRoleDisplayName,
      formatDate,
      isAllowedAdmin,
      krxDaysRemaining,
      krxApiStatus,
      krxApiStatusText,
    };
  }
};
</script>

<style src="@/assets/css/admin.css" scoped></style>

<style scoped>
.api-info-section {
  margin-top: 16px;
}

.api-info-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  font-size: 13px;
  color: var(--text-muted);
}

.api-info-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.api-info-name {
  font-weight: 600;
  color: var(--text-primary);
}

.api-status-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}
.api-status-badge.api-status-valid    { background: #d1fae5; color: #065f46; }
.api-status-badge.api-status-warning  { background: #fef3c7; color: #92400e; }
.api-status-badge.api-status-expired  { background: #fee2e2; color: #991b1b; }

.api-info-middle {
  display: flex;
  align-items: center;
  gap: 6px;
}

.api-info-sep {
  color: var(--text-muted);
  opacity: 0.4;
}

.api-days {
  font-weight: 600;
}
.api-days.api-status-valid   { color: #059669; }
.api-days.api-status-warning { color: #d97706; }
.api-days.api-status-expired { color: #dc2626; }

.api-renew-link {
  font-size: 12px;
  color: var(--text-muted);
  text-decoration: none;
  opacity: 0.7;
  transition: opacity 0.15s;
  white-space: nowrap;
}
.api-renew-link:hover {
  opacity: 1;
  color: var(--text-primary);
}
</style>
