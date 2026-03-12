<template>
  <div class="page-container">
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
          <span class="search-icon">🔍</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="메뉴명 또는 경로로 검색..."
            class="search-input"
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
      <div class="table-wrapper">
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
              <td class="col-order">
                <span class="sort-order-badge">{{ menu.sortOrder }}</span>
              </td>
              <td class="col-icon">
                <span class="menu-icon-cell">{{ menu.icon || '📄' }}</span>
              </td>
              <td class="col-name">
                <div class="name-cell">
                  <span class="menu-name-text">{{ menu.name }}</span>
                  <span
                    v-if="menu.navLabel && menu.navLabel !== menu.name"
                    class="nav-label-text"
                  >{{ menu.navLabel }}</span>
                </div>
              </td>
              <td class="col-path">
                <code class="path-code">{{ menu.path }}</code>
              </td>
              <td class="col-category">
                <span :class="['cat-badge', `cat-${menu.category}`]">
                  {{ getCategoryLabel(menu.category) }}
                </span>
              </td>
              <td class="col-status">
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
              <td class="col-roles">
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
              <td class="col-actions">
                <button @click="openEditModal(menu)" class="btn-edit">
                  ✏️ 수정
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 안내 문구 -->
      <div class="info-notice">
        <span class="notice-icon">ℹ️</span>
        <span>메뉴 삭제는 지원하지 않습니다. 메뉴를 숨기려면 <strong>네비게이션 표시</strong>와 <strong>관리자 서브메뉴</strong>를 모두 해제하세요.</span>
      </div>
    </template>

    <!-- 생성/수정 모달 -->
    <Modal v-if="showModal" @close="closeModal" :close-on-backdrop="!saving">
      <template #header>
        <h3>{{ isEditing ? '메뉴 수정' : '새 메뉴 추가' }}</h3>
      </template>
      <template #body>
        <div class="form-grid">
          <!-- 메뉴명 -->
          <div class="form-group">
            <label class="form-label required-label">메뉴명</label>
            <input
              v-model="form.name"
              type="text"
              class="form-input"
              placeholder="예: 대시보드"
              maxlength="100"
            />
          </div>

          <!-- 경로 -->
          <div class="form-group">
            <label class="form-label required-label">경로 (Path)</label>
            <input
              v-model="form.path"
              type="text"
              :class="['form-input', { 'form-input-disabled': isEditing }]"
              :disabled="isEditing"
              placeholder="예: /dashboard"
              maxlength="255"
            />
            <span v-if="isEditing" class="form-hint">
              🔒 경로는 고유 식별자로 수정할 수 없습니다
            </span>
          </div>

          <!-- 아이콘 -->
          <div class="form-group">
            <label class="form-label">아이콘 (이모지)</label>
            <div class="icon-input-wrap">
              <span class="icon-preview">{{ form.icon || '📄' }}</span>
              <input
                v-model="form.icon"
                type="text"
                class="form-input"
                placeholder="예: 📋"
                maxlength="10"
              />
            </div>
          </div>

          <!-- 네비 표시명 -->
          <div class="form-group">
            <label class="form-label">네비게이션 표시명</label>
            <input
              v-model="form.navLabel"
              type="text"
              class="form-input"
              placeholder="비워두면 메뉴명 사용"
              maxlength="100"
            />
          </div>

          <!-- 카테고리 -->
          <div class="form-group">
            <label class="form-label">카테고리</label>
            <select v-model="form.category" class="form-select">
              <option v-for="cat in categories" :key="cat.key" :value="cat.key">
                {{ cat.icon }} {{ cat.label }}
              </option>
            </select>
          </div>

          <!-- 상위 메뉴 (드롭다운 부모) -->
          <div class="form-group">
            <label class="form-label">상위 메뉴 (드롭다운 부모)</label>
            <select v-model="form.parentPath" class="form-select">
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
            <span class="form-hint">상위 메뉴 선택 시 해당 메뉴 hover 드롭다운에 표시됩니다</span>
          </div>

          <!-- 정렬 순서 -->
          <div class="form-group">
            <label class="form-label">정렬 순서</label>
            <input
              v-model.number="form.sortOrder"
              type="number"
              class="form-input"
              min="0"
              max="999"
            />
          </div>

          <!-- 설명 -->
          <div class="form-group form-full">
            <label class="form-label">설명</label>
            <textarea
              v-model="form.description"
              class="form-textarea"
              rows="2"
              placeholder="메뉴에 대한 간략한 설명 (선택사항)"
              maxlength="500"
            ></textarea>
          </div>

          <!-- 기본 접근 권한 -->
          <div class="form-group form-full">
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
          <div class="form-group form-full">
            <label class="form-label">표시 옵션</label>
            <div class="toggle-group">
              <div class="toggle-item">
                <div class="toggle-info">
                  <span class="toggle-name">상단 내비게이션 표시</span>
                  <span class="toggle-desc">로그인 후 상단 Navbar에 메뉴 항목으로 표시</span>
                </div>
                <button
                  type="button"
                  :class="['toggle-switch', { on: form.showInNav }]"
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
                  :class="['toggle-switch', { on: form.isRequired }]"
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
                  :class="['toggle-switch', { on: form.isAdminSubMenu }]"
                  @click="form.isAdminSubMenu = !form.isAdminSubMenu"
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
import axios from '../axios';
import Modal from '../components/Modal.vue';

export default {
  name: 'AdminMenuDefinition',
  components: { Modal },
  setup() {
    const store = useStore();

    const pageLoading = ref(true);
    const saving = ref(false);
    const menus = ref([]);
    const searchQuery = ref('');
    const activeTab = ref('all');
    const showModal = ref(false);
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
      isAdminSubMenu: false,
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
        isAdminSubMenu: menu.adminSubMenu,
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
          isAdminSubMenu: form.value.isAdminSubMenu,
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

    onMounted(loadMenus);

    return {
      pageLoading, saving, menus, searchQuery, activeTab,
      showModal, isEditing, form,
      categories, availableRoles,
      navMenuCount, adminSubMenuCount, requiredMenuCount,
      tabs, filteredMenus,
      parentMenuOptions,
      getCategoryLabel, getMenuName,
      openCreateModal, openEditModal, closeModal, submitForm,
    };
  },
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
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.header-text h1 {
  font-size: 22px;
  font-weight: 700;
  color: var(--accent);
  margin: 0 0 4px;
  letter-spacing: 0.02em;
}

.header-text p {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
}

/* ===== 통계 카드 ===== */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}

.stat-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  border-left: 4px solid var(--card-border);
}

.stat-card.stat-nav      { border-left-color: var(--accent); }
.stat-card.stat-admin    { border-left-color: #a78bfa; }
.stat-card.stat-required { border-left-color: var(--danger-color); }

.stat-num {
  font-size: 26px;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
}

.stat-label {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 500;
}

/* ===== 필터 바 ===== */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 200px;
  max-width: 360px;
}

.search-icon {
  position: absolute;
  left: 10px;
  font-size: 14px;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 8px 32px 8px 32px;
  border: 1px solid var(--input-border);
  border-radius: 8px;
  font-size: 13px;
  color: var(--input-text);
  background: var(--input-bg);
  outline: none;
  transition: border-color 0.15s;
}

.search-input:focus { border-color: var(--accent); }

.search-clear {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 4px;
}

.search-clear:hover {
  color: var(--text-secondary);
  background: var(--subBg400);
}

.filter-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid var(--card-border);
  background: var(--subBg300);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.tab-btn:hover {
  background: var(--subBg400);
  color: var(--text-primary);
}

.tab-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--text-on-accent);
}

.tab-count {
  font-size: 11px;
  background: rgba(0,0,0,0.2);
  border-radius: 10px;
  padding: 1px 6px;
  font-weight: 600;
}

.tab-btn.active .tab-count { background: rgba(0,0,0,0.2); }

/* ===== 테이블 ===== */
.table-wrapper {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.2);
  overflow: hidden;
  margin-bottom: 14px;
}

.menu-table {
  width: 100%;
  border-collapse: collapse;
}

.menu-table thead tr {
  background: var(--subBg300);
  border-bottom: 2px solid var(--card-border);
}

.menu-table th {
  padding: 12px 14px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-align: left;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.menu-row {
  border-bottom: 1px solid var(--card-border);
  transition: background 0.1s;
}

.menu-row:last-child { border-bottom: none; }
.menu-row:hover { background: var(--subBg300); }
.menu-row.row-required { background: rgba(201, 169, 110, 0.05); }
.menu-row.row-required:hover { background: rgba(201, 169, 110, 0.1); }

.menu-table td {
  padding: 12px 14px;
  vertical-align: middle;
}

/* ===== 컬럼 너비 ===== */
.col-order   { width: 56px; }
.col-icon    { width: 52px; }
.col-name    { min-width: 160px; }
.col-path    { min-width: 180px; }
.col-category{ width: 90px; }
.col-status  { min-width: 140px; }
.col-roles   { min-width: 160px; }
.col-actions { width: 80px; text-align: center; }

/* ===== 셀 스타일 ===== */
.sort-order-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: var(--subBg400);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
}

.menu-icon-cell {
  font-size: 20px;
  display: block;
  text-align: center;
}

.name-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.menu-name-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.nav-label-text {
  font-size: 11px;
  color: var(--text-muted);
}

.path-code {
  font-size: 12px;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  background: var(--subBg400);
  color: var(--text-secondary);
  padding: 2px 8px;
  border-radius: 5px;
  white-space: nowrap;
}

/* ===== 카테고리 배지 ===== */
.cat-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 8px;
  white-space: nowrap;
}

.cat-main         { background: var(--accent-dim);              color: var(--accent); }
.cat-work         { background: var(--success-bg);              color: var(--success-color); }
.cat-personal     { background: rgba(219, 109, 161, 0.15);      color: #db6da1; }
.cat-productivity { background: var(--warning-bg);              color: var(--warning-color); }
.cat-finance      { background: rgba(110, 173, 140, 0.15);      color: #6ead8c; }
.cat-admin        { background: rgba(167, 139, 250, 0.15);      color: #a78bfa; }

/* ===== 상태 칩 ===== */
.status-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.chip {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 8px;
  white-space: nowrap;
}

.chip-required { background: var(--danger-bg);   color: var(--danger-color); }
.chip-nav      { background: var(--accent-dim);  color: var(--accent); }
.chip-admin    { background: rgba(167, 139, 250, 0.15); color: #a78bfa; }
.chip-sub      { background: var(--warning-bg);  color: var(--warning-color); }
.chip-hidden   { background: var(--subBg400);    color: var(--text-muted); }

/* ===== 권한 칩 ===== */
.role-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.role-chip {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 8px;
  white-space: nowrap;
}

.role-user    { background: var(--success-bg);             color: var(--success-color); }
.role-premium { background: var(--accent-dim);             color: var(--accent); }
.role-admin   { background: rgba(167, 139, 250, 0.15);     color: #a78bfa; }
.role-none    { background: var(--subBg400);               color: var(--text-muted); }

/* ===== 수정 버튼 ===== */
.btn-edit {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 7px;
  border: 1px solid var(--card-border);
  background: var(--subBg300);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.btn-edit:hover {
  background: var(--accent-dim);
  border-color: rgba(201, 169, 110, 0.3);
  color: var(--accent);
}

/* ===== 빈 상태 ===== */
.empty-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 8px;
  color: var(--text-muted);
  font-size: 14px;
}

.empty-row span { font-size: 32px; }
.empty-row p { margin: 0; }

/* ===== 안내 문구 ===== */
.info-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--accent-dim);
  border: 1px solid rgba(201, 169, 110, 0.25);
  border-radius: 8px;
  font-size: 13px;
  color: var(--accent);
}

.notice-icon { font-size: 15px; flex-shrink: 0; }

/* ===== 버튼 ===== */
.btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.btn-primary {
  background: linear-gradient(135deg, var(--accent), #b8924a);
  color: var(--text-on-accent);
  box-shadow: 0 2px 6px rgba(201, 169, 110, 0.2);
}
.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--accent-light), var(--accent));
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-outline {
  background: var(--subBg400);
  color: var(--text-secondary);
  border-color: var(--card-border);
}
.btn-outline:hover:not(:disabled) {
  background: var(--subBg500);
  color: var(--text-primary);
}
.btn-outline:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-icon { font-size: 16px; line-height: 1; }

/* ===== 로딩 ===== */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px;
  gap: 12px;
  color: var(--text-muted);
  font-size: 14px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--subBg400);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ===== 폼 ===== */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-full { grid-column: 1 / -1; }

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.required-label::after {
  content: ' *';
  color: var(--danger-color);
}

.form-input,
.form-select,
.form-textarea {
  padding: 8px 12px;
  border: 1px solid var(--input-border);
  border-radius: 8px;
  font-size: 13px;
  color: var(--input-text);
  outline: none;
  transition: border-color 0.15s;
  background: var(--input-bg);
  width: 100%;
  box-sizing: border-box;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--input-focus-shadow);
}

.form-input-disabled {
  background: var(--subBg300);
  color: var(--text-muted);
  cursor: not-allowed;
  opacity: 0.7;
}

.form-textarea { resize: vertical; min-height: 60px; }

.form-hint {
  font-size: 11px;
  color: var(--text-muted);
}

.form-hint-inline {
  font-size: 11px;
  color: var(--text-muted);
  margin: 0 0 4px;
}

/* ===== 아이콘 입력 ===== */
.icon-input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-preview {
  font-size: 24px;
  width: 36px;
  text-align: center;
  flex-shrink: 0;
}

.icon-input-wrap .form-input { flex: 1; }

/* ===== 체크박스 그룹 ===== */
.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  user-select: none;
}

.checkbox-label input[type="checkbox"] {
  width: 15px;
  height: 15px;
  accent-color: var(--accent);
  cursor: pointer;
  flex-shrink: 0;
}

.checkbox-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 8px;
}

.checkbox-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

/* ===== 토글 그룹 ===== */
.toggle-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  background: var(--subBg300);
  border: 1px solid var(--card-border);
  border-radius: 10px;
}

.toggle-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.toggle-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toggle-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.toggle-desc {
  font-size: 11px;
  color: var(--text-muted);
}

.toggle-switch {
  position: relative;
  width: 42px;
  height: 24px;
  background: var(--subBg500);
  border-radius: 12px;
  cursor: pointer;
  border: none;
  transition: background 0.2s;
  flex-shrink: 0;
}

.toggle-switch.on { background: var(--accent); }

.toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  background: var(--text-muted);
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.4);
}

.toggle-switch.on .toggle-thumb {
  transform: translateX(18px);
  background: var(--text-on-accent);
}

/* ===== 반응형 ===== */
@media (max-width: 1100px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 900px) {
  .menu-table .col-category,
  .menu-table .col-roles { display: none; }
}

@media (max-width: 700px) {
  .page-container { padding: 16px; }
  .stats-row { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .filter-bar { flex-direction: column; align-items: stretch; }
  .search-box { max-width: none; }
  .form-grid { grid-template-columns: 1fr; }
  .form-full { grid-column: 1; }
  .menu-table .col-status { display: none; }
}
</style>
