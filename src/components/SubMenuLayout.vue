<template>
  <div class="subnav-layout">
    <!-- 모바일 오버레이 -->
    <transition name="fade">
      <div
        v-if="sidebarOpen"
        class="sidebar-overlay"
        @click="closeSidebar"
      ></div>
    </transition>

    <!-- 사이드바 -->
    <aside :class="['subnav-sidebar', { open: sidebarOpen }]">
      <div class="sidebar-header">
        <div class="sidebar-brand">
          <span class="brand-icon">{{ section.icon }}</span>
          <span class="brand-text">{{ section.name }}</span>
        </div>
        <button class="sidebar-close-btn" @click="closeSidebar" aria-label="메뉴 닫기">✕</button>
      </div>

      <nav class="sidebar-nav">
        <p class="nav-section-label">메뉴</p>
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
        <button class="mobile-hamburger" @click="toggleSidebar" aria-label="메뉴 열기">
          <span></span>
          <span></span>
          <span></span>
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

<style scoped>
/* ===== 레이아웃 기본 ===== */
.subnav-layout {
  display: flex;
  min-height: calc(100vh - 68px);
  background: var(--content-bg);
}

/* ===== 사이드바 ===== */
.subnav-sidebar {
  width: 220px;
  min-width: 220px;
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
  padding: 18px 16px;
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
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.12em;
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

/* 자식 링크 들여쓰기 */
.sidebar-link-child {
  padding-left: 20px;
  font-size: 12px;
  color: rgba(240, 236, 228, 0.4);
}

.sidebar-link-child::before {
  content: '└';
  font-size: 10px;
  color: var(--sidebar-section-label);
  flex-shrink: 0;
  margin-right: -4px;
}

.sidebar-link-child:hover {
  color: var(--text-secondary);
}

.sidebar-link-child.active {
  background: var(--sidebar-active-bg);
  color: var(--sidebar-active-color);
  border-color: var(--card-border);
}

/* ===== 콘텐츠 영역 ===== */
.subnav-content-area {
  flex: 1;
  margin-left: 220px;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* ===== 모바일 미니바 (기본 숨김) ===== */
.subnav-mobile-bar {
  display: none;
}

.subnav-page-content {
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
  .subnav-sidebar {
    width: 190px;
    min-width: 190px;
  }

  .subnav-content-area {
    margin-left: 190px;
  }
}

/* ===== 모바일 (800px 이하) ===== */
@media (max-width: 800px) {
  .subnav-sidebar {
    top: 68px;
    height: calc(100vh - 68px);
    transform: translateX(-100%);
    width: 260px;
    min-width: 260px;
  }

  .subnav-sidebar.open {
    transform: translateX(0);
  }

  .sidebar-close-btn {
    display: block;
  }

  .subnav-content-area {
    margin-left: 0;
  }

  .subnav-mobile-bar {
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

  .subnav-page-content {
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
