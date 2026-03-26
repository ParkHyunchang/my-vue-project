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
        <router-link
          to="/admin/chat-history"
          class="sidebar-link"
          :class="{ active: $route.path === '/admin/chat-history' }"
          @click="closeSidebar"
        >
          <span class="link-icon">💬</span>
          <span class="link-text">채팅 히스토리</span>
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
      '/admin/chat-history': '채팅 히스토리',
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

<style src="@/assets/css/layout.css" scoped></style>
