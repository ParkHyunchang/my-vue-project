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
              <button v-if="orderChanged" @click="saveSortOrder" class="btn btn-outline" :disabled="savingOrder">
                {{ savingOrder ? '저장 중...' : '↕ 순서 저장' }}
              </button>
              <button @click="allCollapsed ? expandAll() : collapseAll()" class="btn btn-outline">
                {{ allCollapsed ? '모두 펼치기' : '모두 접기' }}
              </button>
              <button @click="selectAllMenus" class="btn btn-outline">전체 선택</button>
              <button @click="deselectAllMenus" class="btn btn-outline-red">전체 해제</button>
              <button @click="savePermissions" class="btn btn-primary" :disabled="saving">
                {{ saving ? '저장 중...' : '설정 저장' }}
              </button>
            </div>
          </div>

          <!-- 네비게이션 메뉴 순서 섹션 -->
          <div class="category-block nav-order-block">
            <div class="category-header" @click="navSectionCollapsed = !navSectionCollapsed" style="cursor:pointer">
              <div class="category-title">
                <span class="category-icon">🧭</span>
                <span class="category-name">네비게이션 메뉴 순서</span>
                <span class="category-count">({{ navMenusSorted.length }}개)</span>
                <span class="collapse-indicator">{{ navSectionCollapsed ? '▶' : '▼' }}</span>
              </div>
            </div>
            <div v-if="!navSectionCollapsed" class="menu-items nav-order-items">
              <div v-for="(menu, idx) in navMenusSorted" :key="menu.path" class="menu-item nav-order-item">
                <span class="nav-order-num">{{ idx + 1 }}</span>
                <span class="menu-icon" style="font-size:14px">{{ menu.icon }}</span>
                <span class="menu-name" style="font-size:13px;font-weight:600">{{ menu.name }}</span>
                <span class="menu-path" style="font-size:11px;color:var(--text-muted);font-family:monospace;margin-right:auto">{{ menu.path }}</span>
                <div class="menu-order-controls" @click.stop>
                  <button @click="moveNavMenuUp(menu)" :disabled="isFirstNavMenu(menu)" class="order-btn" title="위로">↑</button>
                  <button @click="moveNavMenuDown(menu)" :disabled="isLastNavMenu(menu)" class="order-btn" title="아래로">↓</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 메뉴 카테고리 -->
          <div class="menu-categories">
            <div
              v-for="category in menuCategories"
              :key="category.key"
              class="category-block"
            >
              <div class="category-header" @click="toggleCategoryCollapse(category.key)" style="cursor:pointer">
                <div class="category-title">
                  <span class="category-icon">{{ category.icon }}</span>
                  <span class="category-name">{{ category.name }}</span>
                  <span class="category-count">({{ category.menus.length }}개)</span>
                  <span class="collapse-indicator">{{ isCategoryCollapsed(category.key) ? '▶' : '▼' }}</span>
                </div>
                <button
                  class="btn btn-sm btn-category"
                  @click.stop="toggleCategorySelection(category.key)"
                >
                  {{ isCategoryFullySelected(category.key) ? '카테고리 해제' : '카테고리 선택' }}
                </button>
              </div>

              <div v-if="!isCategoryCollapsed(category.key)" class="menu-items">
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
                          <div class="menu-order-controls" @click.stop>
                            <button @click="moveMenuUp(menu)" :disabled="isFirstInCategory(menu)" class="order-btn" title="위로">↑</button>
                            <button @click="moveMenuDown(menu)" :disabled="isLastInCategory(menu)" class="order-btn" title="아래로">↓</button>
                          </div>
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

                  <!-- CRUD 권한 행 (접근 허용된 메뉴만 표시, GUEST 제외) -->
                  <div v-if="isMenuSelectedForRole(menu, activeRole) && activeRole !== 'GUEST'" class="crud-row">
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
    const savingOrder = ref(false);
    const orderChanged = ref(false);
    const activeRole = ref(null);
    const collapsedCategories = ref(new Set());
    const navSectionCollapsed = ref(false);
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

    // ===== 메뉴 정의 (DB에서 동적 로드) =====
    const allMenus = ref([]);

    const sortedByOrder = (menus) => [...menus].sort((a, b) => a.sortOrder - b.sortOrder);
    const menuCategories = computed(() => [
      { key: 'main',         name: '메인',   icon: '🏠', menus: sortedByOrder(allMenus.value.filter(m => m.category === 'main')) },
      { key: 'work',         name: '업무',   icon: '💼', menus: sortedByOrder(allMenus.value.filter(m => m.category === 'work')) },
      { key: 'personal',     name: '개인',   icon: '👤', menus: sortedByOrder(allMenus.value.filter(m => m.category === 'personal')) },
      { key: 'productivity', name: '생산성', icon: '📋', menus: sortedByOrder(allMenus.value.filter(m => m.category === 'productivity')) },
      { key: 'finance',      name: '재정',   icon: '💰', menus: sortedByOrder(allMenus.value.filter(m => m.category === 'finance')) },
      { key: 'admin',        name: '관리자', icon: '⚙️', menus: sortedByOrder(allMenus.value.filter(m => m.category === 'admin')) },
    ]);

    const totalMenuCount = computed(() => allMenus.value.length);

    // ===== 권한 아이콘 =====
    const getRoleIcon = (key) => {
      const icons = { USER: '👤', PREMIUM: '⭐', ADMIN: '👑', GUEST: '🌐' };
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
        menuPermissions.value[key] = allMenus.value
          .filter(m => m.defaultRoles && m.defaultRoles.includes(key))
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
      menuPermissions.value[activeRole.value] = allMenus.value
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
      return allMenus.value.filter(m => isMenuSelectedForRole(m, activeRole.value)).length;
    };

    const getRestrictedMenuCount = () => totalMenuCount.value - getAccessibleMenuCount();

    // ===== 데이터 로드 =====
    const loadData = async () => {
      pageLoading.value = true;
      try {
        // 메뉴 정의 DB에서 로딩
        const menuDefsRes = await axios.get('/api/admin/menus');
        allMenus.value = menuDefsRes.data.map(m => ({
          id: m.id,
          sortOrder: m.sortOrder,
          path: m.path,
          name: m.name,
          icon: m.icon,
          description: m.description,
          category: m.category,
          isRequired: m.required,
          showInNav: m.showInNav,
          defaultRoles: m.defaultRoles || [],
        }));

        // 권한 목록 동적 로딩
        const rolesRes = await axios.get('/api/admin/role-infos');
        roles.value = rolesRes.data.map(r => ({
          key: r.roleName,
          name: r.displayName,
          isDefault: r.isDefault,
        }));

        // 메뉴 권한 초기값 설정 (defaultRoles 기준)
        const initial = {};
        roles.value.forEach(r => {
          initial[r.key] = allMenus.value
            .filter(m => m.defaultRoles && m.defaultRoles.includes(r.key))
            .map(m => m.path);
        });
        menuPermissions.value = initial;

        // 저장된 메뉴 권한 로딩 (DB 저장값이 있으면 덮어씀)
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
          await setActiveRole(roles.value[0].key);
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
        // 1) 메뉴 순서 변경이 있으면 함께 저장
        if (orderChanged.value) {
          const sortOrders = allMenus.value.map(m => ({ id: m.id, sortOrder: m.sortOrder }));
          await axios.put('/api/admin/menus/sort-order', sortOrders);
          orderChanged.value = false;
        }
        // 2) 메뉴 접근 권한 저장
        await axios.post('/api/admin/menu-permissions', { permissions: menuPermissions.value });
        // 3) CRUD 권한 저장 (허용된 메뉴 기준)
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
        store.dispatch('toast/showToast', { message: '메뉴 순서 및 접근 권한이 저장되었습니다.', type: 'success' });
        try { await store.dispatch('menu/refreshUserMenus'); } catch (_) { /* ignore */ }
        closeSaveModal();
      } catch (e) {
        store.dispatch('toast/showToast', { message: '저장에 실패했습니다.', type: 'error' });
      } finally {
        saving.value = false;
      }
    };

    // ===== 카테고리 접기/펼치기 =====
    const isCategoryCollapsed = (key) => collapsedCategories.value.has(key);

    const toggleCategoryCollapse = (key) => {
      const next = new Set(collapsedCategories.value);
      next.has(key) ? next.delete(key) : next.add(key);
      collapsedCategories.value = next;
    };

    const collapseAll = () => {
      collapsedCategories.value = new Set(menuCategories.value.map(c => c.key));
      navSectionCollapsed.value = true;
    };

    const expandAll = () => {
      collapsedCategories.value = new Set();
      navSectionCollapsed.value = false;
    };

    const allCollapsed = computed(() =>
      navSectionCollapsed.value && menuCategories.value.every(c => collapsedCategories.value.has(c.key))
    );

    // ===== 네비게이션 메뉴 순서 (카테고리 무관 전체 정렬) =====
    const navMenusSorted = computed(() =>
      [...allMenus.value.filter(m => m.showInNav)].sort((a, b) => a.sortOrder - b.sortOrder)
    );

    const isFirstNavMenu = (menu) => {
      const s = navMenusSorted.value;
      return s.length === 0 || s[0].path === menu.path;
    };

    const isLastNavMenu = (menu) => {
      const s = navMenusSorted.value;
      return s.length === 0 || s[s.length - 1].path === menu.path;
    };

    const moveNavMenuUp = (menu) => {
      const sorted = navMenusSorted.value;
      const idx = sorted.findIndex(m => m.path === menu.path);
      if (idx <= 0) return;
      const prev = sorted[idx - 1];
      const target = allMenus.value.find(m => m.path === menu.path);
      const prevTarget = allMenus.value.find(m => m.path === prev.path);
      if (target && prevTarget) {
        const tmp = target.sortOrder;
        target.sortOrder = prevTarget.sortOrder;
        prevTarget.sortOrder = tmp;
        orderChanged.value = true;
      }
    };

    const moveNavMenuDown = (menu) => {
      const sorted = navMenusSorted.value;
      const idx = sorted.findIndex(m => m.path === menu.path);
      if (idx < 0 || idx >= sorted.length - 1) return;
      const next = sorted[idx + 1];
      const target = allMenus.value.find(m => m.path === menu.path);
      const nextTarget = allMenus.value.find(m => m.path === next.path);
      if (target && nextTarget) {
        const tmp = target.sortOrder;
        target.sortOrder = nextTarget.sortOrder;
        nextTarget.sortOrder = tmp;
        orderChanged.value = true;
      }
    };

    // ===== 메뉴 순서 이동 =====
    const getCategoryMenusSorted = (menuPath) => {
      const category = menuCategories.value.find(c => c.menus.some(m => m.path === menuPath));
      return category ? category.menus : [];
    };

    const isFirstInCategory = (menu) => {
      const sorted = getCategoryMenusSorted(menu.path);
      return sorted.length === 0 || sorted[0].path === menu.path;
    };

    const isLastInCategory = (menu) => {
      const sorted = getCategoryMenusSorted(menu.path);
      return sorted.length === 0 || sorted[sorted.length - 1].path === menu.path;
    };

    const moveMenuUp = (menu) => {
      const sorted = getCategoryMenusSorted(menu.path);
      const idx = sorted.findIndex(m => m.path === menu.path);
      if (idx <= 0) return;
      const prev = sorted[idx - 1];
      const target = allMenus.value.find(m => m.path === menu.path);
      const prevTarget = allMenus.value.find(m => m.path === prev.path);
      if (target && prevTarget) {
        const tmp = target.sortOrder;
        target.sortOrder = prevTarget.sortOrder;
        prevTarget.sortOrder = tmp;
        orderChanged.value = true;
      }
    };

    const moveMenuDown = (menu) => {
      const sorted = getCategoryMenusSorted(menu.path);
      const idx = sorted.findIndex(m => m.path === menu.path);
      if (idx < 0 || idx >= sorted.length - 1) return;
      const next = sorted[idx + 1];
      const target = allMenus.value.find(m => m.path === menu.path);
      const nextTarget = allMenus.value.find(m => m.path === next.path);
      if (target && nextTarget) {
        const tmp = target.sortOrder;
        target.sortOrder = nextTarget.sortOrder;
        nextTarget.sortOrder = tmp;
        orderChanged.value = true;
      }
    };

    const saveSortOrder = async () => {
      savingOrder.value = true;
      try {
        const sortOrders = allMenus.value.map(m => ({ id: m.id, sortOrder: m.sortOrder }));
        await axios.put('/api/admin/menus/sort-order', sortOrders);
        store.dispatch('toast/showToast', { message: '메뉴 순서가 저장되었습니다.', type: 'success' });
        orderChanged.value = false;
      } catch (e) {
        store.dispatch('toast/showToast', { message: '순서 저장에 실패했습니다.', type: 'error' });
      } finally {
        savingOrder.value = false;
      }
    };

    onMounted(loadData);

    return {
      pageLoading, saving, savingOrder, orderChanged, activeRole, showSaveModal,
      navSectionCollapsed, collapsedCategories,
      menuPermissions, roles, menuCategories, totalMenuCount,
      crudPermissions, crudOps, getCrud, setCrud,
      getRoleIcon, getCurrentRoleDisplayName, setActiveRole,
      getMenuCountForRole, isMenuDisabledForRole, isMenuSelectedForRole,
      toggleMenuForRole, isCategoryFullySelected, toggleCategorySelection,
      selectAllMenus, deselectAllMenus,
      getAccessibleMenuCount, getRestrictedMenuCount,
      savePermissions, closeSaveModal, confirmSavePermissions,
      isFirstInCategory, isLastInCategory, moveMenuUp, moveMenuDown, saveSortOrder,
      isCategoryCollapsed, toggleCategoryCollapse, collapseAll, expandAll, allCollapsed,
      navMenusSorted, isFirstNavMenu, isLastNavMenu, moveNavMenuUp, moveNavMenuDown,
    };
  }
};
</script>

<style src="@/assets/css/admin.css" scoped></style>
