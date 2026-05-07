<template>
  <div class="menu-def-page">
    <!-- 헤더 -->
    <div class="page-header">
      <div class="header-text">
        <h1>메뉴 정의 관리</h1>
        <p>시스템에 등록된 전체 메뉴를 조회하고 설정을 관리합니다</p>
      </div>
      <button @click="openCreateModal" class="btn btn-primary">
        <span class="btn-icon">＋</span>
        새 메뉴 추가
      </button>
    </div>

    <!-- 로딩 -->
    <div v-if="pageLoading" class="loading-state">
      <div class="spinner"></div>
      <p>데이터를 불러오는 중...</p>
    </div>

    <template v-else>
      <!-- 통계 카드 -->
      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-num">{{ menus.length }}</span>
          <span class="stat-label">전체 메뉴</span>
        </div>
        <div class="stat-card stat-nav">
          <span class="stat-num">{{ navMenuCount }}</span>
          <span class="stat-label">내비게이션</span>
        </div>
        <div class="stat-card stat-admin">
          <span class="stat-num">{{ adminSubMenuCount }}</span>
          <span class="stat-label">관리자 서브</span>
        </div>
        <div class="stat-card stat-required">
          <span class="stat-num">{{ requiredMenuCount }}</span>
          <span class="stat-label">필수 메뉴</span>
        </div>
      </div>

      <!-- 필터/검색 바 -->
      <div class="filter-bar">
        <div class="search-box">
          <span class="search-icon-inner">🔍</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="메뉴명 또는 경로로 검색..."
            class="search-input-def"
          />
          <button v-if="searchQuery" @click="searchQuery = ''" class="search-clear">✕</button>
        </div>
        <div class="filter-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            :class="['tab-btn', { active: activeTab === tab.key }]"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
            <span class="tab-count">{{ tab.count }}</span>
          </button>
        </div>
      </div>

      <!-- 메뉴 테이블 -->
      <div class="table-wrapper-def">
        <table class="menu-table">
          <thead>
            <tr>
              <th class="col-order">순서</th>
              <th class="col-icon">아이콘</th>
              <th class="col-name">메뉴명 / 네비 표시명</th>
              <th class="col-path">경로</th>
              <th class="col-category">카테고리</th>
              <th class="col-status">표시 유형</th>
              <th class="col-roles">기본 권한</th>
              <th class="col-actions">관리</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredMenus.length === 0" class="empty-row-tr">
              <td colspan="8">
                <div class="empty-row">
                  <span>📭</span>
                  <p>조건에 맞는 메뉴가 없습니다</p>
                </div>
              </td>
            </tr>
            <tr
              v-for="menu in filteredMenus"
              :key="menu.id"
              class="menu-row"
              :class="{ 'row-required': menu.required }"
            >
              <td class="col-order" data-label="순서">
                <span class="sort-order-badge">{{ menu.sortOrder }}</span>
              </td>
              <td class="col-icon" data-label="아이콘">
                <span class="menu-icon-cell">{{ menu.icon || '📄' }}</span>
              </td>
              <td class="col-name" data-label="메뉴명">
                <div class="name-cell">
                  <span class="menu-name-text">{{ menu.name }}</span>
                  <span
                    v-if="menu.navLabel && menu.navLabel !== menu.name"
                    class="nav-label-text"
                  >{{ menu.navLabel }}</span>
                </div>
              </td>
              <td class="col-path" data-label="경로">
                <code class="path-code">{{ menu.path }}</code>
              </td>
              <td class="col-category" data-label="카테고리">
                <span :class="['cat-badge', `cat-${menu.category}`]">
                  {{ getCategoryLabel(menu.category) }}
                </span>
              </td>
              <td class="col-status" data-label="표시 유형">
                <div class="status-chips">
                  <span v-if="menu.required" class="chip chip-required">필수</span>
                  <span v-if="menu.showInNav" class="chip chip-nav">상단 네비</span>
                  <span v-if="menu.adminSubMenu" class="chip chip-admin">관리자 서브</span>
                  <span v-if="menu.parentPath" class="chip chip-sub">
                    ↳ {{ getMenuName(menu.parentPath) }}
                  </span>
                  <span
                    v-if="!menu.required && !menu.showInNav && !menu.adminSubMenu && !menu.parentPath"
                    class="chip chip-hidden"
                  >숨김</span>
                </div>
              </td>
              <td class="col-roles" data-label="기본 권한">
                <div class="role-chips">
                  <span
                    v-for="role in menu.defaultRoles"
                    :key="role"
                    :class="['role-chip', `role-${role.toLowerCase()}`]"
                  >{{ role }}</span>
                  <span
                    v-if="!menu.defaultRoles || menu.defaultRoles.length === 0"
                    class="role-chip role-none"
                  >없음</span>
                </div>
              </td>
              <td class="col-actions" data-label="관리">
                <div class="actions-cell">
                  <button @click="openEditModal(menu)" class="btn-edit-def">
                    ✏️ 수정
                  </button>
                  <span v-if="menu.required" class="protected-badge">🔒 보호됨</span>
                  <button v-else @click="openDeleteModal(menu)" class="btn-delete-def">
                    🗑️ 삭제
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 안내 문구 -->
      <div class="info-notice">
        <span class="notice-icon">ℹ️</span>
        <span><strong>🔒 보호됨</strong> 표시 메뉴는 시스템 필수 메뉴로 삭제할 수 없습니다. 메뉴를 숨기려면 <strong>네비게이션 표시</strong>와 <strong>관리자 서브메뉴</strong>를 모두 해제하세요.</span>
      </div>
    </template>

    <!-- 삭제 확인 모달 -->
    <Modal v-if="showDeleteModal" @close="closeDeleteModal" :close-on-backdrop="!deleting">
      <template #header>
        <h3>⚠️ 메뉴 삭제 확인</h3>
      </template>
      <template #body>
        <div class="delete-warning-def">
          <div class="delete-menu-info">
            <span class="delete-menu-icon">{{ deletingMenu?.icon || '📄' }}</span>
            <div>
              <p class="delete-menu-name">{{ deletingMenu?.name }}</p>
              <code class="path-code">{{ deletingMenu?.path }}</code>
            </div>
          </div>
          <div class="delete-impact-box">
            <p class="delete-impact-title">삭제 시 함께 제거되는 항목:</p>
            <ul class="delete-impact-list">
              <li>권한별 접근 설정 (메뉴 권한)</li>
              <li>CRUD 권한 설정 (읽기/쓰기/수정/삭제 권한)</li>
            </ul>
            <p class="delete-irreversible">이 작업은 되돌릴 수 없습니다.</p>
          </div>
        </div>
      </template>
      <template #footer>
        <button @click="closeDeleteModal" class="btn btn-outline" :disabled="deleting">취소</button>
        <button @click="deleteMenu" class="btn btn-danger" :disabled="deleting">
          {{ deleting ? '삭제 중...' : '삭제하기' }}
        </button>
      </template>
    </Modal>

    <!-- 생성/수정 모달 -->
    <Modal v-if="showModal" @close="closeModal" :close-on-backdrop="!saving">
      <template #header>
        <h3>{{ isEditing ? '메뉴 수정' : '새 메뉴 추가' }}</h3>
      </template>
      <template #body>
        <div class="form-grid">
          <!-- 메뉴명 -->
          <div class="form-group-def">
            <label class="form-label required-label">메뉴명</label>
            <input
              v-model="form.name"
              type="text"
              class="form-input-def"
              placeholder="예: 대시보드"
              maxlength="100"
            />
          </div>

          <!-- 경로 -->
          <div class="form-group-def">
            <label class="form-label required-label">경로 (Path)</label>
            <input
              v-model="form.path"
              type="text"
              :class="['form-input-def', { 'form-input-disabled': isEditing }]"
              :disabled="isEditing"
              placeholder="예: /dashboard"
              maxlength="255"
            />
            <span v-if="isEditing" class="form-hint-def">
              🔒 경로는 고유 식별자로 수정할 수 없습니다
            </span>
          </div>

          <!-- 아이콘 -->
          <div class="form-group-def">
            <label class="form-label">아이콘 (이모지)</label>
            <div class="icon-input-wrap">
              <span class="icon-preview">{{ form.icon || '📄' }}</span>
              <input
                v-model="form.icon"
                type="text"
                class="form-input-def"
                placeholder="예: 📋"
                maxlength="10"
              />
            </div>
          </div>

          <!-- 네비 표시명 -->
          <div class="form-group-def">
            <label class="form-label">네비게이션 표시명</label>
            <input
              v-model="form.navLabel"
              type="text"
              class="form-input-def"
              placeholder="비워두면 메뉴명 사용"
              maxlength="100"
            />
          </div>

          <!-- 카테고리 -->
          <div class="form-group-def">
            <label class="form-label">카테고리</label>
            <select v-model="form.category" class="form-select-def">
              <option v-for="cat in categories" :key="cat.key" :value="cat.key">
                {{ cat.icon }} {{ cat.label }}
              </option>
            </select>
          </div>

          <!-- 상위 메뉴 (드롭다운 부모) -->
          <div class="form-group-def">
            <label class="form-label">상위 메뉴 (드롭다운 부모)</label>
            <select v-model="form.parentPath" class="form-select-def">
              <option value="">없음 (최상위 독립 메뉴)</option>
              <option
                v-for="parent in parentMenuOptions"
                :key="parent.path"
                :value="parent.path"
                :disabled="isEditing && parent.path === form.path"
              >
                {{ parent.icon || '📄' }} {{ parent.name }} ({{ parent.path }})
              </option>
            </select>
            <span class="form-hint-def">상위 메뉴 선택 시 해당 메뉴 hover 드롭다운에 표시됩니다</span>
          </div>

          <!-- 정렬 순서 -->
          <div class="form-group-def">
            <label class="form-label">정렬 순서</label>
            <input
              v-model.number="form.sortOrder"
              type="number"
              class="form-input-def"
              min="0"
              max="999"
            />
          </div>

          <!-- 설명 -->
          <div class="form-group-def form-full">
            <label class="form-label">설명</label>
            <textarea
              v-model="form.description"
              class="form-textarea-def"
              rows="2"
              placeholder="메뉴에 대한 간략한 설명 (선택사항)"
              maxlength="500"
            ></textarea>
          </div>

          <!-- 기본 접근 권한 -->
          <div class="form-group-def form-full">
            <label class="form-label">기본 접근 권한</label>
            <p class="form-hint-inline">신규 사용자 권한 할당 시 기본으로 포함될 권한을 선택하세요</p>
            <div class="checkbox-group">
              <label v-for="role in availableRoles" :key="role.key" class="checkbox-label">
                <input type="checkbox" :value="role.key" v-model="form.defaultRoles" />
                <span :class="['checkbox-badge', `role-${role.key.toLowerCase()}`]">{{ role.key }}</span>
                <span class="checkbox-desc">{{ role.desc }}</span>
              </label>
            </div>
          </div>

          <!-- 표시 옵션 토글 -->
          <div class="form-group-def form-full">
            <label class="form-label">표시 옵션</label>
            <div class="toggle-group">
              <div class="toggle-item">
                <div class="toggle-info">
                  <span class="toggle-name">상단 내비게이션 표시</span>
                  <span class="toggle-desc">로그인 후 상단 Navbar에 메뉴 항목으로 표시</span>
                </div>
                <button
                  type="button"
                  :class="['toggle-switch-def', { on: form.showInNav }]"
                  @click="form.showInNav = !form.showInNav"
                >
                  <div class="toggle-thumb"></div>
                </button>
              </div>

              <div class="toggle-item">
                <div class="toggle-info">
                  <span class="toggle-name">필수 메뉴</span>
                  <span class="toggle-desc">모든 사용자에게 강제 허용 (권한별 접근 해제 불가)</span>
                </div>
                <button
                  type="button"
                  :class="['toggle-switch-def', { on: form.isRequired }]"
                  @click="form.isRequired = !form.isRequired"
                >
                  <div class="toggle-thumb"></div>
                </button>
              </div>

              <div class="toggle-item">
                <div class="toggle-info">
                  <span class="toggle-name">관리자 서브메뉴</span>
                  <span class="toggle-desc">Admin 페이지 좌측 사이드바에 표시되는 메뉴</span>
                </div>
                <button
                  type="button"
                  :class="['toggle-switch-def', { on: form.adminSubMenu }]"
                  @click="form.adminSubMenu = !form.adminSubMenu"
                >
                  <div class="toggle-thumb"></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <button @click="closeModal" class="btn btn-outline" :disabled="saving">취소</button>
        <button @click="submitForm" class="btn btn-primary" :disabled="saving">
          {{ saving ? '저장 중...' : (isEditing ? '수정 완료' : '메뉴 추가') }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import axios from '@/axios';
import Modal from '../components/Modal.vue';

export default {
  name: 'AdminMenuDefinition',
  components: { Modal },
  setup() {
    const store = useStore();

    const pageLoading = ref(true);
    const saving = ref(false);
    const deleting = ref(false);
    const menus = ref([]);
    const searchQuery = ref('');
    const activeTab = ref('all');
    const showModal = ref(false);
    const showDeleteModal = ref(false);
    const deletingMenu = ref(null);
    const isEditing = ref(false);
    const editingId = ref(null);

    const defaultForm = () => ({
      name: '',
      path: '',
      icon: '',
      navLabel: '',
      description: '',
      category: 'main',
      sortOrder: 0,
      isRequired: false,
      showInNav: true,
      adminSubMenu: false,
      defaultRoles: [],
      parentPath: '',
    });

    const form = ref(defaultForm());

    const categories = [
      { key: 'main',         label: '메인',   icon: '🏠' },
      { key: 'work',         label: '업무',   icon: '💼' },
      { key: 'personal',     label: '개인',   icon: '👤' },
      { key: 'productivity', label: '생산성', icon: '📋' },
      { key: 'finance',      label: '재정',   icon: '💰' },
      { key: 'admin',        label: '관리자', icon: '⚙️' },
    ];

    const availableRoles = [
      { key: 'USER',    desc: '일반 사용자' },
      { key: 'PREMIUM', desc: '프리미엄 사용자' },
      { key: 'ADMIN',   desc: '관리자' },
    ];

    const getCategoryLabel = (key) => {
      const cat = categories.find(c => c.key === key);
      return cat ? cat.label : key;
    };

    // 상위 메뉴 옵션: showInNav=true이고 자신이 상위 메뉴가 아닌 것
    const parentMenuOptions = computed(() =>
      menus.value.filter(m => m.showInNav && !m.parentPath)
    );

    // 경로로 메뉴명 조회 (테이블에서 parentPath 표시용)
    const getMenuName = (path) => {
      const m = menus.value.find(m => m.path === path);
      return m ? m.name : path;
    };

    // 통계
    const navMenuCount = computed(() => menus.value.filter(m => m.showInNav).length);
    const adminSubMenuCount = computed(() => menus.value.filter(m => m.adminSubMenu).length);
    const requiredMenuCount = computed(() => menus.value.filter(m => m.required).length);

    // 탭
    const tabs = computed(() => [
      { key: 'all',   label: '전체',        count: menus.value.length },
      { key: 'nav',   label: '상단 네비',   count: navMenuCount.value },
      { key: 'admin', label: '관리자 서브', count: adminSubMenuCount.value },
      { key: 'other', label: '기타',        count: menus.value.filter(m => !m.showInNav && !m.adminSubMenu).length },
    ]);

    // 필터된 메뉴 목록
    const filteredMenus = computed(() => {
      let list = menus.value;

      if (activeTab.value === 'nav') {
        list = list.filter(m => m.showInNav);
      } else if (activeTab.value === 'admin') {
        list = list.filter(m => m.adminSubMenu);
      } else if (activeTab.value === 'other') {
        list = list.filter(m => !m.showInNav && !m.adminSubMenu);
      }

      if (searchQuery.value.trim()) {
        const q = searchQuery.value.trim().toLowerCase();
        list = list.filter(m =>
          m.name.toLowerCase().includes(q) ||
          m.path.toLowerCase().includes(q) ||
          (m.navLabel && m.navLabel.toLowerCase().includes(q))
        );
      }

      return list;
    });

    // 데이터 로드
    const loadMenus = async () => {
      pageLoading.value = true;
      try {
        const res = await axios.get('/api/admin/menus');
        menus.value = res.data || [];
      } catch (e) {
        store.dispatch('toast/showToast', { message: '메뉴 목록 로딩에 실패했습니다.', type: 'error' });
      } finally {
        pageLoading.value = false;
      }
    };

    // 모달 열기 - 생성
    const openCreateModal = () => {
      form.value = defaultForm();
      isEditing.value = false;
      editingId.value = null;
      showModal.value = true;
    };

    // 모달 열기 - 수정
    const openEditModal = (menu) => {
      form.value = {
        name: menu.name,
        path: menu.path,
        icon: menu.icon || '',
        navLabel: menu.navLabel || '',
        description: menu.description || '',
        category: menu.category || 'main',
        sortOrder: menu.sortOrder || 0,
        isRequired: menu.required,
        showInNav: menu.showInNav,
        adminSubMenu: menu.adminSubMenu,
        defaultRoles: [...(menu.defaultRoles || [])],
        parentPath: menu.parentPath || '',
      };
      isEditing.value = true;
      editingId.value = menu.id;
      showModal.value = true;
    };

    // 모달 닫기
    const closeModal = () => {
      if (saving.value) return;
      showModal.value = false;
    };

    // 유효성 검사
    const validateForm = () => {
      if (!form.value.name.trim()) {
        store.dispatch('toast/showToast', { message: '메뉴명을 입력해주세요.', type: 'error' });
        return false;
      }
      if (!isEditing.value && !form.value.path.trim()) {
        store.dispatch('toast/showToast', { message: '경로를 입력해주세요.', type: 'error' });
        return false;
      }
      if (!isEditing.value && !form.value.path.startsWith('/')) {
        store.dispatch('toast/showToast', { message: '경로는 /로 시작해야 합니다.', type: 'error' });
        return false;
      }
      return true;
    };

    // 폼 제출
    const submitForm = async () => {
      if (!validateForm()) return;

      saving.value = true;
      try {
        const payload = {
          name: form.value.name.trim(),
          path: form.value.path.trim(),
          icon: form.value.icon.trim(),
          navLabel: form.value.navLabel.trim() || form.value.name.trim(),
          description: form.value.description.trim(),
          category: form.value.category,
          sortOrder: form.value.sortOrder,
          isRequired: form.value.isRequired,
          showInNav: form.value.showInNav,
          isAdminSubMenu: form.value.adminSubMenu,
          defaultRoles: form.value.defaultRoles.join(','),
          parentPath: form.value.parentPath || null,
        };

        if (isEditing.value) {
          const res = await axios.put(`/api/admin/menus/${editingId.value}`, payload);
          const idx = menus.value.findIndex(m => m.id === editingId.value);
          if (idx !== -1) menus.value[idx] = res.data;
          store.dispatch('toast/showToast', { message: '메뉴가 수정되었습니다.', type: 'success' });
        } else {
          const res = await axios.post('/api/admin/menus', payload);
          menus.value.push(res.data);
          menus.value.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
          store.dispatch('toast/showToast', { message: '메뉴가 추가되었습니다.', type: 'success' });
        }
        showModal.value = false;
        try { await store.dispatch('menu/refreshUserMenus'); } catch (_) { /* ignore */ }
      } catch (e) {
        const msg = e.response?.data || (isEditing.value ? '메뉴 수정에 실패했습니다.' : '메뉴 추가에 실패했습니다.');
        store.dispatch('toast/showToast', { message: String(msg), type: 'error' });
      } finally {
        saving.value = false;
      }
    };

    // 삭제 모달 열기
    const openDeleteModal = (menu) => {
      deletingMenu.value = menu;
      showDeleteModal.value = true;
    };

    // 삭제 모달 닫기
    const closeDeleteModal = () => {
      if (deleting.value) return;
      showDeleteModal.value = false;
      deletingMenu.value = null;
    };

    // 메뉴 삭제 실행
    const deleteMenu = async () => {
      if (!deletingMenu.value) return;
      deleting.value = true;
      try {
        await axios.delete(`/api/admin/menus/${deletingMenu.value.id}`);
        menus.value = menus.value.filter(m => m.id !== deletingMenu.value.id);
        store.dispatch('toast/showToast', { message: `"${deletingMenu.value.name}" 메뉴가 삭제되었습니다.`, type: 'success' });
        showDeleteModal.value = false;
        deletingMenu.value = null;
        try { await store.dispatch('menu/refreshUserMenus'); } catch (_) { /* ignore */ }
      } catch (e) {
        const msg = e.response?.data || '메뉴 삭제에 실패했습니다.';
        store.dispatch('toast/showToast', { message: String(msg), type: 'error' });
      } finally {
        deleting.value = false;
      }
    };

    onMounted(loadMenus);

    return {
      pageLoading, saving, deleting, menus, searchQuery, activeTab,
      showModal, showDeleteModal, deletingMenu, isEditing, form,
      categories, availableRoles,
      navMenuCount, adminSubMenuCount, requiredMenuCount,
      tabs, filteredMenus,
      parentMenuOptions,
      getCategoryLabel, getMenuName,
      openCreateModal, openEditModal, closeModal, submitForm,
      openDeleteModal, closeDeleteModal, deleteMenu,
    };
  },
};
</script>

<style src="@/assets/css/admin.css" scoped></style>
