<template>
  <div class="admin-layout">
    <!-- 모바일 오버레이 -->
    <transition name="fade">
      <div
        v-if="sidebarOpen"
        class="sidebar-overlay"
        @click="closeSidebar"
      />
    </transition>

    <!-- 사이드바 -->
    <aside
      id="admin-sidebar"
      ref="sidebarElement"
      :role="sidebarOpen ? 'dialog' : undefined"
      :aria-modal="sidebarOpen ? 'true' : undefined"
      aria-label="관리자 메뉴"
      :class="['admin-sidebar', 'thin-scrollbar', { open: sidebarOpen }]"
      data-lenis-prevent
    >
      <div class="sidebar-header">
        <div class="sidebar-brand">
          <span class="brand-icon">⚙️</span>
          <span class="brand-text">Admin</span>
        </div>
        <button
          type="button"
          class="sidebar-close-btn"
          @click="closeSidebar"
          aria-label="메뉴 닫기"
        >
          ✕
        </button>
      </div>

      <div class="sidebar-user-info">
        <div class="user-avatar">
          {{ userInitial }}
        </div>
        <div class="user-meta">
          <span class="user-name">{{ user?.username }}</span>
          <span class="user-role-badge">관리자</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <p class="nav-section-label">
          메뉴
        </p>
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
          to="/admin/prompt-management"
          class="sidebar-link"
          :class="{ active: $route.path === '/admin/prompt-management' }"
          @click="closeSidebar"
        >
          <span class="link-icon">🤖</span>
          <span class="link-text">프롬프트 관리</span>
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

        <p class="nav-section-label">
          포트폴리오
        </p>
        <router-link
          to="/admin/career"
          class="sidebar-link"
          :class="{ active: $route.path === '/admin/career' }"
          @click="closeSidebar"
        >
          <span class="link-icon">💼</span>
          <span class="link-text">경력 관리</span>
        </router-link>
        <router-link
          to="/admin/experience"
          class="sidebar-link"
          :class="{ active: $route.path === '/admin/experience' }"
          @click="closeSidebar"
        >
          <span class="link-icon">🎓</span>
          <span class="link-text">교육·경험 관리</span>
        </router-link>
        <router-link
          to="/admin/portfolio-skill"
          class="sidebar-link"
          :class="{ active: $route.path === '/admin/portfolio-skill' }"
          @click="closeSidebar"
        >
          <span class="link-icon">🛠️</span>
          <span class="link-text">포트폴리오 스킬</span>
        </router-link>
      </nav>
    </aside>

    <!-- 메인 콘텐츠 영역 -->
    <div class="admin-content-area">
      <!-- 모바일 전용 미니바 (햄버거 + 현재 페이지명) -->
      <div class="admin-mobile-bar">
        <button
          ref="sidebarTrigger"
          type="button"
          class="mobile-hamburger"
          :aria-expanded="sidebarOpen"
          aria-controls="admin-sidebar"
          @click="toggleSidebar"
          aria-label="메뉴 열기"
        >
          <span />
          <span />
          <span />
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
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';
import { useRoute } from 'vue-router';

export default {
  name: 'AdminLayout',
  setup() {
    const store = useStore();
    const route = useRoute();
    const sidebarOpen = ref(false);
    const sidebarElement = ref(null);
    const sidebarTrigger = ref(null);

    const user = computed(() => store.getters['auth/user']);
    const userInitial = computed(() => user.value?.username?.charAt(0)?.toUpperCase() || 'A');

    const pageTitleMap = {
      '/admin': '관리자',
      '/admin/users': '사용자 관리',
      '/admin/menu-management': '권한별 접근메뉴관리',
      '/admin/role-management': '권한 관리',
      '/admin/menu-definition': '메뉴 정의 관리',
      '/admin/prompt-management': '프롬프트 관리',
      '/admin/chat-history': '채팅 히스토리',
      '/admin/career': '경력 관리',
      '/admin/experience': '교육·경험 관리',
      '/admin/portfolio-skill': '포트폴리오 스킬',
    };
    const pageTitle = computed(() => pageTitleMap[route.path] || '관리자');

    const toggleSidebar = () => {
      sidebarOpen.value = !sidebarOpen.value;
      if (sidebarOpen.value) {
        nextTick(() => sidebarElement.value?.querySelector('button, a')?.focus());
      }
    };

    const closeSidebar = () => {
      const wasOpen = sidebarOpen.value;
      sidebarOpen.value = false;
      if (wasOpen) nextTick(() => sidebarTrigger.value?.focus());
    };

    const handleKeydown = (event) => {
      if (!sidebarOpen.value) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSidebar();
      } else if (event.key === 'Tab') {
        const items = sidebarElement.value?.querySelectorAll('a[href], button:not([disabled])');
        if (!items?.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (!sidebarElement.value.contains(document.activeElement)) {
          event.preventDefault();
          first.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    // 데스크탑 너비로 변경 시 오버레이 자동 닫기
    const handleResize = () => {
      if (window.innerWidth > 800) {
        sidebarOpen.value = false;
      }
    };

    onMounted(() => {
      window.addEventListener('resize', handleResize);
      document.addEventListener('keydown', handleKeydown);
    });
    onUnmounted(() => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('keydown', handleKeydown);
    });

    return {
      sidebarOpen, sidebarElement, sidebarTrigger,
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
