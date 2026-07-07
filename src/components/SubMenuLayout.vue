<template>
  <div class="subnav-layout">
    <!-- 모바일 오버레이 -->
    <transition name="fade">
      <div
        v-if="sidebarOpen"
        class="sidebar-overlay"
        @click="closeSidebar"
      />
    </transition>

    <!-- 사이드바 -->
    <aside :class="['subnav-sidebar', { open: sidebarOpen }]">
      <div class="sidebar-header">
        <div class="sidebar-brand">
          <span class="brand-icon">{{ section.icon }}</span>
          <span class="brand-text">{{ section.name }}</span>
        </div>
        <button
          class="sidebar-close-btn"
          @click="closeSidebar"
          aria-label="메뉴 닫기"
        >
          ✕
        </button>
      </div>

      <nav class="sidebar-nav">
        <p class="nav-section-label">
          메뉴
        </p>
        <!-- 부모 메뉴 (최상단) -->
        <router-link
          :to="section.path"
          class="sidebar-link"
          :class="{ active: $route.path === section.path }"
          @click="closeSidebar"
        >
          <span class="link-icon">{{ section.icon || '📄' }}</span>
          <span class="link-text">{{ section.name }}</span>
        </router-link>
        <!-- 자식 메뉴들 -->
        <router-link
          v-for="child in section.children"
          :key="child.path"
          :to="child.path"
          class="sidebar-link sidebar-link-child"
          :class="{ active: $route.path === child.path }"
          @click="closeSidebar"
        >
          <span class="link-icon">{{ child.icon || '📄' }}</span>
          <span class="link-text">{{ child.name }}</span>
        </router-link>
      </nav>
    </aside>

    <!-- 메인 콘텐츠 영역 -->
    <div class="subnav-content-area">
      <!-- 모바일 전용 미니바 -->
      <div class="subnav-mobile-bar">
        <button
          class="mobile-hamburger"
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
      <main class="subnav-page-content">
        <slot />
      </main>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';

export default {
  name: 'SubMenuLayout',
  props: {
    section: {
      type: Object,
      required: true,
      // { path, name, icon, navLabel, children: [{ path, name, icon, navLabel }] }
    },
  },
  setup(props) {
    const route = useRoute();
    const sidebarOpen = ref(false);

    const toggleSidebar = () => {
      sidebarOpen.value = !sidebarOpen.value;
    };

    const closeSidebar = () => {
      sidebarOpen.value = false;
    };

    // 현재 페이지 타이틀 (자식 중 현재 경로 매칭 → 부모 이름 폴백)
    const pageTitle = computed(() => {
      const child = props.section.children?.find(c => c.path === route.path);
      if (child) return child.name;
      if (props.section.path === route.path) return props.section.name;
      return props.section.name;
    });

    const handleResize = () => {
      if (window.innerWidth > 800) sidebarOpen.value = false;
    };

    onMounted(() => window.addEventListener('resize', handleResize));
    onUnmounted(() => window.removeEventListener('resize', handleResize));

    return { sidebarOpen, pageTitle, toggleSidebar, closeSidebar };
  },
};
</script>

<style src="@/assets/css/layout.css" scoped></style>
