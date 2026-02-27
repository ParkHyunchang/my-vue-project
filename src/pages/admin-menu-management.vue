<template>
  <div class="menu-management-container">
    <div class="menu-management-header">
      <h1>메뉴 권한 관리</h1>
      <p>사용자 권한별 메뉴 접근 권한을 설정합니다</p>
    </div>

    <div class="menu-management-content">
      <!-- 권한 탭 -->
      <div class="role-tabs">
        <button 
          v-for="role in roles" 
          :key="role.key"
          :class="['role-tab', { active: activeRole === role.key }]"
          @click="setActiveRole(role.key)"
        >
          <span class="role-icon">{{ role.icon }}</span>
          <span class="role-name">{{ role.name }}</span>
          <span class="role-count">({{ getMenuCountForRole(role.key) }}개)</span>
        </button>
      </div>

      <!-- 메뉴 관리 섹션 -->
      <div class="menu-management-section">
        <div class="section-header">
          <div class="section-title">
            <h2>{{ getCurrentRoleDisplayName() }} 권한 메뉴 설정</h2>
            <p class="section-description">
              체크된 메뉴는 해당 권한의 사용자가 접근할 수 있습니다. 
              체크를 해제하면 접근이 제한됩니다.
            </p>
          </div>
          <div class="header-actions">
            <button @click="selectAllMenus" class="btn btn-select-all">전체 선택</button>
            <button @click="deselectAllMenus" class="btn btn-deselect-all">전체 해제</button>
            <button @click="savePermissions" class="btn btn-save" :disabled="loading">
              {{ loading ? '저장 중...' : '설정 저장' }}
            </button>
          </div>
        </div>

        <!-- 메뉴 카테고리별 그룹 -->
        <div class="menu-categories">
          <div v-for="category in menuCategories" :key="category.name" class="menu-category">
            <div class="category-header">
              <h3>
                <span class="category-icon">{{ category.icon }}</span>
                {{ category.name }}
                <span class="category-count">({{ category.menus.length }}개)</span>
              </h3>
              <div class="category-actions">
                <button 
                  @click="toggleCategorySelection(category.key)"
                  class="btn btn-sm btn-category-toggle"
                >
                  {{ isCategoryFullySelected(category.key) ? '카테고리 해제' : '카테고리 선택' }}
                </button>
              </div>
            </div>
            
            <div class="menu-items">
              <div 
                v-for="menu in category.menus" 
                :key="menu.path"
                :class="['menu-item', { 
                  disabled: isMenuDisabledForRole(menu, activeRole),
                  selected: isMenuSelectedForRole(menu, activeRole)
                }]"
              >
                <div class="menu-info">
                  <div class="menu-main">
                    <span class="menu-icon">{{ menu.icon }}</span>
                    <span class="menu-name">{{ menu.name }}</span>
                    <span v-if="menu.isRequired" class="required-badge">필수</span>
                  </div>
                  <div class="menu-details">
                    <span class="menu-path">{{ menu.path }}</span>
                    <span class="menu-description">{{ menu.description }}</span>
                  </div>
                </div>
                
                <div class="menu-controls">
                  <div class="menu-status">
                    <span v-if="isMenuDisabledForRole(menu, activeRole)" class="status-label required">
                      {{ menu.isRequired ? '필수' : (menu.category === 'admin' && activeRole === 'ADMIN') ? '관리자 필수' : '제한됨' }}
                    </span>
                    <span v-else-if="isMenuSelectedForRole(menu, activeRole)" class="status-label allowed">
                      접근 허용
                    </span>
                    <span v-else class="status-label denied">
                      접근 차단
                    </span>
                  </div>
                  <label class="menu-checkbox">
                    <input 
                      type="checkbox"
                      :checked="isMenuSelectedForRole(menu, activeRole)"
                      :disabled="isMenuDisabledForRole(menu, activeRole)"
                      @change="toggleMenuForRole(menu, activeRole)"
                    />
                    <span class="checkmark"></span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 권한 요약 -->
        <div class="permission-summary">
          <h3>권한 요약</h3>
          <div class="summary-content">
            <div class="summary-stats">
              <div class="stat-item">
                <span class="stat-label">전체 메뉴:</span>
                <span class="stat-value">{{ totalMenuCount }}개</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">접근 가능:</span>
                <span class="stat-value accessible">{{ getAccessibleMenuCount() }}개</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">접근 불가:</span>
                <span class="stat-value restricted">{{ getRestrictedMenuCount() }}개</span>
              </div>
            </div>
            
            <div class="accessible-menus-preview">
              <h4>접근 가능한 메뉴 목록</h4>
              <div class="menu-preview-list">
                <span 
                  v-for="menu in getAccessibleMenusForRole(activeRole)" 
                  :key="menu.path"
                  class="menu-preview-item"
                >
                  {{ menu.name }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 변경사항 확인 모달 -->
    <Modal v-if="showSaveModal" @close="closeSaveModal">
      <template #header>
        <h3>권한 변경사항 저장</h3>
      </template>
      <template #body>
        <div class="save-confirmation">
          <div class="confirmation-icon">⚠️</div>
          <div class="confirmation-content">
            <h4>{{ getCurrentRoleDisplayName() }} 권한 설정을 저장하시겠습니까?</h4>
            <div class="changes-summary">
              <p><strong>변경될 내용:</strong></p>
              <ul>
                <li>접근 가능한 메뉴: <strong>{{ getAccessibleMenuCount() }}개</strong></li>
                <li>접근 불가한 메뉴: <strong>{{ getRestrictedMenuCount() }}개</strong></li>
              </ul>
              <div class="warning-note">
                <p class="warning-text">⚠️ 이 변경사항은 즉시 적용됩니다!</p>
                <p class="warning-text">⚠️ 해당 권한을 가진 모든 사용자에게 영향을 미칩니다!</p>
              </div>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <button @click="closeSaveModal" class="btn btn-secondary">취소</button>
        <button @click="confirmSavePermissions" class="btn btn-primary" :disabled="loading">
          {{ loading ? '저장 중...' : '확인 후 저장' }}
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
  name: 'MenuManagement',
  components: {
    Modal
  },
  setup() {
    const store = useStore();
    const loading = ref(false);
    const activeRole = ref('USER');
    const showSaveModal = ref(false);
    const menuPermissions = ref({
      USER: [],
      PREMIUM: [],
      ADMIN: []
    });

    // 권한 정의
    const roles = [
      { key: 'USER', name: '일반 사용자', icon: '👤' },
      { key: 'PREMIUM', name: '프리미엄 사용자', icon: '⭐' },
      { key: 'ADMIN', name: '관리자', icon: '👑' }
    ];

    // 메뉴 정의 (현재 라우터 기반)
    const allMenus = [
      {
        path: '/',
        name: '홈',
        icon: '🏠',
        description: '메인 홈페이지',
        category: 'main',
        isRequired: true,
        defaultRoles: ['USER', 'PREMIUM', 'ADMIN']
      },
      {
        path: '/portfolio',
        name: '포트폴리오',
        icon: '💼',
        description: '개인 포트폴리오 페이지',
        category: 'main',
        isRequired: false,
        defaultRoles: ['USER', 'PREMIUM', 'ADMIN']
      },
      {
        path: '/projects',
        name: '프로젝트',
        icon: '🚀',
        description: '프로젝트 관리 및 조회',
        category: 'work',
        isRequired: false,
        defaultRoles: ['USER', 'PREMIUM', 'ADMIN']
      },
      {
        path: '/history',
        name: '히스토리',
        icon: '📚',
        description: '작업 이력 및 기록',
        category: 'work',
        isRequired: false,
        defaultRoles: ['PREMIUM', 'ADMIN']
      },
      {
        path: '/dating',
        name: '데이팅',
        icon: '💕',
        description: '데이팅 관련 기능',
        category: 'personal',
        isRequired: false,
        defaultRoles: ['PREMIUM', 'ADMIN']
      },
      {
        path: '/todos',
        name: '할일 목록',
        icon: '📝',
        description: '할일 관리',
        category: 'productivity',
        isRequired: false,
        defaultRoles: ['USER', 'PREMIUM', 'ADMIN']
      },
      {
        path: '/todos/create',
        name: '할일 생성',
        icon: '➕',
        description: '새로운 할일 추가',
        category: 'productivity',
        isRequired: false,
        defaultRoles: ['USER', 'PREMIUM', 'ADMIN']
      },
      {
        path: '/expense',
        name: '지출 관리',
        icon: '💰',
        description: '지출 내역 관리',
        category: 'finance',
        isRequired: false,
        defaultRoles: ['ADMIN']
      },
      {
        path: '/admin',
        name: '관리자 대시보드',
        icon: '🎛️',
        description: '관리자 메인 대시보드',
        category: 'admin',
        isRequired: false,
        defaultRoles: ['ADMIN']
      },
      {
        path: '/admin/users',
        name: '사용자 관리',
        icon: '👥',
        description: '사용자 계정 관리',
        category: 'admin',
        isRequired: false,
        defaultRoles: ['ADMIN']
      },
      {
        path: '/admin/menu-management',
        name: '메뉴 권한 관리',
        icon: '🔐',
        description: '메뉴 접근 권한 설정',
        category: 'admin',
        isRequired: false,
        defaultRoles: ['ADMIN']
      }
    ];

    // 메뉴 카테고리 정의 (computed 제거하고 직접 계산)
    const menuCategories = computed(() => [
      {
        key: 'main',
        name: '메인',
        icon: '🏠',
        menus: allMenus.filter(menu => menu.category === 'main')
      },
      {
        key: 'work',
        name: '업무',
        icon: '💼',
        menus: allMenus.filter(menu => menu.category === 'work')
      },
      {
        key: 'personal',
        name: '개인',
        icon: '👤',
        menus: allMenus.filter(menu => menu.category === 'personal')
      },
      {
        key: 'productivity',
        name: '생산성',
        icon: '📋',
        menus: allMenus.filter(menu => menu.category === 'productivity')
      },
      {
        key: 'finance',
        name: '재정',
        icon: '💰',
        menus: allMenus.filter(menu => menu.category === 'finance')
      },
      {
        key: 'admin',
        name: '관리자',
        icon: '⚙️',
        menus: allMenus.filter(menu => menu.category === 'admin')
      }
    ]);

    const totalMenuCount = computed(() => allMenus.length);

    const getCurrentRoleDisplayName = () => {
      const role = roles.find(r => r.key === activeRole.value);
      return role ? role.name : activeRole.value;
    };

    const setActiveRole = (role) => {
      activeRole.value = role;
    };

    const getMenuCountForRole = (role) => {
      return menuPermissions.value[role]?.length || 0;
    };

    const isMenuDisabledForRole = (menu, role) => {
      // 필수 메뉴는 모든 권한에서 비활성화 불가 (항상 접근 가능)
      if (menu.isRequired) {
        return true;
      }
      
      // 관리자의 경우
      if (role === 'ADMIN') {
        // 관리자 메뉴들은 관리자에게 필수이므로 비활성화 (항상 접근 가능)
        if (menu.category === 'admin') {
          return true;
        }
        // 다른 메뉴들은 관리자가 설정 가능
        return false;
      }
      
      // 일반/프리미엄 사용자의 경우
      // 관리자 전용 메뉴는 접근 불가로 비활성화
      if (menu.category === 'admin') {
        return true;
      }
      
      return false;
    };

    const isMenuSelectedForRole = (menu, role) => {
      // 관리자는 모든 메뉴 접근 가능
      if (role === 'ADMIN') {
        return true;
      }
      
      // 필수 메뉴는 항상 선택됨
      if (menu.isRequired) {
        return true;
      }
      
      // 관리자 전용 메뉴는 일반/프리미엄 사용자는 선택 불가
      if (menu.category === 'admin' && role !== 'ADMIN') {
        return false;
      }
      
      return menuPermissions.value[role]?.includes(menu.path) || false;
    };

    const toggleMenuForRole = (menu, role) => {
      if (isMenuDisabledForRole(menu, role)) {
        return;
      }
      
      if (!menuPermissions.value[role]) {
        menuPermissions.value[role] = [];
      }
      
      const index = menuPermissions.value[role].indexOf(menu.path);
      if (index > -1) {
        menuPermissions.value[role].splice(index, 1);
      } else {
        menuPermissions.value[role].push(menu.path);
      }
    };

    const isCategoryFullySelected = (categoryKey) => {
      const categoryMenus = menuCategories.value.find(cat => cat.key === categoryKey)?.menus || [];
      return categoryMenus.every(menu => isMenuSelectedForRole(menu, activeRole.value));
    };

    const toggleCategorySelection = (categoryKey) => {
      const categoryMenus = menuCategories.value.find(cat => cat.key === categoryKey)?.menus || [];
      const isFullySelected = isCategoryFullySelected(categoryKey);
      
      categoryMenus.forEach(menu => {
        if (!isMenuDisabledForRole(menu, activeRole.value)) {
          if (!menuPermissions.value[activeRole.value]) {
            menuPermissions.value[activeRole.value] = [];
          }
          
          const index = menuPermissions.value[activeRole.value].indexOf(menu.path);
          
          if (isFullySelected) {
            // 전체 해제
            if (index > -1) {
              menuPermissions.value[activeRole.value].splice(index, 1);
            }
          } else {
            // 전체 선택
            if (index === -1) {
              menuPermissions.value[activeRole.value].push(menu.path);
            }
          }
        }
      });
    };

    const selectAllMenus = () => {
      if (!menuPermissions.value[activeRole.value]) {
        menuPermissions.value[activeRole.value] = [];
      }
      
      allMenus.forEach(menu => {
        if (!isMenuDisabledForRole(menu, activeRole.value)) {
          const index = menuPermissions.value[activeRole.value].indexOf(menu.path);
          if (index === -1) {
            menuPermissions.value[activeRole.value].push(menu.path);
          }
        }
      });
    };

    const deselectAllMenus = () => {
      if (!menuPermissions.value[activeRole.value]) {
        menuPermissions.value[activeRole.value] = [];
      }
      
      allMenus.forEach(menu => {
        if (!isMenuDisabledForRole(menu, activeRole.value)) {
          const index = menuPermissions.value[activeRole.value].indexOf(menu.path);
          if (index > -1) {
            menuPermissions.value[activeRole.value].splice(index, 1);
          }
        }
      });
    };

    const getAccessibleMenuCount = () => {
      return allMenus.filter(menu => isMenuSelectedForRole(menu, activeRole.value)).length;
    };

    const getRestrictedMenuCount = () => {
      return totalMenuCount.value - getAccessibleMenuCount();
    };

    const getAccessibleMenusForRole = (role) => {
      return allMenus.filter(menu => isMenuSelectedForRole(menu, role));
    };

    const loadMenuPermissions = async () => {
      try {
        loading.value = true;
        
        // 기본 권한 먼저 설정 (UI가 빈 상태로 보이지 않도록)
        roles.forEach(role => {
          menuPermissions.value[role.key] = allMenus
            .filter(menu => menu.defaultRoles.includes(role.key))
            .map(menu => menu.path);
        });
        
        // API에서 저장된 권한 정보 로드 시도
        const response = await axios.get('/api/admin/menu-permissions');
        
        if (response.data) {
          // API 데이터가 있으면 기본값을 덮어씀
          Object.keys(response.data).forEach(role => {
            if (response.data[role] && response.data[role].length > 0) {
              menuPermissions.value[role] = response.data[role];
            }
          });
        }
        
      } catch (error) {
        console.error('메뉴 권한 정보를 불러오는데 실패했습니다. 기본값을 사용합니다.');
        
        // API 실패 시 기본 권한 설정 (이미 위에서 설정했지만 확실히 하기 위해)
        roles.forEach(role => {
          if (!menuPermissions.value[role.key] || menuPermissions.value[role.key].length === 0) {
            menuPermissions.value[role.key] = allMenus
              .filter(menu => menu.defaultRoles.includes(role.key))
              .map(menu => menu.path);
          }
        });
        
      } finally {
        loading.value = false;
      }
    };

    const savePermissions = () => {
      showSaveModal.value = true;
    };

    const closeSaveModal = () => {
      showSaveModal.value = false;
    };

    const confirmSavePermissions = async () => {
      try {
        loading.value = true;
        
        await axios.post('/api/admin/menu-permissions', {
          permissions: menuPermissions.value
        });
        
        store.dispatch('toast/showToast', {
          message: '메뉴 권한 설정이 성공적으로 저장되었습니다.',
          type: 'success'
        });
        
        // 현재 사용자의 메뉴 권한도 새로고침
        try {
          await store.dispatch('menu/refreshUserMenus');
        } catch (error) {
          console.error('메뉴 권한 새로고침 실패:', error);
        }
        
        closeSaveModal();
        
      } catch (error) {
        console.error('메뉴 권한 설정 저장 실패:', error);
        store.dispatch('toast/showToast', {
          message: '메뉴 권한 설정 저장에 실패했습니다.',
          type: 'error'
        });
      } finally {
        loading.value = false;
      }
    };


    onMounted(async () => {
      await loadMenuPermissions();
    });

    return {
      loading,
      activeRole,
      showSaveModal,
      menuPermissions,
      roles,
      allMenus,
      menuCategories,
      totalMenuCount,
      getCurrentRoleDisplayName,
      setActiveRole,
      getMenuCountForRole,
      isMenuDisabledForRole,
      isMenuSelectedForRole,
      toggleMenuForRole,
      isCategoryFullySelected,
      toggleCategorySelection,
      selectAllMenus,
      deselectAllMenus,
      getAccessibleMenuCount,
      getRestrictedMenuCount,
      getAccessibleMenusForRole,
      savePermissions,
      closeSaveModal,
      confirmSavePermissions
    };
  }
};
</script>

<style scoped>
.menu-management-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.menu-management-header {
  text-align: center;
  margin-bottom: 40px;
}

.menu-management-header h1 {
  color: #2c3e50;
  margin-bottom: 10px;
  font-size: 2.2rem;
}

.menu-management-header p {
  color: #7f8c8d;
  font-size: 1.1rem;
}

.menu-management-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* 권한 탭 */
.role-tabs {
  display: flex;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.role-tab {
  flex: 1;
  padding: 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.role-tab:hover {
  background: #e9ecef;
}

.role-tab.active {
  background: white;
  border-bottom: 3px solid #007bff;
}

.role-icon {
  font-size: 1.5rem;
}

.role-name {
  font-weight: 600;
  color: #2c3e50;
}

.role-count {
  font-size: 0.9rem;
  color: #6c757d;
}

/* 메뉴 관리 섹션 */
.menu-management-section {
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

.section-title {
  flex: 1;
}

.section-header h2 {
  color: #2c3e50;
  margin: 0 0 8px 0;
}

.section-description {
  color: #6c757d;
  font-size: 0.95rem;
  margin: 0;
  line-height: 1.4;
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

/* 메뉴 카테고리 */
.menu-categories {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.menu-category {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  overflow: hidden;
}

.category-header {
  background: #f8f9fa;
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e9ecef;
}

.category-header h3 {
  margin: 0;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 10px;
}

.category-icon {
  font-size: 1.2rem;
}

.category-count {
  font-size: 0.9rem;
  color: #6c757d;
  font-weight: normal;
  margin-left: 8px;
}

.menu-items {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.menu-item:hover:not(.disabled) {
  border-color: #007bff;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
}

.menu-item.selected {
  background: #e3f2fd;
  border-color: #2196f3;
}

.menu-item.disabled {
  opacity: 0.6;
  background: #f8f9fa;
}

.menu-info {
  flex: 1;
}

.menu-main {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.menu-icon {
  font-size: 1.2rem;
}

.menu-name {
  font-weight: 600;
  color: #2c3e50;
}

.required-badge {
  background: #dc3545;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.menu-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-left: 32px;
}

.menu-path {
  font-family: monospace;
  color: #6c757d;
  font-size: 0.9rem;
}

.menu-description {
  color: #6c757d;
  font-size: 0.9rem;
}

/* 메뉴 컨트롤 스타일 */
.menu-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 120px;
}

.menu-status {
  text-align: center;
}

.status-label {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-label.required {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

.status-label.allowed {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.status-label.denied {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

/* 체크박스 스타일 */
.menu-checkbox {
  position: relative;
  cursor: pointer;
  display: block;
  width: 24px;
  height: 24px;
}

.menu-checkbox input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.checkmark {
  position: absolute;
  top: 0;
  left: 0;
  height: 24px;
  width: 24px;
  background-color: #fff;
  border: 2px solid #ced4da;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.menu-checkbox:hover input ~ .checkmark {
  border-color: #007bff;
}

.menu-checkbox input:checked ~ .checkmark {
  background-color: #007bff;
  border-color: #007bff;
}

.checkmark:after {
  content: "";
  position: absolute;
  display: none;
}

.menu-checkbox input:checked ~ .checkmark:after {
  display: block;
}

.menu-checkbox .checkmark:after {
  left: 7px;
  top: 3px;
  width: 6px;
  height: 12px;
  border: solid white;
  border-width: 0 3px 3px 0;
  transform: rotate(45deg);
}

.menu-checkbox input:disabled ~ .checkmark {
  background-color: #f8f9fa;
  border-color: #e9ecef;
  cursor: not-allowed;
}

/* 권한 요약 */
.permission-summary {
  margin-top: 40px;
  padding: 25px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.permission-summary h3 {
  color: #2c3e50;
  margin: 0 0 20px 0;
}

.summary-content {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.summary-stats {
  display: flex;
  gap: 30px;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.stat-label {
  font-size: 0.9rem;
  color: #6c757d;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
}

.stat-value.accessible {
  color: #28a745;
}

.stat-value.restricted {
  color: #dc3545;
}

.accessible-menus-preview h4 {
  color: #2c3e50;
  margin: 0 0 15px 0;
  font-size: 1.1rem;
}

.menu-preview-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.menu-preview-item {
  background: #007bff;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
}

/* 버튼 스타일 */
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

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-select-all {
  background: #28a745;
  color: white;
}

.btn-select-all:hover:not(:disabled) {
  background: #218838;
}

.btn-deselect-all {
  background: #6c757d;
  color: white;
}

.btn-deselect-all:hover:not(:disabled) {
  background: #545b62;
}

.btn-save,
.btn-primary {
  background: #007bff;
  color: white;
}

.btn-save:hover:not(:disabled),
.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
}

.btn-category-toggle {
  background: #17a2b8;
  color: white;
}

.btn-category-toggle:hover:not(:disabled) {
  background: #138496;
}

/* 저장 확인 모달 */
.save-confirmation {
  display: flex;
  gap: 15px;
  align-items: flex-start;
}

.confirmation-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.confirmation-content {
  flex: 1;
}

.confirmation-content h4 {
  color: #2c3e50;
  margin: 0 0 15px 0;
}

.changes-summary {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.changes-summary p {
  margin: 0 0 10px 0;
  font-weight: 500;
}

.changes-summary ul {
  margin: 10px 0;
  padding-left: 20px;
}

.changes-summary li {
  margin: 5px 0;
}

.warning-note {
  margin-top: 15px;
  padding: 10px;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 4px;
}

.warning-text {
  color: #856404;
  font-weight: 500;
  margin: 5px 0;
}

/* 모바일 대응 */
@media (max-width: 768px) {
  .menu-management-container {
    padding: 10px;
  }
  
  .menu-management-header h1 {
    font-size: 1.5rem;
  }
  
  .menu-management-header p {
    font-size: 0.95rem;
  }
  
  /* ✅ role-tabs를 가로 스크롤로 변경 */
  .role-tabs {
    flex-direction: row;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  
  .role-tabs::-webkit-scrollbar {
    display: none;
  }
  
  .role-tab {
    flex-shrink: 0;
    min-width: 100px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 12px 10px;
    gap: 4px;
  }
  
  /* ✅ active 탭 border-bottom으로 통일 */
  .role-tab.active {
    border-bottom: 3px solid #007bff;
    border-left: none;
  }
  
  .role-icon {
    font-size: 1.3rem;
  }
  
  .role-name {
    font-size: 0.85rem;
  }
  
  .role-count {
    font-size: 0.75rem;
  }
  
  .menu-management-section {
    padding: 15px;
  }
  
  .section-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .section-header h2 {
    font-size: 1.1rem;
  }
  
  /* ✅ header-actions 버튼을 3열 그리드로 배치 */
  .header-actions {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
    justify-content: stretch;
  }
  
  .header-actions .btn {
    padding: 8px 6px;
    font-size: 12px;
    text-align: center;
    white-space: nowrap;
  }
  
  .menu-categories {
    gap: 20px;
  }
  
  .category-header {
    padding: 12px 15px;
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .category-header h3 {
    font-size: 0.95rem;
    flex: 1;
  }
  
  .menu-items {
    padding: 12px;
    gap: 10px;
  }
  
  /* ✅ menu-item을 가로 유지하여 compact하게 */
  .menu-item {
    flex-direction: row;
    align-items: center;
    gap: 10px;
    padding: 12px;
  }
  
  .menu-info {
    flex: 1;
    min-width: 0;
  }
  
  .menu-main {
    margin-bottom: 4px;
    flex-wrap: nowrap;
    gap: 6px;
  }
  
  .menu-name {
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .menu-details {
    margin-left: 0;
  }
  
  .menu-path {
    font-size: 0.78rem;
  }
  
  .menu-description {
    font-size: 0.78rem;
  }
  
  /* ✅ menu-controls를 우측 고정 compact */
  .menu-controls {
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-width: 70px;
    flex-shrink: 0;
    gap: 6px;
    width: auto;
  }
  
  .menu-status {
    text-align: center;
  }
  
  .status-label {
    font-size: 0.68rem;
    padding: 3px 5px;
    white-space: nowrap;
  }
  
  .summary-stats {
    justify-content: space-around;
    gap: 15px;
  }
  
  .save-confirmation {
    flex-direction: column;
    gap: 10px;
  }
  
  .confirmation-icon {
    text-align: center;
  }
}

@media (max-width: 480px) {
  .menu-management-container {
    padding: 5px;
  }
  
  .menu-management-section {
    padding: 15px;
  }
  
  .role-tab {
    padding: 12px;
    font-size: 0.9rem;
  }
  
  .role-icon {
    font-size: 1.2rem;
  }
  
  .menu-item {
    padding: 12px;
  }
  
  .category-header {
    padding: 12px 15px;
  }
  
  .category-header h3 {
    font-size: 1rem;
  }
  
  .menu-items {
    padding: 15px;
  }
  
  .menu-name {
    font-size: 0.9rem;
  }
  
  .menu-path,
  .menu-description {
    font-size: 0.8rem;
  }
  
  .permission-summary {
    padding: 15px;
  }
  
  .summary-stats {
    flex-direction: column;
    gap: 15px;
  }
  
  .stat-item {
    flex-direction: row;
    justify-content: space-between;
  }
  
  .btn {
    padding: 6px 12px;
    font-size: 12px;
  }
}
</style>
