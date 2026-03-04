<template>
  <div class="admin-layout">
    <!-- 모바일 오버레이 -->
    <transition name="fade">
      <div
        v-if="sidebarOpen"
        class="sidebar-overlay"
        @click="closeSidebar"
      ></div>
    </transition>

    <!-- 사이드바 -->
    <aside :class="['admin-sidebar', { open: sidebarOpen }]">
      <div class="sidebar-header">
        <div class="sidebar-brand">
          <span class="brand-icon">⚙️</span>
          <span class="brand-text">Admin</span>
        </div>
        <button class="sidebar-close-btn" @click="closeSidebar" aria-label="메뉴 닫기">✕</button>
      </div>

      <div class="sidebar-user-info">
        <div class="user-avatar">{{ userInitial }}</div>
        <div class="user-meta">
          <span class="user-name">{{ user?.username }}</span>
          <span class="user-role-badge">관리자</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <p class="nav-section-label">메뉴</p>
        <router-link
          to="/admin/users"
          class="sidebar-link"
          :class="{ active: $route.path === '/admin/users' }"
          @click="closeSidebar"
        >
          <span class="link-icon">👥</span>
          <span class="link-text">사용자 관리</span>
        </router-link>
        <router-link
          to="/admin/menu-management"
          class="sidebar-link"
          :class="{ active: $route.path === '/admin/menu-management' }"
          @click="closeSidebar"
        >
          <span class="link-icon">🔐</span>
          <span class="link-text">권한별 접근메뉴관리</span>
        </router-link>
        <router-link
          to="/admin/role-management"
          class="sidebar-link"
          :class="{ active: $route.path === '/admin/role-management' }"
          @click="closeSidebar"
        >
          <span class="link-icon">🛡️</span>
          <span class="link-text">권한 관리</span>
        </router-link>
        <router-link
          to="/admin/menu-definition"
          class="sidebar-link"
          :class="{ active: $route.path === '/admin/menu-definition' }"
          @click="closeSidebar"
        >
          <span class="link-icon">📋</span>
          <span class="link-text">메뉴 관리</span>
        </router-link>
      </nav>
    </aside>

    <!-- 메인 콘텐츠 영역 -->
    <div class="admin-content-area">
      <!-- 모바일 전용 미니바 (햄버거 + 현재 페이지명) -->
      <div class="admin-mobile-bar">
        <button class="mobile-hamburger" @click="toggleSidebar" aria-label="메뉴 열기">
          <span></span>
          <span></span>
          <span></span>
        </button>
        <span class="mobile-page-title">{{ pageTitle }}</span>
      </div>

      <!-- 페이지 콘텐츠 -->
      <main class="admin-page-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';
import { useRoute } from 'vue-router';

export default {
  name: 'AdminLayout',
  setup() {
    const store = useStore();
    const route = useRoute();
    const sidebarOpen = ref(false);

    const user = computed(() => store.getters['auth/user']);
    const userInitial = computed(() => user.value?.username?.charAt(0)?.toUpperCase() || 'A');

    const pageTitleMap = {
      '/admin': '관리자',
      '/admin/users': '사용자 관리',
      '/admin/menu-management': '권한별 접근메뉴관리',
      '/admin/role-management': '권한 관리',
      '/admin/menu-definition': '메뉴 정의 관리',
    };
    const pageTitle = computed(() => pageTitleMap[route.path] || '관리자');

    const toggleSidebar = () => {
      sidebarOpen.value = !sidebarOpen.value;
    };

    const closeSidebar = () => {
      sidebarOpen.value = false;
    };

    // 데스크탑 너비로 변경 시 오버레이 자동 닫기
    const handleResize = () => {
      if (window.innerWidth > 800) {
        sidebarOpen.value = false;
      }
    };

    onMounted(() => window.addEventListener('resize', handleResize));
    onUnmounted(() => window.removeEventListener('resize', handleResize));

    return {
      sidebarOpen,
      user,
      userInitial,
      pageTitle,
      toggleSidebar,
      closeSidebar,
    };
  }
};
</script>

<style scoped>
/* ===== 레이아웃 기본 ===== */
.admin-layout {
  display: flex;
  min-height: calc(100vh - 68px);
  background: #f1f5f9;
}

/* ===== 사이드바 ===== */
.admin-sidebar {
  width: 240px;
  min-width: 240px;
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 68px; /* Navbar 높이 */
  left: 0;
  height: calc(100vh - 68px);
  z-index: 1001;
  transition: transform 0.3s ease;
  overflow-y: auto;
}

/* ===== 사이드바 헤더 ===== */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-icon {
  font-size: 20px;
}

.brand-text {
  color: white;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 1px;
}

.sidebar-close-btn {
  display: none;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
  line-height: 1;
}

.sidebar-close-btn:hover {
  color: white;
  background: rgba(255, 255, 255, 0.1);
}

/* ===== 사용자 정보 ===== */
.sidebar-user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  margin: 12px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  flex-shrink: 0;
}

.user-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  font-weight: 700;
  flex-shrink: 0;
}

.user-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.user-name {
  color: white;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role-badge {
  background: #3b82f6;
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 10px;
  display: inline-block;
  width: fit-content;
}

/* ===== 사이드바 네비게이션 ===== */
.sidebar-nav {
  flex: 1;
  padding: 8px 12px;
}

.nav-section-label {
  color: rgba(255, 255, 255, 0.35);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 8px 4px 6px;
  margin: 0;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.65);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  margin-bottom: 2px;
}

.sidebar-link:hover {
  background: rgba(255, 255, 255, 0.08);
  color: white;
}

.sidebar-link.active {
  background: #3b82f6;
  color: white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
}

.link-icon {
  font-size: 17px;
  flex-shrink: 0;
  width: 22px;
  text-align: center;
}

.link-text {
  flex: 1;
}

/* ===== 콘텐츠 영역 ===== */
.admin-content-area {
  flex: 1;
  margin-left: 240px;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* ===== 모바일 전용 미니바 ===== */
.admin-mobile-bar {
  display: none;
}

/* ===== 페이지 콘텐츠 ===== */
.admin-page-content {
  flex: 1;
  overflow-x: hidden;
}

/* ===== 오버레이 ===== */
.sidebar-overlay {
  position: fixed;
  top: 68px;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 1000;
  backdrop-filter: blur(2px);
}

/* ===== 트랜지션 ===== */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ===== 태블릿 (1024px 이하) ===== */
@media (max-width: 1024px) and (min-width: 801px) {
  .admin-sidebar {
    width: 200px;
    min-width: 200px;
  }

  .admin-content-area {
    margin-left: 200px;
  }
}

/* ===== 모바일 (800px 이하, Navbar와 동일한 브레이크포인트) ===== */
@media (max-width: 800px) {
  .admin-layout {
    min-height: calc(100vh - 68px);
  }

  /* 사이드바 오프스크린 */
  .admin-sidebar {
    top: 68px; /* 모바일 Navbar 높이 */
    height: calc(100vh - 68px);
    transform: translateX(-100%);
    width: 260px;
    min-width: 260px;
  }

  .admin-sidebar.open {
    transform: translateX(0);
  }

  /* 모바일에서 닫기 버튼 표시 */
  .sidebar-close-btn {
    display: block;
  }

  /* 콘텐츠 전체 너비 */
  .admin-content-area {
    margin-left: 0;
  }

  /* 모바일 미니바 표시 */
  .admin-mobile-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    background: white;
    padding: 10px 16px;
    border-bottom: 1px solid #e2e8f0;
    position: fixed;
    top: 68px;
    left: 0;
    right: 0;
    z-index: 100;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }

  /* fixed 미니바 높이만큼 콘텐츠 여백 보정 */
  .admin-page-content {
    padding-top: 49px;
  }

  .mobile-hamburger {
    display: flex;
    flex-direction: column;
    gap: 5px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 6px;
    border-radius: 6px;
    flex-shrink: 0;
    transition: background 0.2s ease;
  }

  .mobile-hamburger:hover {
    background: #f1f5f9;
  }

  .mobile-hamburger span {
    display: block;
    width: 20px;
    height: 2px;
    background: #475569;
    border-radius: 2px;
  }

  .mobile-page-title {
    font-size: 15px;
    font-weight: 700;
    color: #1e293b;
  }
}
</style>
