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
              <span class="role-row-name">{{ role.name }}<span v-if="dirtyRoles.has(role.key)" class="unsaved-badge" style="font-size:9px;margin-left:4px">●</span></span>
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
              <h2>
                {{ getCurrentRoleDisplayName() }} 접근 메뉴 설정
                <span v-if="dirtyRoles.has(activeRole)" class="unsaved-badge">● 미저장</span>
              </h2>
              <p class="panel-desc">체크된 메뉴는 해당 권한 사용자가 접근할 수 있습니다 (접근 시 CRUD 모두 허용)</p>
            </div>
            <div class="panel-actions">
              <button v-if="dirtyRoles.has(activeRole)" @click="resetRole" class="btn btn-outline">↺ 초기화</button>
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
                  v-if="category.menus.some(m => !isMenuLocked(m))"
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
                    'is-disabled': isMenuLocked(menu),
                    'is-checked': isMenuSelectedForRole(menu, activeRole)
                  }]"
                >
                  <!-- 메뉴 접근 행 -->
                  <div class="menu-access-row">
                    <label class="menu-label">
                      <input
                        type="checkbox"
                        :checked="isMenuSelectedForRole(menu, activeRole)"
                        :disabled="isMenuLocked(menu)"
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
                        isMenuLocked(menu)
                          ? (isMenuSelectedForRole(menu, activeRole) ? 'pill-locked' : 'pill-locked-deny')
                          : (isMenuSelectedForRole(menu, activeRole) ? 'pill-allow' : 'pill-deny')
                      ]"
                    >
                      {{ isMenuLocked(menu)
                          ? (isMenuSelectedForRole(menu, activeRole) ? '고정' : '차단')
                          : (isMenuSelectedForRole(menu, activeRole) ? '허용' : '차단') }}
                    </span>
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
            <p>전체 권한의 메뉴 접근 설정을 저장하시겠습니까?</p>
            <ul class="confirm-list">
              <li>저장 대상 권한: <strong>{{ roles.length }}개</strong></li>
              <li v-if="dirtyRoles.size > 0">변경된 권한: <strong>{{ dirtyRoles.size }}개</strong></li>
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

    <!-- 미저장 변경사항 경고 모달 -->
    <Modal v-if="showUnsavedModal" @close="cancelRoleSwitch">
      <template #header>
        <h3>저장하지 않은 변경사항</h3>
      </template>
      <template #body>
        <div class="modal-confirm-body">
          <div class="confirm-icon">⚠️</div>
          <div>
            <p>저장하지 않은 변경사항이 있습니다.</p>
            <p class="warn-text">이동해도 변경사항은 메모리에 유지됩니다.<br>최종적으로 <strong>설정 저장</strong>을 눌러야 서버에 반영됩니다.</p>
          </div>
        </div>
      </template>
      <template #footer>
        <button @click="cancelRoleSwitch" class="btn btn-outline">돌아가기</button>
        <button @click="confirmRoleSwitch" class="btn btn-primary">저장 없이 이동</button>
      </template>
    </Modal>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import axios from '@/axios';
import { apiErrorMessage } from '@/utils/apiError';
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
    const dirtyRoles = ref(new Set()); // 미저장 변경사항이 있는 권한 키 집합
    const savedMenuPermissions = ref({}); // 마지막 저장 시점의 메뉴 권한 스냅샷
    const pendingRoleSwitch = ref(null);
    const showUnsavedModal = ref(false);

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

    // ===== 권한 선택 =====
    const doSetActiveRole = (key) => {
      activeRole.value = key;
      if (!menuPermissions.value[key]) {
        menuPermissions.value[key] = allMenus.value
          .filter(m => m.defaultRoles && m.defaultRoles.includes(key))
          .map(m => m.path);
      }
    };

    const setActiveRole = (key) => {
      if (dirtyRoles.value.has(activeRole.value) && activeRole.value && activeRole.value !== key) {
        pendingRoleSwitch.value = key;
        showUnsavedModal.value = true;
        return;
      }
      doSetActiveRole(key);
    };

    const confirmRoleSwitch = () => {
      showUnsavedModal.value = false;
      doSetActiveRole(pendingRoleSwitch.value);
      pendingRoleSwitch.value = null;
    };

    const cancelRoleSwitch = () => {
      showUnsavedModal.value = false;
      pendingRoleSwitch.value = null;
    };

    // ===== 변경사항 초기화 =====
    const resetRole = () => {
      const role = activeRole.value;
      if (!role) return;
      menuPermissions.value[role] = JSON.parse(JSON.stringify(savedMenuPermissions.value[role] ?? []));
      const next = new Set(dirtyRoles.value);
      next.delete(role);
      dirtyRoles.value = next;
    };

    // ===== 메뉴 수 (필수/고정 포함 실제 접근 가능 수) =====
    const getMenuCountForRole = (key) => allMenus.value.filter(m => isMenuSelectedForRole(m, key)).length;

    // ===== 메뉴 비활성화 여부 =====
    const isMenuLocked = (menu) => {
      if (menu.isRequired) return true;
      if (menu.category === 'admin') return true; // 관리자 메뉴는 항상 고정 (ADMIN만 접근)
      return false;
    };

    // ===== 메뉴 선택 여부 =====
    const isMenuSelectedForRole = (menu, role) => {
      if (menu.isRequired) return true;
      if (menu.category === 'admin') return role === 'ADMIN'; // ADMIN만 접근, 나머지는 항상 차단
      return menuPermissions.value[role]?.includes(menu.path) || false;
    };

    // ===== 메뉴 토글 =====
    const toggleMenuForRole = (menu, role) => {
      if (isMenuLocked(menu)) return;
      if (!menuPermissions.value[role]) menuPermissions.value[role] = [];
      const idx = menuPermissions.value[role].indexOf(menu.path);
      if (idx === -1) {
        menuPermissions.value[role].push(menu.path);
      } else {
        menuPermissions.value[role].splice(idx, 1);
      }
      dirtyRoles.value = new Set([...dirtyRoles.value, role]);
    };

    // ===== 카테고리 전체 선택 여부 =====
    const isCategoryFullySelected = (categoryKey) => {
      const category = menuCategories.value.find(c => c.key === categoryKey);
      if (!category) return false;
      const editableMenus = category.menus.filter(m => !isMenuLocked(m));
      if (editableMenus.length === 0) return false;
      return editableMenus.every(m => menuPermissions.value[activeRole.value]?.includes(m.path));
    };

    // ===== 카테고리 토글 =====
    const toggleCategorySelection = (categoryKey) => {
      const category = menuCategories.value.find(c => c.key === categoryKey);
      if (!category || !activeRole.value) return;
      const editableMenus = category.menus.filter(m => !isMenuLocked(m));
      if (editableMenus.length === 0) return;
      if (!menuPermissions.value[activeRole.value]) menuPermissions.value[activeRole.value] = [];
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
      dirtyRoles.value = new Set([...dirtyRoles.value, activeRole.value]);
    };

    // ===== 전체 선택/해제 =====
    const selectAllMenus = () => {
      if (!activeRole.value) return;
      const role = activeRole.value;
      menuPermissions.value[role] = allMenus.value
        .filter(m => !isMenuLocked(m))
        .map(m => m.path);
      dirtyRoles.value = new Set([...dirtyRoles.value, role]);
    };

    const deselectAllMenus = () => {
      if (!activeRole.value) return;
      menuPermissions.value[activeRole.value] = [];
      dirtyRoles.value = new Set([...dirtyRoles.value, activeRole.value]);
    };

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
            menuPermissions.value[roleKey] = permRes.data[roleKey] ?? [];
          });
        }

        // 메뉴 권한 스냅샷 저장 (초기화 기준점)
        savedMenuPermissions.value = JSON.parse(JSON.stringify(menuPermissions.value));

        // 첫 번째 권한 선택
        if (roles.value.length > 0) {
          doSetActiveRole(roles.value[0].key);
        }
      } catch (err) {
        store.dispatch('toast/showToast', { message: apiErrorMessage(err, '데이터를 불러오는 데 실패했습니다.'), type: 'error' });
      } finally {
        dirtyRoles.value = new Set();
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
        // 2) 메뉴 접근 권한 저장 (전체 권한 한번에)
        await axios.post('/api/admin/menu-permissions', { permissions: menuPermissions.value });
        dirtyRoles.value = new Set();
        savedMenuPermissions.value = JSON.parse(JSON.stringify(menuPermissions.value));
        store.dispatch('toast/showToast', { message: '메뉴 권한이 저장되었습니다.', type: 'success' });
        try { await store.dispatch('menu/refreshUserMenus'); } catch (_) { /* ignore */ }
        closeSaveModal();
      } catch (e) {
        store.dispatch('toast/showToast', { message: apiErrorMessage(e, '저장에 실패했습니다.'), type: 'error' });
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
        store.dispatch('toast/showToast', { message: apiErrorMessage(e, '순서 저장에 실패했습니다.'), type: 'error' });
      } finally {
        savingOrder.value = false;
      }
    };

    onMounted(loadData);

    return {
      pageLoading, saving, savingOrder, orderChanged, activeRole, showSaveModal,
      navSectionCollapsed,
      roles, menuCategories,
      dirtyRoles, showUnsavedModal,
      getRoleIcon, getCurrentRoleDisplayName, setActiveRole,
      confirmRoleSwitch, cancelRoleSwitch, resetRole,
      getMenuCountForRole, isMenuLocked, isMenuSelectedForRole,
      toggleMenuForRole, isCategoryFullySelected, toggleCategorySelection,
      selectAllMenus, deselectAllMenus,
      savePermissions, closeSaveModal, confirmSavePermissions,
      isFirstInCategory, isLastInCategory, moveMenuUp, moveMenuDown, saveSortOrder,
      isCategoryCollapsed, toggleCategoryCollapse, collapseAll, expandAll, allCollapsed,
      navMenusSorted, isFirstNavMenu, isLastNavMenu, moveNavMenuUp, moveNavMenuDown,
    };
  }
};
</script>

<style src="@/assets/css/admin.css" scoped></style>
