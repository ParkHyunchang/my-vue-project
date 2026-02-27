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
              <button @click="filterByRole('ADMIN')" :class="['stat-item', 'stat-admin', { active: searchFilters.role === 'ADMIN' }]">
                관리자: {{ adminCount }}명
              </button>
              <button @click="filterByRole('PREMIUM')" :class="['stat-item', 'stat-premium', { active: searchFilters.role === 'PREMIUM' }]">
                프리미엄: {{ premiumCount }}명
              </button>
              <button @click="filterByRole('USER')" :class="['stat-item', 'stat-user', { active: searchFilters.role === 'USER' }]">
                일반: {{ userCount }}명
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
                <option value="USER">일반회원</option>
                <option value="PREMIUM">프리미엄회원</option>
                <option value="ADMIN">관리자</option>
              </select>
            </div>
            <div class="filter-group">
              <label>이름:</label>
              <input 
                v-model="searchFilters.name" 
                type="text" 
                placeholder="이름을 입력하세요"
                class="filter-input"
              />
            </div>
            <div class="search-actions">
              <button @click="searchUsers" class="btn btn-search">검색</button>
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
              <option value="USER">일반 사용자</option>
              <option value="PREMIUM">프리미엄 사용자</option>
              <option 
                v-if="isAllowedAdmin(newUser.userId)" 
                value="ADMIN"
              >
                관리자
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
          <div class="tab-navigation">
            <button 
              :class="['tab-button', { active: activeTab === 'basic' }]"
              @click="activeTab = 'basic'"
            >
              <i class="fas fa-user"></i>
              기본 정보
            </button>
            <button 
              :class="['tab-button', { active: activeTab === 'permissions' }]"
              @click="activeTab = 'permissions'"
            >
              <i class="fas fa-shield-alt"></i>
              CRUD 권한
            </button>
          </div>
          
          <!-- 기본 정보 탭 -->
          <div v-if="activeTab === 'basic'" class="tab-content">
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
                    <option value="USER">일반 사용자</option>
                    <option value="PREMIUM">프리미엄 사용자</option>
                    <option 
                      v-if="isAllowedAdmin(selectedUser?.userId)" 
                      value="ADMIN"
                    >
                      관리자
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
          
          <!-- CRUD 권한 탭 -->
          <div v-if="activeTab === 'permissions'" class="tab-content">
            <div class="permissions-section">
              <div class="permissions-header">
                <h5>메뉴별 CRUD 권한 설정</h5>
                <p class="permissions-description">
                  {{ editingUserInfo.name }} 사용자의 메뉴별 CRUD 권한을 설정합니다.
                </p>
              </div>
              
              <div class="permissions-grid">
                <div 
                  v-for="menu in menuPermissions" 
                  :key="menu.path"
                  class="permission-card"
                >
                  <div class="permission-header">
                    <div class="menu-info">
                      <span class="menu-icon">{{ menu.icon }}</span>
                      <div class="menu-details">
                        <h6>{{ menu.name }}</h6>
                        <span class="menu-path">{{ menu.path }}</span>
                      </div>
                    </div>
                    <div class="permission-actions">
                      <button 
                        @click="toggleAllPermissions(menu.path)"
                        class="btn btn-sm btn-toggle-all"
                      >
                        {{ isAllPermissionsEnabled(menu.path) ? '전체 해제' : '전체 선택' }}
                      </button>
                    </div>
                  </div>
                  
                  <div class="permission-controls">
                    <div class="permission-item">
                      <label class="permission-label">
                        <input 
                          type="checkbox"
                          :checked="getUserPermission(menu.path, 'canCreate')"
                          @change="updateUserPermission(menu.path, 'canCreate', $event.target.checked)"
                          class="permission-checkbox"
                        />
                        <span class="permission-text">생성 (Create)</span>
                      </label>
                    </div>
                    <div class="permission-item">
                      <label class="permission-label">
                        <input 
                          type="checkbox"
                          :checked="getUserPermission(menu.path, 'canRead')"
                          @change="updateUserPermission(menu.path, 'canRead', $event.target.checked)"
                          class="permission-checkbox"
                        />
                        <span class="permission-text">조회 (Read)</span>
                      </label>
                    </div>
                    <div class="permission-item">
                      <label class="permission-label">
                        <input 
                          type="checkbox"
                          :checked="getUserPermission(menu.path, 'canUpdate')"
                          @change="updateUserPermission(menu.path, 'canUpdate', $event.target.checked)"
                          class="permission-checkbox"
                        />
                        <span class="permission-text">수정 (Update)</span>
                      </label>
                    </div>
                    <div class="permission-item">
                      <label class="permission-label">
                        <input 
                          type="checkbox"
                          :checked="getUserPermission(menu.path, 'canDelete')"
                          @change="updateUserPermission(menu.path, 'canDelete', $event.target.checked)"
                          class="permission-checkbox"
                        />
                        <span class="permission-text">삭제 (Delete)</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="permissions-actions">
                <button 
                  @click="saveUserCrudPermissions"
                  class="btn btn-primary"
                  :disabled="loading"
                >
                  {{ loading ? '저장 중...' : 'CRUD 권한 저장' }}
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
              :disabled="loading"
            >
              {{ loading ? '수정 중...' : '권한 수정' }}
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
    
    // CRUD 권한 관리 관련 변수들
    const activeTab = ref('basic');
    const userCrudPermissions = ref({});
    const menuPermissions = ref([
      { path: '/', name: '홈', icon: '🏠' },
      { path: '/portfolio', name: '포트폴리오', icon: '💼' },
      { path: '/projects', name: '프로젝트', icon: '🚀' },
      { path: '/history', name: '히스토리', icon: '📚' },
      { path: '/dating', name: '데이팅', icon: '💕' },
      { path: '/todos', name: '할일 목록', icon: '📝' },
      { path: '/todos/create', name: '할일 생성', icon: '➕' },
      { path: '/expense', name: '지출 관리', icon: '💰' },
      { path: '/admin', name: '관리자 대시보드', icon: '🎛️' },
      { path: '/admin/users', name: '사용자 관리', icon: '👥' },
      { path: '/admin/menu-management', name: '메뉴 권한 관리', icon: '🔐' }
    ]);

    const currentUser = computed(() => store.getters['auth/user']);

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
        store.dispatch('toast/showToast', {
          message: '사용자 목록을 성공적으로 불러왔습니다.',
          type: 'success'
        });
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
        let errorMessage = '사용자 생성에 실패했습니다.';
        
        if (error.response?.data) {
          const data = error.response.data;
          if (typeof data === 'string') {
            // 기술적인 에러 메시지를 사용자 친화적으로 변환
            if (data.includes('가입된 메일주소가 있습니다')) {
              errorMessage = '이미 사용 중인 이메일 주소입니다.';
            } else if (data.includes('가입된 전화번호가 있습니다')) {
              errorMessage = '이미 사용 중인 전화번호입니다.';
            } else if (data.includes('이미 사용 중인 사용자ID')) {
              errorMessage = '이미 사용 중인 사용자ID입니다.';
            } else if (data.includes('관리자 권한을 설정할 수 없습니다')) {
              errorMessage = '관리자 권한을 설정할 수 없습니다.';
            } else if (data.includes('UK_') || data.includes('constraint') || data.includes('Duplicate')) {
              // 데이터베이스 제약 조건 위반 시 - 더 정확한 구분
              if (data.includes('UK_r43af9ap4edm43mmtq01oddj6') || data.includes('email') && data.includes('UK_')) {
                errorMessage = '이미 사용 중인 이메일 주소입니다.';
              } else if (data.includes('phone') && data.includes('UK_')) {
                errorMessage = '이미 사용 중인 전화번호입니다.';
              } else if (data.includes('userId') && data.includes('UK_')) {
                errorMessage = '이미 사용 중인 사용자ID입니다.';
              } else {
                // 이름 중복 등 기타 제약 조건 위반
                errorMessage = '입력한 정보에 문제가 있습니다. 다시 확인해주세요.';
              }
            } else {
              errorMessage = data;
            }
          } else if (data.message) {
            errorMessage = data.message;
          }
        }
        
        // 토스트 메시지로 표시 (모달 내 에러 메시지 제거)
        store.dispatch('toast/showToast', {
          message: errorMessage,
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
      const roleNames = {
        'USER': '일반 사용자',
        'PREMIUM': '프리미엄 사용자',
        'ADMIN': '관리자'
      };
      return roleNames[role] || role;
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
      activeTab.value = 'basic';
      
      // 사용자의 CRUD 권한 로드
      await loadUserCrudPermissions(user.role);
      
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
      userCrudPermissions.value = {};
      activeTab.value = 'basic';
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
        let errorMessage = '사용자 정보 수정에 실패했습니다.';
        
        if (error.response?.data) {
          const data = error.response.data;
          if (typeof data === 'string') {
            // 기술적인 에러 메시지를 사용자 친화적으로 변환
            if (data.includes('가입된 메일주소가 있습니다')) {
              errorMessage = '이미 사용 중인 이메일 주소입니다.';
            } else if (data.includes('가입된 전화번호가 있습니다')) {
              errorMessage = '이미 사용 중인 전화번호입니다.';
            } else if (data.includes('이미 사용 중인 사용자ID')) {
              errorMessage = '이미 사용 중인 사용자ID입니다.';
            } else if (data.includes('관리자 권한을 설정할 수 없습니다')) {
              errorMessage = '관리자 권한을 설정할 수 없습니다.';
            } else if (data.includes('UK_') || data.includes('constraint') || data.includes('Duplicate')) {
              // 데이터베이스 제약 조건 위반 시 - 더 정확한 구분
              if (data.includes('UK_r43af9ap4edm43mmtq01oddj6')) {
                // 이 특정 제약 조건은 이름 중복 (현재 데이터베이스에 잘못 설정된 제약 조건)
                errorMessage = '이미 사용 중인 이름입니다. (데이터베이스 제약 조건)';
              } else if (data.includes('email') && data.includes('UK_')) {
                errorMessage = '이미 사용 중인 이메일 주소입니다.';
              } else if (data.includes('phone') && data.includes('UK_')) {
                errorMessage = '이미 사용 중인 전화번호입니다.';
              } else if (data.includes('userId') && data.includes('UK_')) {
                errorMessage = '이미 사용 중인 사용자ID입니다.';
              } else {
                // 기타 제약 조건 위반
                console.error('Database constraint error details:', data);
                errorMessage = '입력한 정보에 문제가 있습니다. 다시 확인해주세요.';
              }
            } else {
              errorMessage = data;
            }
          } else if (data.message) {
            errorMessage = data.message;
          }
        }
        
        // 토스트 메시지로 표시 (모달 내 에러 메시지 제거)
        store.dispatch('toast/showToast', {
          message: errorMessage,
          type: 'error'
        });
        
      } finally {
        loading.value = false;
      }
    };

    const searchUsers = () => {
      // 검색 필터가 변경되면 filteredUsers computed가 자동으로 업데이트됨
    };

    const resetSearch = () => {
      searchFilters.value.role = '';
      searchFilters.value.name = '';
    };

    const filterByRole = (role) => {
      searchFilters.value.role = role;
    };
    
    // CRUD 권한 관리 함수들
    const loadUserCrudPermissions = async (userRole) => {
      try {
        // 서버에서 실제 CRUD 권한 조회
        const response = await axios.get(`/api/admin/crud-permissions/${userRole}`);
        const serverPermissions = response.data;
        
        // 서버 데이터를 프론트엔드 형식으로 변환
        const permissions = {};
        serverPermissions.forEach(perm => {
          permissions[perm.menuPath] = {
            canCreate: perm.canCreate,
            canRead: perm.canRead,
            canUpdate: perm.canUpdate,
            canDelete: perm.canDelete
          };
        });
        
        userCrudPermissions.value = permissions;
        
      } catch (error) {
        console.error('CRUD 권한 로드 실패:', error);
        // 기본 권한으로 설정
        userCrudPermissions.value = getDefaultCrudPermissions(userRole);
      }
    };
    
    const getDefaultCrudPermissions = (userRole) => {
      const permissions = {};
      
      menuPermissions.value.forEach(menu => {
        permissions[menu.path] = {
          canCreate: false,
          canRead: false,
          canUpdate: false,
          canDelete: false
        };
      });
      
      // 권한별 기본 설정
      if (userRole === 'ADMIN') {
        // 관리자는 모든 권한
        menuPermissions.value.forEach(menu => {
          permissions[menu.path] = {
            canCreate: true,
            canRead: true,
            canUpdate: true,
            canDelete: true
          };
        });
      } else if (userRole === 'PREMIUM') {
        // 프리미엄 사용자: 모든 메뉴 조회 가능, dating에서만 CRU 가능
        menuPermissions.value.forEach(menu => {
          permissions[menu.path] = {
            canCreate: menu.path === '/dating',
            canRead: true,
            canUpdate: menu.path === '/dating',
            canDelete: false
          };
        });
      } else {
        // 일반 사용자: 모든 메뉴 조회만 가능
        menuPermissions.value.forEach(menu => {
          permissions[menu.path] = {
            canCreate: false,
            canRead: true,
            canUpdate: false,
            canDelete: false
          };
        });
      }
      
      return permissions;
    };
    
    const getUserPermission = (menuPath, permissionType) => {
      return userCrudPermissions.value[menuPath]?.[permissionType] || false;
    };
    
    const updateUserPermission = (menuPath, permissionType, value) => {
      if (!userCrudPermissions.value[menuPath]) {
        userCrudPermissions.value[menuPath] = {
          canCreate: false,
          canRead: false,
          canUpdate: false,
          canDelete: false
        };
      }
      userCrudPermissions.value[menuPath][permissionType] = value;
    };
    
    const isAllPermissionsEnabled = (menuPath) => {
      const permissions = userCrudPermissions.value[menuPath];
      if (!permissions) return false;
      return permissions.canCreate && permissions.canRead && 
             permissions.canUpdate && permissions.canDelete;
    };
    
    const toggleAllPermissions = (menuPath) => {
      const allEnabled = isAllPermissionsEnabled(menuPath);
      const newValue = !allEnabled;
      
      updateUserPermission(menuPath, 'canCreate', newValue);
      updateUserPermission(menuPath, 'canRead', newValue);
      updateUserPermission(menuPath, 'canUpdate', newValue);
      updateUserPermission(menuPath, 'canDelete', newValue);
    };
    
    const saveUserCrudPermissions = async () => {
      try {
        loading.value = true;
        
        // 서버에 CRUD 권한 저장
        await axios.post(`/api/admin/crud-permissions/${selectedUser.value.role}`, userCrudPermissions.value);
        
        store.dispatch('toast/showToast', {
          message: 'CRUD 권한이 성공적으로 저장되었습니다.',
          type: 'success'
        });
        
      } catch (error) {
        console.error('CRUD 권한 저장 실패:', error);
        store.dispatch('toast/showToast', {
          message: 'CRUD 권한 저장에 실패했습니다.',
          type: 'error'
        });
      } finally {
        loading.value = false;
      }
    };

    onMounted(async () => {
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
      adminCount,
      premiumCount,
      userCount,
      filteredUsers,
      isCreateFormValid,
      fetchUsers,
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
      searchUsers,
      resetSearch,
      filterByRole,
      getRoleDisplayName,
      formatDate,
      isAllowedAdmin,
      // CRUD 권한 관리 관련
      activeTab,
      userCrudPermissions,
      menuPermissions,
      loadUserCrudPermissions,
      getUserPermission,
      updateUserPermission,
      isAllPermissionsEnabled,
      toggleAllPermissions,
      saveUserCrudPermissions
    };
  }
};
</script>

<style scoped>
.admin-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.admin-header {
  text-align: center;
  margin-bottom: 40px;
}

.admin-header h1 {
  color: #2c3e50;
  margin-bottom: 10px;
}

.admin-header p {
  color: #7f8c8d;
  font-size: 16px;
}

.admin-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.users-section {
  padding: 30px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
  gap: 20px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.section-header h2 {
  color: #2c3e50;
  margin: 0;
}

.stats {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.stat-item {
  background: #f8f9fa;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  color: #495057;
  border: 1px solid #e9ecef;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.stat-item:hover {
  background: #e9ecef;
  border-color: #adb5bd;
}

.stat-item.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.stat-item.stat-admin.active {
  background: #d32f2f;
  border-color: #d32f2f;
}

.stat-item.stat-premium.active {
  background: #f57c00;
  border-color: #f57c00;
}

.stat-item.stat-user.active {
  background: #1976d2;
  border-color: #1976d2;
}

/* 검색 섹션 스타일 */
.search-section {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.search-filters {
  display: flex;
  gap: 20px;
  align-items: end;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 150px;
}

.filter-group label {
  font-weight: 500;
  color: #495057;
  font-size: 14px;
}

.filter-select,
.filter-input {
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

.filter-select:focus,
.filter-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.search-actions {
  display: flex;
  gap: 10px;
}

.search-results-info {
  margin-bottom: 15px;
  padding: 10px 15px;
  background: #e3f2fd;
  border-radius: 4px;
  color: #1976d2;
  font-weight: 500;
}

/* 사용자 카드 스타일 */
.users-cards-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.user-card {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.user-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #007bff;
}

.user-info {
  flex: 1;
}

.user-main {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.user-id {
  font-weight: 600;
  color: #2c3e50;
  font-size: 16px;
}

.user-name {
  color: #6c757d;
  font-size: 14px;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.detail-item {
  display: flex;
  gap: 10px;
  font-size: 14px;
}

.detail-label {
  font-weight: 500;
  color: #6c757d;
  min-width: 70px;
}

.detail-value {
  color: #495057;
}

.user-actions {
  display: flex;
  gap: 10px;
}

.role-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
}

.role-badge.user {
  background: #e3f2fd;
  color: #1976d2;
}

.role-badge.premium {
  background: #fff3e0;
  color: #f57c00;
}

.role-badge.admin {
  background: #ffebee;
  color: #d32f2f;
}

/* 사용자 상세 모달 스타일 */
.user-detail-content {
  padding: 20px 0;
}


.user-detail-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e9ecef;
}

.user-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #007bff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-text {
  color: white;
  font-size: 24px;
  font-weight: 600;
}

.user-basic-info h4 {
  margin: 0 0 5px 0;
  color: #2c3e50;
  font-size: 20px;
}

.user-id-text {
  color: #6c757d;
  font-size: 14px;
  margin-bottom: 10px;
}

.role-badge-large {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  text-transform: uppercase;
}

.role-badge-large.user {
  background: #e3f2fd;
  color: #1976d2;
}

.role-badge-large.premium {
  background: #fff3e0;
  color: #f57c00;
}

.role-badge-large.admin {
  background: #ffebee;
  color: #d32f2f;
}

.user-detail-info {
  margin-top: 20px;
}

.info-section h5 {
  color: #2c3e50;
  margin-bottom: 15px;
  font-size: 16px;
  font-weight: 600;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.info-item label {
  font-weight: 500;
  color: #6c757d;
  font-size: 14px;
}

.info-item span {
  color: #495057;
  font-size: 14px;
}

.modal-actions-horizontal {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 20px;
}

.modal-actions-left {
  display: flex;
  gap: 10px;
  flex: 0 0 auto;
}

.modal-actions-right {
  display: flex;
  gap: 10px;
  flex: 0 0 auto;
}

/* 편집 가능한 폼 컨트롤 */
.form-control-edit {
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  width: 100%;
  transition: border-color 0.2s ease;
}

.form-control-edit:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.form-control-edit:disabled {
  background-color: #f8f9fa;
  color: #6c757d;
  cursor: not-allowed;
}

.readonly-info {
  color: #6c757d;
  font-size: 14px;
  padding: 8px 12px;
  background-color: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

/* 공통 버튼 스타일 */
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 버튼 색상 변형 */
.btn-edit,
.btn-primary {
  background: #007bff;
  color: white;
}

.btn-edit:hover:not(:disabled),
.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-delete,
.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-delete:hover:not(:disabled),
.btn-danger:hover:not(:disabled) {
  background: #c82333;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
}

.btn-create {
  background: #28a745;
  color: white;
}

.btn-create:hover:not(:disabled) {
  background: #218838;
}

.btn-search {
  background: #007bff;
  color: white;
  padding: 8px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.btn-search:hover {
  background: #0056b3;
}

.btn-reset {
  background: #6c757d;
  color: white;
  padding: 8px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.btn-reset:hover {
  background: #545b62;
}

.btn-detail {
  background: #007bff;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s ease;
}

.btn-detail:hover {
  background: #0056b3;
}

.create-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 500;
  color: #495057;
}

.form-control {
  padding: 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

.form-control:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.warning-text {
  color: #dc3545;
  font-weight: 500;
  margin-top: 10px;
}

.error-message {
  color: #dc3545;
  font-size: 12px;
  margin-top: 4px;
  font-weight: 500;
}

.delete-warning {
  display: flex;
  gap: 15px;
  align-items: flex-start;
}

.warning-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.warning-content {
  flex: 1;
}

.warning-content h4 {
  color: #dc3545;
  margin: 0 0 10px 0;
  font-size: 1.2rem;
}

.warning-details {
  background: #fff5f5;
  border: 1px solid #fed7d7;
  border-radius: 6px;
  padding: 15px;
  margin: 15px 0;
}

.warning-details .warning-text {
  margin: 5px 0;
  font-weight: 500;
}

.confirmation-input {
  margin-top: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #dee2e6;
}

.confirmation-input label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #495057;
}

.confirmation-input input {
  border: 2px solid #dc3545;
  font-weight: 600;
  text-align: center;
  letter-spacing: 1px;
}

  .confirmation-input input:focus {
    border-color: #dc3545;
    box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.25);
  }

/* 탭 네비게이션 스타일 */
.tab-navigation {
  display: flex;
  border-bottom: 1px solid #e9ecef;
  margin-bottom: 20px;
}

.tab-button {
  flex: 1;
  padding: 12px 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #6c757d;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.tab-button:hover {
  color: #007bff;
  background: #f8f9fa;
}

.tab-button.active {
  color: #007bff;
  border-bottom-color: #007bff;
  background: #f8f9fa;
}

.tab-button i {
  font-size: 16px;
}

.tab-content {
  min-height: 400px;
}

/* CRUD 권한 관리 스타일 */
.permissions-section {
  padding: 20px 0;
}

.permissions-header {
  margin-bottom: 30px;
  text-align: center;
}

.permissions-header h5 {
  color: #2c3e50;
  margin: 0 0 10px 0;
  font-size: 18px;
  font-weight: 600;
}

.permissions-description {
  color: #6c757d;
  font-size: 14px;
  margin: 0;
}

.permissions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.permission-card {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  transition: all 0.2s ease;
}

.permission-card:hover {
  border-color: #007bff;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
}

.permission-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e9ecef;
}

.menu-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.menu-icon {
  font-size: 20px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.menu-details h6 {
  margin: 0 0 4px 0;
  color: #2c3e50;
  font-size: 14px;
  font-weight: 600;
}

.menu-path {
  color: #6c757d;
  font-size: 12px;
  font-family: monospace;
}

.permission-actions {
  display: flex;
  gap: 8px;
}

.btn-toggle-all {
  background: #6c757d;
  color: white;
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.btn-toggle-all:hover {
  background: #545b62;
}

.permission-controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.permission-item {
  display: flex;
  align-items: center;
}

.permission-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: #495057;
  font-weight: 500;
}

.permission-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.permission-text {
  user-select: none;
}

.permissions-actions {
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid #e9ecef;
}

.permissions-actions .btn {
  padding: 10px 30px;
  font-size: 14px;
  font-weight: 600;
}

@media (max-width: 768px) {
  .admin-container {
    padding: 10px;
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .header-actions {
    width: 100%;
    flex-direction: column;
    gap: 15px;
  }
  
  .stats {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  
  .stat-item {
    text-align: center;
    padding: 10px 8px;
    font-size: 12px;
  }
  
  /* 검색 섹션 모바일 */
  .search-section {
    padding: 15px;
  }
  
  .search-filters {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
  
  .filter-group {
    min-width: auto;
  }
  
  .search-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  
  .search-actions .btn {
    width: 100%;
  }
  
  /* 사용자 카드 모바일 */
  .user-card {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 15px;
  }
  
  /* ✅ 왼쪽 정렬로 변경 */
  .user-main {
    justify-content: flex-start;
    text-align: left;
    flex-wrap: wrap;
  }
  
  .user-details {
    gap: 6px;
  }
  
  /* ✅ 라벨/값을 가로 배치하여 가독성 향상 */
  .detail-item {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    text-align: left;
    padding: 4px 0;
    border-bottom: 1px solid #f0f0f0;
  }
  
  .detail-item:last-child {
    border-bottom: none;
  }
  
  .detail-label {
    min-width: 65px;
    flex-shrink: 0;
    font-size: 12px;
  }
  
  .detail-value {
    font-size: 13px;
    text-align: right;
    word-break: break-all;
  }
  
  /* ✅ 버튼을 오른쪽 정렬 */
  .user-actions {
    justify-content: flex-end;
  }
  
  .btn-detail {
    padding: 8px 20px;
    font-size: 13px;
  }
  
  /* 사용자 상세 모달 모바일 */
  .user-detail-header {
    flex-direction: column;
    text-align: center;
    gap: 15px;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  
  /* ✅ 저장/닫기를 위로, 삭제를 아래로 */
  .modal-actions-horizontal {
    flex-direction: column-reverse;
    gap: 10px;
  }
  
  .modal-actions-left,
  .modal-actions-right {
    width: 100%;
    justify-content: stretch;
  }
  
  .modal-actions-left .btn,
  .modal-actions-right .btn {
    flex: 1;
  }
  
  .delete-warning {
    flex-direction: column;
    gap: 10px;
  }
  
  .warning-icon {
    font-size: 1.5rem;
    text-align: center;
  }
  
  .warning-content h4 {
    font-size: 1.1rem;
    text-align: center;
  }
  
  .confirmation-input {
    padding: 10px;
  }
  
  /* ✅ 탭 네비게이션을 가로로 유지 (세로 제거) */
  .tab-navigation {
    flex-direction: row;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .tab-button {
    flex: 1;
    min-width: 100px;
    padding: 10px 8px;
    font-size: 13px;
    white-space: nowrap;
  }
  
  /* CRUD 권한 관리 모바일 스타일 */
  .permissions-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .permission-card {
    padding: 12px;
  }
  
  /* ✅ permission-header를 가로 유지하되 compact하게 */
  .permission-header {
    flex-direction: row;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }
  
  .menu-info {
    flex: 1;
    min-width: 0;
  }
  
  .menu-details h6 {
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .permission-actions {
    flex-shrink: 0;
  }
  
  /* ✅ CRUD 체크박스를 2열 유지 */
  .permission-controls {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  
  .permissions-actions .btn {
    width: 100%;
    padding: 12px;
  }
}

@media (max-width: 480px) {
  .admin-container {
    padding: 5px;
  }
  
  .users-section {
    padding: 15px;
  }
  
  .section-header h2 {
    font-size: 1.2rem;
  }
  
  .stats {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .stat-item {
    padding: 8px;
    font-size: 11px;
  }
  
  .search-section {
    padding: 10px;
  }
  
  .user-card {
    padding: 12px;
  }
  
  .user-id {
    font-size: 14px;
  }
  
  .user-name {
    font-size: 12px;
  }
  
  .detail-label {
    font-size: 11px;
  }
  
  .detail-value {
    font-size: 12px;
  }
  
  .btn-detail {
    padding: 8px;
    font-size: 12px;
  }
  
  .btn {
    padding: 6px 12px;
    font-size: 12px;
  }
  
  .user-avatar {
    width: 50px;
    height: 50px;
  }
  
  .avatar-text {
    font-size: 20px;
  }
  
  .user-basic-info h4 {
    font-size: 18px;
  }
}
</style>
