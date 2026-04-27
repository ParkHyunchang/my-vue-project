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
            <button @click="fetchUsers" class="btn btn-refresh" :disabled="loadingUsers" :title="'사용자 목록 새로고침'">
              {{ loadingUsers ? '로딩 중...' : '↻ 새로고침' }}
            </button>
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
            <div class="filter-group">
              <label>정렬:</label>
              <select v-model="sortKey" class="filter-select">
                <option value="createdAt_desc">가입일 최신순</option>
                <option value="createdAt_asc">가입일 오래된순</option>
                <option value="name_asc">이름순</option>
                <option value="role_asc">권한순</option>
              </select>
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
        <div :class="['users-cards-container', { 'refreshing': loadingUsers && users.length > 0 }]">
          <div v-if="loadingUsers && users.length === 0" class="loading-state">
            사용자 목록을 불러오는 중...
          </div>
          <div v-else-if="!loadingUsers && filteredUsers.length === 0" class="empty-state">
            <span v-if="searchFilters.role || searchFilters.name">검색 조건에 맞는 사용자가 없습니다.</span>
            <span v-else>등록된 사용자가 없습니다.</span>
          </div>
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
        <button @click="closeCreateModal" class="btn btn-secondary">취소</button>
        <button @click="createUser" class="btn btn-primary" :disabled="loadingCreate || !isCreateFormValid">
          {{ loadingCreate ? '생성 중...' : '생성' }}
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
            <div class="user-avatar-lg">
              <span class="avatar-text">{{ editingUserInfo?.name?.charAt(0) || 'U' }}</span>
            </div>
            <div class="user-basic-info">
              <h4>{{ editingUserInfo?.name || '-' }}</h4>
              <p class="user-id-text">{{ selectedUser?.userId || '-' }}</p>
              <span :class="['role-badge-large', editingUserInfo?.role?.toLowerCase()]">
                {{ getRoleDisplayName(editingUserInfo?.role) }}
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
                  @click="changeUserPassword"
                  class="btn btn-secondary"
                  :disabled="loadingPassword || !isPasswordChangeValid"
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
              :disabled="loadingUpdate || !hasUserInfoChanged"
            >
              {{ loadingUpdate ? '수정 중...' : '정보 수정' }}
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
            <p><strong>{{ deletingUser?.name }}</strong> ({{ deletingUser?.userId }}) 사용자를 삭제하려고 합니다.</p>
            <p class="delete-user-email">{{ deletingUser?.email }}</p>
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
          :disabled="loadingDelete || deleteConfirmation !== 'DELETE'"
        >
          {{ loadingDelete ? '삭제 중...' : '정말 삭제하기' }}
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
    const loadingUsers = ref(false);
    const loadingCreate = ref(false);
    const loadingDelete = ref(false);
    const loadingUpdate = ref(false);
    const loadingPassword = ref(false);
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
    const allowedAdmins = ref([]);
    const newPassword = ref('');
    const confirmNewPassword = ref('');
    const searchFilters = ref({
      role: '',
      name: ''
    });
    const sortKey = ref('createdAt_desc');
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
        roleInfos.value = [
          { roleName: 'USER',    displayName: '일반 사용자',    isDefault: true },
          { roleName: 'PREMIUM', displayName: '프리미엄 사용자', isDefault: true },
          { roleName: 'ADMIN',   displayName: '관리자',         isDefault: true },
        ];
      }
    };

    const loadAllowedAdmins = async () => {
      try {
        const res = await axios.get('/api/admin/allowed-admins');
        allowedAdmins.value = res.data;
      } catch (e) {
        allowedAdmins.value = ['hyunchang88', 'admin'];
      }
    };

    const countByRole = (roleName) => users.value.filter(u => u.role === roleName).length;

    const assignableRoles = (userId) => {
      return roleInfos.value.filter(r => {
        if (r.roleName === 'ADMIN') return isAllowedAdmin(userId);
        return true;
      });
    };

    const ROLE_ORDER = { ADMIN: 0, PREMIUM: 1, USER: 2 };
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

      const [field, dir] = sortKey.value.split('_');
      return [...filtered].sort((a, b) => {
        if (field === 'name') {
          return dir === 'asc'
            ? (a.name || '').localeCompare(b.name || '', 'ko')
            : (b.name || '').localeCompare(a.name || '', 'ko');
        }
        if (field === 'role') {
          const ra = ROLE_ORDER[a.role] ?? 99;
          const rb = ROLE_ORDER[b.role] ?? 99;
          return dir === 'asc' ? ra - rb : rb - ra;
        }
        // createdAt (default)
        const da = new Date(a.createdAt || 0).getTime();
        const db = new Date(b.createdAt || 0).getTime();
        return dir === 'asc' ? da - db : db - da;
      });
    });
    
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
             !(newUser.value.role === 'ADMIN' && !isAllowedAdmin(newUser.value.userId));
    });

    const fetchUsers = async () => {
      try {
        loadingUsers.value = true;
        const response = await axios.get('/api/admin/users');
        users.value = response.data;
      } catch (error) {
        const errorMessage = error.response?.data || '사용자 목록을 불러오는데 실패했습니다.';
        store.dispatch('toast/showToast', {
          message: errorMessage,
          type: 'error'
        });
      } finally {
        loadingUsers.value = false;
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
    };

    const createUser = async () => {
      try {
        loadingCreate.value = true;

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
        loadingCreate.value = false;
      }
    };


    const confirmDelete = (user) => {
      showUserDetailModal.value = false;
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
        loadingDelete.value = true;
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
        loadingDelete.value = false;
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
      return allowedAdmins.value.includes(username);
    };

    const openUserDetailModal = async (user) => {
      // 캐시 데이터로 모달 즉시 오픈
      selectedUser.value = user;
      editingUserInfo.value = {
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        role: user?.role || 'USER'
      };
      showUserDetailModal.value = true;
      // 백그라운드에서 최신 데이터 조회 후 조용히 갱신
      try {
        const response = await axios.get(`/api/admin/users/${user.id}`);
        const fresh = response.data;
        selectedUser.value = fresh;
        editingUserInfo.value = {
          name: fresh?.name || '',
          email: fresh?.email || '',
          phone: fresh?.phone || '',
          role: fresh?.role || 'USER'
        };
      } catch {
        // 실패 시 캐시 데이터 유지
      }
    };

    const closeUserDetailModal = () => {
      showUserDetailModal.value = false;
      selectedUser.value = null;
      editingUserInfo.value = { name: '', email: '', phone: '', role: 'USER' };
      newPassword.value = '';
      confirmNewPassword.value = '';
    };

    const updateUserInfo = async () => {
      try {
        loadingUpdate.value = true;
        
        const updateData = {
          name: editingUserInfo.value.name,
          email: editingUserInfo.value.email,
          phone: editingUserInfo.value.phone,
          role: editingUserInfo.value.role
        };
        
        const response = await axios.put(`/api/admin/users/${selectedUser.value.id}`, updateData);
        const updatedUser = response.data;

        // 서버 응답으로 updatedAt 포함 전체 갱신
        const userIndex = users.value.findIndex(u => u.id === selectedUser.value.id);
        if (userIndex !== -1) {
          users.value[userIndex] = updatedUser;
        }

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
        loadingUpdate.value = false;
      }
    };

    const resetSearch = () => {
      searchFilters.value.role = '';
      searchFilters.value.name = '';
      sortKey.value = 'createdAt_desc';
    };

    const filterByRole = (role) => {
      searchFilters.value.role = role;
    };

    const hasUserInfoChanged = computed(() => {
      if (!selectedUser.value) return false;
      return editingUserInfo.value.name !== (selectedUser.value.name || '') ||
             editingUserInfo.value.email !== (selectedUser.value.email || '') ||
             editingUserInfo.value.phone !== (selectedUser.value.phone || '') ||
             editingUserInfo.value.role !== (selectedUser.value.role || 'USER');
    });

    const isPasswordChangeValid = computed(() => {
      return newPassword.value.length >= 6 &&
             newPassword.value === confirmNewPassword.value;
    });

    const changeUserPassword = async () => {
      try {
        loadingPassword.value = true;
        await axios.put(`/api/admin/users/${selectedUser.value.id}/password`, {
          password: newPassword.value
        });
        newPassword.value = '';
        confirmNewPassword.value = '';
        store.dispatch('toast/showToast', {
          message: `${selectedUser.value.name || selectedUser.value.userId}의 비밀번호가 변경되었습니다.`,
          type: 'success'
        });
      } catch (error) {
        store.dispatch('toast/showToast', {
          message: parseApiError(error, '비밀번호 변경에 실패했습니다.'),
          type: 'error'
        });
      } finally {
        loadingPassword.value = false;
      }
    };

    onMounted(async () => {
      await Promise.all([loadRoles(), loadAllowedAdmins()]);
      await fetchUsers();
    });

    return {
      users,
      loadingUsers,
      loadingCreate,
      loadingDelete,
      loadingUpdate,
      loadingPassword,
      showDeleteModal,
      showCreateModal,
      showUserDetailModal,
      deletingUser,
      selectedUser,
      editingUserInfo,
      newUser,
      deleteConfirmation,
      searchFilters,
      sortKey,
      currentUser,
      roleInfos,
      countByRole,
      assignableRoles,
      filteredUsers,
      isNewUserEmailValid,
      isCreateFormValid,
      hasUserInfoChanged,
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
      newPassword,
      confirmNewPassword,
      isPasswordChangeValid,
      changeUserPassword,
    };
  }
};
</script>

<style src="@/assets/css/admin.css" scoped></style>

<style scoped>
.delete-user-email {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: -8px;
}
.users-cards-container.refreshing {
  opacity: 0.5;
  pointer-events: none;
  transition: opacity 0.2s;
}
.btn-refresh {
  padding: 7px 14px;
  border-radius: 6px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--text-muted);
  font-size: 13px;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
  white-space: nowrap;
}
.btn-refresh:hover:not(:disabled) {
  color: var(--text-primary);
  border-color: var(--text-muted);
}
.btn-refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

