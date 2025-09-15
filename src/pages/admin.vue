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
              <span class="stat-item">
                전체: {{ users.length }}명
              </span>
              <span class="stat-item">
                관리자: {{ adminCount }}명
              </span>
              <span class="stat-item">
                프리미엄: {{ premiumCount }}명
              </span>
              <span class="stat-item">
                일반: {{ userCount }}명
              </span>
            </div>
          </div>
        </div>

        <div class="users-table-container">
          <table class="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>사용자ID</th>
                <th>이름</th>
                <th>이메일</th>
                <th>전화번호</th>
                <th>권한</th>
                <th>가입일</th>
                <th>수정일</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id" class="user-row">
                <td>{{ user.id }}</td>
                <td>{{ user?.userId || '-' }}</td>
                <td>{{ user?.name || '-' }}</td>
                <td>{{ user?.email || '-' }}</td>
                <td>{{ user?.phone || '-' }}</td>
                <td>
                  <span :class="['role-badge', user?.role?.toLowerCase()]">
                    {{ getRoleDisplayName(user?.role) }}
                  </span>
                </td>
                <td>{{ formatDate(user?.createdAt) }}</td>
                <td>{{ formatDate(user?.updatedAt) }}</td>
                <td class="actions">
                  <button 
                    @click="openEditModal(user)" 
                    class="btn btn-edit"
                    :disabled="user?.userId === currentUser?.username || user?.role === 'ADMIN'"
                    :title="user?.userId === currentUser?.username ? '본인 계정은 수정할 수 없습니다' : user?.role === 'ADMIN' ? '관리자 계정은 수정할 수 없습니다' : ''"
                  >
                    권한 수정
                  </button>
                  <button 
                    @click="confirmDelete(user)" 
                    class="btn btn-delete"
                    :disabled="user?.userId === currentUser?.username || user?.role === 'ADMIN'"
                    :title="user?.userId === currentUser?.username ? '본인 계정은 삭제할 수 없습니다' : user?.role === 'ADMIN' ? '관리자 계정은 삭제할 수 없습니다' : ''"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 권한 수정 모달 -->
    <Modal v-if="showEditModal" @close="closeEditModal">
      <template #header>
        <h3>사용자 권한 수정</h3>
      </template>
      <template #body>
        <div class="edit-form">
          <div class="form-group">
            <label>사용자ID:</label>
            <input type="text" :value="editingUser?.userId" readonly class="form-control" />
          </div>
          <div class="form-group">
            <label>이름:</label>
            <input type="text" :value="editingUser?.name" readonly class="form-control" />
          </div>
          <div class="form-group">
            <label>이메일:</label>
            <input type="text" :value="editingUser?.email" readonly class="form-control" />
          </div>
          <div class="form-group">
            <label>전화번호:</label>
            <input type="text" :value="editingUser?.phone || '-'" readonly class="form-control" />
          </div>
          <div class="form-group">
            <label>권한:</label>
            <select v-model="newRole" class="form-control">
              <option value="USER">일반 사용자</option>
              <option value="PREMIUM">프리미엄 사용자</option>
              <option 
                v-if="isAllowedAdmin(editingUser?.userId)" 
                value="ADMIN"
              >
                관리자
              </option>
            </select>
            <div v-if="newRole === 'ADMIN' && !isAllowedAdmin(editingUser?.userId)" class="error-message">
              관리자 권한은 허용된 사용자만 설정할 수 있습니다.
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <button @click="closeEditModal" class="btn btn-secondary">취소</button>
        <button @click="updateUserRole" class="btn btn-primary" :disabled="loading">
          {{ loading ? '수정 중...' : '수정' }}
        </button>
      </template>
    </Modal>

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
    const showEditModal = ref(false);
    const showDeleteModal = ref(false);
    const showCreateModal = ref(false);
    const editingUser = ref(null);
    const deletingUser = ref(null);
    const newRole = ref('');
    const deleteConfirmation = ref('');
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

    const adminCount = computed(() => users.value.filter(u => u.role === 'ADMIN').length);
    const premiumCount = computed(() => users.value.filter(u => u.role === 'PREMIUM').length);
    const userCount = computed(() => users.value.filter(u => u.role === 'USER').length);
    
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

    const openEditModal = (user) => {
      editingUser.value = user;
      newRole.value = user.role;
      showEditModal.value = true;
    };

    const closeEditModal = () => {
      showEditModal.value = false;
      editingUser.value = null;
      newRole.value = '';
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
        const errorMessage = error.response?.data || '사용자 생성에 실패했습니다.';
        store.dispatch('toast/showToast', {
          message: errorMessage,
          type: 'error'
        });
      } finally {
        loading.value = false;
      }
    };

    const updateUserRole = async () => {
      try {
        loading.value = true;
        await axios.put(`/api/admin/users/${editingUser.value.id}/role`, {
          role: newRole.value
        });

        const userIndex = users.value.findIndex(u => u.id === editingUser.value.id);
        if (userIndex !== -1) {
          users.value[userIndex].role = newRole.value;
        }

        store.dispatch('toast/showToast', {
          message: `${editingUser.value.name}의 권한이 ${getRoleDisplayName(newRole.value)}로 변경되었습니다.`,
          type: 'success'
        });

        closeEditModal();
      } catch (error) {
        const errorMessage = error.response?.data || '권한 수정에 실패했습니다.';
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

    onMounted(async () => {
      await fetchUsers();
    });

    return {
      users,
      loading,
      showEditModal,
      showDeleteModal,
      showCreateModal,
      editingUser,
      deletingUser,
      newRole,
      newUser,
      deleteConfirmation,
      currentUser,
      adminCount,
      premiumCount,
      userCount,
      isCreateFormValid,
      fetchUsers,
      openEditModal,
      closeEditModal,
      openCreateModal,
      closeCreateModal,
      createUser,
      updateUserRole,
      confirmDelete,
      closeDeleteModal,
      onDeleteConfirmationChange,
      deleteUser,
      getRoleDisplayName,
      formatDate,
      isAllowedAdmin
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
}

.users-table-container {
  overflow-x: auto;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.users-table th,
.users-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e9ecef;
}

.users-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #495057;
  position: sticky;
  top: 0;
}

.user-row:hover {
  background: #f8f9fa;
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

.actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-edit {
  background: #007bff;
  color: white;
}

.btn-edit:hover:not(:disabled) {
  background: #0056b3;
}

.btn-delete {
  background: #dc3545;
  color: white;
}

.btn-delete:hover:not(:disabled) {
  background: #c82333;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #c82333;
}

.btn-create {
  background: #28a745;
  color: white;
}

.btn-create:hover:not(:disabled) {
  background: #218838;
}

.edit-form,
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

@media (max-width: 768px) {
  .admin-container {
    padding: 10px;
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .stats {
    width: 100%;
    justify-content: space-between;
  }
  
  .users-table {
    font-size: 14px;
  }
  
  .users-table th,
  .users-table td {
    padding: 8px;
  }
  
  .actions {
    flex-direction: column;
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
}
</style>
