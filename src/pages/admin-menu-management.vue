<template>
  <div class="page-container">
    <!-- 헤더 -->
    <div class="page-header">
      <div>
        <h1>권한별 접근메뉴관리</h1>
        <p>권한(Role)별로 접근 가능한 메뉴를 설정합니다</p>
      </div>
    </div>

    <!-- 로딩 -->
    <div v-if="pageLoading" class="loading-state">
      <div class="spinner"></div>
      <p>데이터를 불러오는 중...</p>
    </div>

    <!-- 메인 2패널 레이아웃 -->
    <div v-else class="split-layout">

      <!-- ===== 좌측: 권한 목록 ===== -->
      <div class="left-panel">
        <div class="panel-header">
          <h2>권한 목록</h2>
          <span class="panel-count">{{ roles.length }}개</span>
        </div>
        <div class="role-list">
          <div
            v-for="role in roles"
            :key="role.key"
            :class="['role-row', { active: activeRole === role.key }]"
            @click="setActiveRole(role.key)"
          >
            <span class="role-row-icon">{{ getRoleIcon(role.key) }}</span>
            <div class="role-row-info">
              <span class="role-row-name">{{ role.name }}</span>
              <span class="role-row-key">{{ role.key }}</span>
            </div>
            <div class="role-row-meta">
              <span :class="['type-badge', role.isDefault ? 'badge-default' : 'badge-custom']">
                {{ role.isDefault ? '기본' : '커스텀' }}
              </span>
              <span class="menu-count-badge">{{ getMenuCountForRole(role.key) }}개</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== 우측: 메뉴 설정 ===== -->
      <div class="right-panel">
        <template v-if="activeRole">
          <!-- 패널 헤더 -->
          <div class="panel-header">
            <div>
              <h2>{{ getCurrentRoleDisplayName() }} 접근 메뉴 설정</h2>
              <p class="panel-desc">체크된 메뉴는 해당 권한 사용자가 접근할 수 있습니다</p>
            </div>
            <div class="panel-actions">
              <button @click="selectAllMenus" class="btn btn-outline">전체 선택</button>
              <button @click="deselectAllMenus" class="btn btn-outline-red">전체 해제</button>
              <button @click="savePermissions" class="btn btn-primary" :disabled="saving">
                {{ saving ? '저장 중...' : '설정 저장' }}
              </button>
            </div>
          </div>

          <!-- 메뉴 카테고리 -->
          <div class="menu-categories">
            <div
              v-for="category in menuCategories"
              :key="category.key"
              class="category-block"
            >
              <div class="category-header">
                <div class="category-title">
                  <span class="category-icon">{{ category.icon }}</span>
                  <span class="category-name">{{ category.name }}</span>
                  <span class="category-count">({{ category.menus.length }}개)</span>
                </div>
                <button
                  class="btn btn-sm btn-category"
                  @click="toggleCategorySelection(category.key)"
                >
                  {{ isCategoryFullySelected(category.key) ? '카테고리 해제' : '카테고리 선택' }}
                </button>
              </div>

              <div class="menu-items">
                <div
                  v-for="menu in category.menus"
                  :key="menu.path"
                  :class="['menu-item', {
                    'is-disabled': isMenuDisabledForRole(menu, activeRole),
                    'is-checked': isMenuSelectedForRole(menu, activeRole)
                  }]"
                >
                  <!-- 메뉴 접근 행 -->
                  <div class="menu-access-row">
                    <label class="menu-label">
                      <input
                        type="checkbox"
                        :checked="isMenuSelectedForRole(menu, activeRole)"
                        :disabled="isMenuDisabledForRole(menu, activeRole)"
                        @change="toggleMenuForRole(menu, activeRole)"
                      />
                      <div class="menu-text">
                        <div class="menu-top">
                          <span class="menu-icon">{{ menu.icon }}</span>
                          <span class="menu-name">{{ menu.name }}</span>
                          <span v-if="menu.isRequired" class="required-badge">필수</span>
                        </div>
                        <span class="menu-path">{{ menu.path }}</span>
                      </div>
                    </label>
                    <span
                      :class="['status-pill',
                        isMenuDisabledForRole(menu, activeRole) ? 'pill-locked' :
                        isMenuSelectedForRole(menu, activeRole) ? 'pill-allow' : 'pill-deny'
                      ]"
                    >
                      {{ isMenuDisabledForRole(menu, activeRole) ? '고정' :
                         isMenuSelectedForRole(menu, activeRole) ? '허용' : '차단' }}
                    </span>
                  </div>

                  <!-- CRUD 권한 행 (접근 허용된 메뉴만 표시) -->
                  <div v-if="isMenuSelectedForRole(menu, activeRole)" class="crud-row">
                    <label v-for="op in crudOps" :key="op.key" class="crud-label">
                      <input
                        type="checkbox"
                        :checked="getCrud(menu.path, op.key)"
                        @change="setCrud(menu.path, op.key, $event.target.checked)"
                      />
                      <span>{{ op.label }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <div v-else class="empty-right">
          <span>👈</span>
          <p>좌측에서 권한을 선택하세요</p>
        </div>
      </div>
    </div>

    <!-- 저장 확인 모달 -->
    <Modal v-if="showSaveModal" @close="closeSaveModal">
      <template #header>
        <h3>메뉴 권한 저장</h3>
      </template>
      <template #body>
        <div class="modal-confirm-body">
          <div class="confirm-icon">⚠️</div>
          <div>
            <p><strong>{{ getCurrentRoleDisplayName() }}</strong> 권한의 메뉴 접근 설정을 저장하시겠습니까?</p>
            <ul class="confirm-list">
              <li>접근 가능: <strong>{{ getAccessibleMenuCount() }}개</strong></li>
              <li>접근 차단: <strong>{{ getRestrictedMenuCount() }}개</strong></li>
            </ul>
            <p class="warn-text">⚠️ 해당 권한을 가진 모든 사용자에게 즉시 적용됩니다.</p>
          </div>
        </div>
      </template>
      <template #footer>
        <button @click="closeSaveModal" class="btn btn-outline">취소</button>
        <button @click="confirmSavePermissions" class="btn btn-primary" :disabled="saving">
          {{ saving ? '저장 중...' : '확인 후 저장' }}
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
  components: { Modal },
  setup() {
    const store = useStore();
    const pageLoading = ref(true);
    const saving = ref(false);
    const activeRole = ref(null);
    const showSaveModal = ref(false);
    const menuPermissions = ref({});
    const roles = ref([]);
    // crudPermissions: { menuPath: { canCreate, canRead, canUpdate, canDelete } }
    const crudPermissions = ref({});
    const crudOps = [
      { key: 'canCreate', label: '생성(C)' },
      { key: 'canRead',   label: '조회(R)' },
      { key: 'canUpdate', label: '수정(U)' },
      { key: 'canDelete', label: '삭제(D)' },
    ];

    // ===== 메뉴 정의 =====
    const allMenus = [
      { path: '/', name: '홈', icon: '🏠', description: '메인 홈페이지', category: 'main', isRequired: true, defaultRoles: ['USER', 'PREMIUM', 'ADMIN'] },
      { path: '/portfolio', name: '포트폴리오', icon: '💼', description: '개인 포트폴리오 페이지', category: 'main', isRequired: false, defaultRoles: ['USER', 'PREMIUM', 'ADMIN'] },
      { path: '/projects', name: '프로젝트', icon: '🚀', description: '프로젝트 관리 및 조회', category: 'work', isRequired: false, defaultRoles: ['USER', 'PREMIUM', 'ADMIN'] },
      { path: '/history', name: '히스토리', icon: '📚', description: '작업 이력 및 기록', category: 'work', isRequired: false, defaultRoles: ['PREMIUM', 'ADMIN'] },
      { path: '/dating', name: '데이팅', icon: '💕', description: '데이팅 관련 기능', category: 'personal', isRequired: false, defaultRoles: ['PREMIUM', 'ADMIN'] },
      { path: '/todos', name: '할일 목록', icon: '📝', description: '할일 관리', category: 'productivity', isRequired: false, defaultRoles: ['USER', 'PREMIUM', 'ADMIN'] },
      { path: '/todos/create', name: '할일 생성', icon: '➕', description: '새로운 할일 추가', category: 'productivity', isRequired: false, defaultRoles: ['USER', 'PREMIUM', 'ADMIN'] },
      { path: '/expense', name: '지출 관리', icon: '💰', description: '지출 내역 관리', category: 'finance', isRequired: false, defaultRoles: ['ADMIN'] },
      { path: '/admin', name: '관리자 대시보드', icon: '🎛️', description: '관리자 메인 대시보드', category: 'admin', isRequired: false, defaultRoles: ['ADMIN'] },
      { path: '/admin/users', name: '사용자 관리', icon: '👥', description: '사용자 계정 관리', category: 'admin', isRequired: false, defaultRoles: ['ADMIN'] },
      { path: '/admin/menu-management', name: '권한별 접근메뉴관리', icon: '🔐', description: '메뉴 접근 권한 설정', category: 'admin', isRequired: false, defaultRoles: ['ADMIN'] },
      { path: '/admin/role-management', name: '권한 관리', icon: '🛡️', description: '사용자 권한(Role) 관리', category: 'admin', isRequired: false, defaultRoles: ['ADMIN'] },
    ];

    const menuCategories = computed(() => [
      { key: 'main',         name: '메인',   icon: '🏠', menus: allMenus.filter(m => m.category === 'main') },
      { key: 'work',         name: '업무',   icon: '💼', menus: allMenus.filter(m => m.category === 'work') },
      { key: 'personal',     name: '개인',   icon: '👤', menus: allMenus.filter(m => m.category === 'personal') },
      { key: 'productivity', name: '생산성', icon: '📋', menus: allMenus.filter(m => m.category === 'productivity') },
      { key: 'finance',      name: '재정',   icon: '💰', menus: allMenus.filter(m => m.category === 'finance') },
      { key: 'admin',        name: '관리자', icon: '⚙️', menus: allMenus.filter(m => m.category === 'admin') },
    ]);

    const totalMenuCount = computed(() => allMenus.length);

    // ===== 권한 아이콘 =====
    const getRoleIcon = (key) => {
      const icons = { USER: '👤', PREMIUM: '⭐', ADMIN: '👑' };
      return icons[key] || '🔖';
    };

    // ===== 현재 권한 표시명 =====
    const getCurrentRoleDisplayName = () => {
      const r = roles.value.find(r => r.key === activeRole.value);
      return r ? r.name : activeRole.value;
    };

    // ===== CRUD getter/setter =====
    const getCrud = (menuPath, opKey) => {
      return crudPermissions.value[menuPath]?.[opKey] || false;
    };
    const setCrud = (menuPath, opKey, value) => {
      if (!crudPermissions.value[menuPath]) {
        crudPermissions.value[menuPath] = { canCreate: false, canRead: true, canUpdate: false, canDelete: false };
      }
      crudPermissions.value[menuPath][opKey] = value;
    };

    // ===== 권한 선택 =====
    const setActiveRole = async (key) => {
      activeRole.value = key;
      if (!menuPermissions.value[key]) {
        menuPermissions.value[key] = allMenus
          .filter(m => m.defaultRoles.includes(key))
          .map(m => m.path);
      }
      // 해당 권한의 CRUD 권한 로딩
      try {
        const res = await axios.get(`/api/admin/crud-permissions/${key}`);
        const map = {};
        (res.data || []).forEach(p => {
          map[p.menuPath] = {
            canCreate: p.canCreate,
            canRead:   p.canRead,
            canUpdate: p.canUpdate,
            canDelete: p.canDelete,
          };
        });
        crudPermissions.value = map;
      } catch (_) {
        crudPermissions.value = {};
      }
    };

    // ===== 메뉴 수 =====
    const getMenuCountForRole = (key) => menuPermissions.value[key]?.length || 0;

    // ===== 메뉴 비활성화 여부 =====
    const isMenuDisabledForRole = (menu, role) => {
      if (menu.isRequired) return true;
      if (role === 'ADMIN' && menu.category === 'admin') return true;
      if (role !== 'ADMIN' && menu.category === 'admin') return true;
      return false;
    };

    // ===== 메뉴 선택 여부 =====
    const isMenuSelectedForRole = (menu, role) => {
      if (isMenuDisabledForRole(menu, role)) return true;
      return menuPermissions.value[role]?.includes(menu.path) || false;
    };

    // ===== 메뉴 토글 =====
    const toggleMenuForRole = (menu, role) => {
      if (isMenuDisabledForRole(menu, role)) return;
      if (!menuPermissions.value[role]) menuPermissions.value[role] = [];
      const idx = menuPermissions.value[role].indexOf(menu.path);
      if (idx === -1) {
        // 메뉴 허용 → CRUD 전체 체크
        menuPermissions.value[role].push(menu.path);
        crudPermissions.value[menu.path] = { canCreate: true, canRead: true, canUpdate: true, canDelete: true };
      } else {
        // 메뉴 차단 → CRUD 전체 해제
        menuPermissions.value[role].splice(idx, 1);
        crudPermissions.value[menu.path] = { canCreate: false, canRead: false, canUpdate: false, canDelete: false };
      }
    };

    // ===== 카테고리 전체 선택 여부 =====
    const isCategoryFullySelected = (categoryKey) => {
      const category = menuCategories.value.find(c => c.key === categoryKey);
      if (!category) return false;
      return category.menus
        .filter(m => !isMenuDisabledForRole(m, activeRole.value))
        .every(m => menuPermissions.value[activeRole.value]?.includes(m.path));
    };

    // ===== 카테고리 토글 =====
    const toggleCategorySelection = (categoryKey) => {
      const category = menuCategories.value.find(c => c.key === categoryKey);
      if (!category || !activeRole.value) return;
      if (!menuPermissions.value[activeRole.value]) menuPermissions.value[activeRole.value] = [];

      const editableMenus = category.menus.filter(m => !isMenuDisabledForRole(m, activeRole.value));
      if (isCategoryFullySelected(categoryKey)) {
        menuPermissions.value[activeRole.value] = menuPermissions.value[activeRole.value]
          .filter(p => !editableMenus.map(m => m.path).includes(p));
      } else {
        editableMenus.forEach(m => {
          if (!menuPermissions.value[activeRole.value].includes(m.path)) {
            menuPermissions.value[activeRole.value].push(m.path);
          }
        });
      }
    };

    // ===== 전체 선택/해제 =====
    const selectAllMenus = () => {
      if (!activeRole.value) return;
      menuPermissions.value[activeRole.value] = allMenus
        .filter(m => !isMenuDisabledForRole(m, activeRole.value))
        .map(m => m.path);
    };

    const deselectAllMenus = () => {
      if (!activeRole.value) return;
      menuPermissions.value[activeRole.value] = [];
    };

    // ===== 접근 가능/불가 수 =====
    const getAccessibleMenuCount = () => {
      if (!activeRole.value) return 0;
      return allMenus.filter(m => isMenuSelectedForRole(m, activeRole.value)).length;
    };

    const getRestrictedMenuCount = () => totalMenuCount.value - getAccessibleMenuCount();

    // ===== 데이터 로드 =====
    const loadData = async () => {
      pageLoading.value = true;
      try {
        // 권한 목록 동적 로딩
        const rolesRes = await axios.get('/api/admin/role-infos');
        roles.value = rolesRes.data.map(r => ({
          key: r.roleName,
          name: r.displayName,
          isDefault: r.isDefault,
        }));

        // 메뉴 권한 초기값 설정
        const initial = {};
        roles.value.forEach(r => {
          initial[r.key] = allMenus
            .filter(m => m.defaultRoles.includes(r.key))
            .map(m => m.path);
        });
        menuPermissions.value = initial;

        // 저장된 메뉴 권한 로딩
        const permRes = await axios.get('/api/admin/menu-permissions');
        if (permRes.data) {
          Object.keys(permRes.data).forEach(roleKey => {
            if (permRes.data[roleKey]?.length > 0) {
              menuPermissions.value[roleKey] = permRes.data[roleKey];
            }
          });
        }

        // 첫 번째 권한 선택
        if (roles.value.length > 0) {
          activeRole.value = roles.value[0].key;
        }
      } catch (_) {
        // 로드 실패 시 기본값 유지
      } finally {
        pageLoading.value = false;
      }
    };

    // ===== 저장 =====
    const savePermissions = () => { showSaveModal.value = true; };
    const closeSaveModal = () => { showSaveModal.value = false; };

    const confirmSavePermissions = async () => {
      try {
        saving.value = true;
        // 1) 메뉴 접근 권한 저장
        await axios.post('/api/admin/menu-permissions', { permissions: menuPermissions.value });
        // 2) CRUD 권한 저장 (허용된 메뉴 기준)
        if (activeRole.value) {
          const allowedPaths = menuPermissions.value[activeRole.value] || [];
          const crudData = {};
          allowedPaths.forEach(path => {
            crudData[path] = crudPermissions.value[path] || {
              canCreate: false, canRead: true, canUpdate: false, canDelete: false
            };
          });
          await axios.post(`/api/admin/crud-permissions/${activeRole.value}`, crudData);
        }
        store.dispatch('toast/showToast', { message: '메뉴 접근 및 CRUD 권한이 저장되었습니다.', type: 'success' });
        try { await store.dispatch('menu/refreshUserMenus'); } catch (_) { /* ignore */ }
        closeSaveModal();
      } catch (e) {
        store.dispatch('toast/showToast', { message: '저장에 실패했습니다.', type: 'error' });
      } finally {
        saving.value = false;
      }
    };

    onMounted(loadData);

    return {
      pageLoading, saving, activeRole, showSaveModal,
      menuPermissions, roles, menuCategories, totalMenuCount,
      crudPermissions, crudOps, getCrud, setCrud,
      getRoleIcon, getCurrentRoleDisplayName, setActiveRole,
      getMenuCountForRole, isMenuDisabledForRole, isMenuSelectedForRole,
      toggleMenuForRole, isCategoryFullySelected, toggleCategorySelection,
      selectAllMenus, deselectAllMenus,
      getAccessibleMenuCount, getRestrictedMenuCount,
      savePermissions, closeSaveModal, confirmSavePermissions,
    };
  }
};
</script>

<style scoped>
/* ===== 레이아웃 ===== */
.page-container {
  padding: 24px 28px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 4px;
}

.page-header p {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

/* ===== 2패널 ===== */
.split-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 20px;
  align-items: start;
}

/* ===== 좌측 패널 ===== */
.left-panel,
.right-panel {
  background: white;
  border-radius: 14px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
  flex-wrap: wrap;
  gap: 10px;
}

.panel-header h2 {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.panel-count {
  font-size: 12px;
  color: #94a3b8;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 10px;
}

.panel-desc {
  font-size: 12px;
  color: #64748b;
  margin: 2px 0 0;
}

.panel-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* ===== 권한 리스트 ===== */
.role-list {
  padding: 8px 0;
}

.role-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.15s;
  border-left: 3px solid transparent;
}

.role-row:hover {
  background: #f8fafc;
}

.role-row.active {
  background: #eff6ff;
  border-left-color: #3b82f6;
}

.role-row-icon {
  font-size: 20px;
  flex-shrink: 0;
  width: 28px;
  text-align: center;
}

.role-row-info {
  flex: 1;
  min-width: 0;
}

.role-row-name {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.role-row-key {
  display: block;
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
}

.role-row-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  flex-shrink: 0;
}

.type-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 8px;
  font-weight: 600;
}

.badge-default {
  background: #dbeafe;
  color: #1d4ed8;
}

.badge-custom {
  background: #fef3c7;
  color: #92400e;
}

.menu-count-badge {
  font-size: 11px;
  color: #64748b;
}

/* ===== 우측 패널 ===== */
.menu-categories {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.category-block {
  border: 1px solid #f1f5f9;
  border-radius: 10px;
  overflow: hidden;
}

.category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #f8fafc;
  border-bottom: 1px solid #f1f5f9;
}

.category-title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.category-icon { font-size: 16px; }

.category-name {
  font-size: 13px;
  font-weight: 700;
  color: #374151;
}

.category-count {
  font-size: 12px;
  color: #94a3b8;
}

/* ===== 메뉴 아이템 ===== */
.menu-items {
  display: flex;
  flex-direction: column;
}

.menu-item {
  border-bottom: 1px solid #f8fafc;
  transition: background 0.1s;
}

.menu-item:last-child { border-bottom: none; }
.menu-item.is-checked { background: #f0fdf4; }
.menu-item.is-disabled { background: #f8fafc; opacity: 0.7; }

.menu-access-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
}

/* ===== CRUD 행 ===== */
.crud-row {
  display: flex;
  gap: 20px;
  padding: 8px 14px 10px 44px;
  background: #f8faff;
  border-top: 1px solid #e0eaff;
  flex-wrap: wrap;
}

.crud-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #374151;
  cursor: pointer;
  font-weight: 500;
}

.crud-label input[type="checkbox"] {
  width: 14px;
  height: 14px;
  accent-color: #6366f1;
  cursor: pointer;
}

.menu-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  flex: 1;
}

.menu-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #3b82f6;
  flex-shrink: 0;
  cursor: pointer;
}

.menu-label input:disabled { cursor: not-allowed; }

.menu-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.menu-top {
  display: flex;
  align-items: center;
  gap: 6px;
}

.menu-icon { font-size: 14px; }

.menu-name {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.menu-path {
  font-size: 11px;
  color: #94a3b8;
  font-family: monospace;
}

.required-badge {
  font-size: 10px;
  background: #fee2e2;
  color: #dc2626;
  padding: 1px 6px;
  border-radius: 8px;
  font-weight: 600;
}

/* ===== 상태 필 ===== */
.status-pill {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 8px;
  font-weight: 600;
  flex-shrink: 0;
}

.pill-allow { background: #dcfce7; color: #16a34a; }
.pill-deny  { background: #fee2e2; color: #dc2626; }
.pill-locked{ background: #e2e8f0; color: #475569; }

/* ===== 빈 화면 ===== */
.empty-right {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: #94a3b8;
  font-size: 14px;
  gap: 10px;
}

.empty-right span { font-size: 36px; }

/* ===== 버튼 ===== */
.btn {
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
  white-space: nowrap;
}

.btn-primary { background: #3b82f6; color: white; }
.btn-primary:hover:not(:disabled) { background: #2563eb; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-outline { background: white; color: #374151; border: 1px solid #e2e8f0; }
.btn-outline:hover { background: #f1f5f9; }

.btn-outline-red { background: white; color: #dc2626; border: 1px solid #fca5a5; }
.btn-outline-red:hover { background: #fef2f2; }

.btn-sm {
  padding: 4px 10px;
  font-size: 12px;
}

.btn-category {
  background: white;
  color: #374151;
  border: 1px solid #e2e8f0;
}

.btn-category:hover { background: #f1f5f9; }

/* ===== 로딩 ===== */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px;
  gap: 12px;
  color: #94a3b8;
  font-size: 14px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ===== 모달 ===== */
.modal-confirm-body {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 4px 0;
}

.confirm-icon { font-size: 28px; flex-shrink: 0; }

.confirm-list {
  margin: 10px 0;
  padding-left: 20px;
  font-size: 14px;
  color: #374151;
  line-height: 1.8;
}

.warn-text {
  font-size: 13px;
  color: #dc2626;
  margin-top: 10px;
}

/* ===== 반응형 ===== */
@media (max-width: 900px) {
  .split-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .page-container { padding: 16px; }
  .panel-header { flex-direction: column; align-items: flex-start; }
  .panel-actions { width: 100%; justify-content: flex-end; }
}
</style>
