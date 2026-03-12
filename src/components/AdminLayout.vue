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
  background: var(--content-bg);
}

/* ===== 사이드바 ===== */
.admin-sidebar {
  width: 240px;
  min-width: 240px;
  background: linear-gradient(180deg, var(--sidebar-bg-start) 0%, var(--sidebar-bg-end) 100%);
  border-right: 1px solid var(--sidebar-border);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 68px;
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
  border-bottom: 1px solid var(--sidebar-border);
  flex-shrink: 0;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-icon {
  font-size: 18px;
  filter: grayscale(0.3);
}

.brand-text {
  color: var(--accent);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  font-family: "Playfair Display", serif;
}

.sidebar-close-btn {
  display: none;
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
  line-height: 1;
}

.sidebar-close-btn:hover {
  color: var(--text-primary);
  background: var(--sidebar-link-hover-bg);
}

/* ===== 사용자 정보 ===== */
.sidebar-user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  margin: 12px;
  background: var(--accent-dim);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  flex-shrink: 0;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), #8a6030);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-on-accent);
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
  border: 1px solid var(--accent-glow);
}

.user-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.user-name {
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role-badge {
  background: var(--accent-dim);
  color: var(--accent);
  border: 1px solid var(--card-border);
  font-size: 10px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 10px;
  display: inline-block;
  width: fit-content;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* ===== 사이드바 네비게이션 ===== */
.sidebar-nav {
  flex: 1;
  padding: 8px 12px;
}

.nav-section-label {
  color: var(--sidebar-section-label);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  padding: 10px 4px 6px;
  margin: 0;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  color: var(--sidebar-link-color);
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;
  margin-bottom: 2px;
  border: 1px solid transparent;
}

.sidebar-link:hover {
  background: var(--sidebar-link-hover-bg);
  color: var(--text-primary);
  border-color: var(--card-border);
}

.sidebar-link.active {
  background: var(--sidebar-active-bg);
  color: var(--sidebar-active-color);
  border-color: var(--card-border-strong);
  box-shadow: 0 0 12px rgba(201, 169, 110, 0.15);
}

.link-icon {
  font-size: 16px;
  flex-shrink: 0;
  width: 20px;
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
  background: rgba(0, 0, 0, 0.65);
  z-index: 1000;
  backdrop-filter: blur(3px);
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

/* ===== 모바일 (800px 이하) ===== */
@media (max-width: 800px) {
  .admin-layout {
    min-height: calc(100vh - 68px);
  }

  .admin-sidebar {
    top: 68px;
    height: calc(100vh - 68px);
    transform: translateX(-100%);
    width: 260px;
    min-width: 260px;
  }

  .admin-sidebar.open {
    transform: translateX(0);
  }

  .sidebar-close-btn {
    display: block;
  }

  .admin-content-area {
    margin-left: 0;
  }

  .admin-mobile-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--mobile-bar-bg);
    padding: 10px 16px;
    border-bottom: 1px solid var(--mobile-bar-border);
    position: fixed;
    top: 68px;
    left: 0;
    right: 0;
    z-index: 100;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

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
    background: var(--sidebar-link-hover-bg);
  }

  .mobile-hamburger span {
    display: block;
    width: 20px;
    height: 1px;
    background: var(--accent);
    border-radius: 2px;
  }

  .mobile-page-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: 0.05em;
  }
}
</style>
