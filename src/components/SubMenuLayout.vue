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
  background: #f1f5f9;
}

/* ===== 사이드바 ===== */
.subnav-sidebar {
  width: 220px;
  min-width: 220px;
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
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
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.5px;
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

/* 자식 링크 들여쓰기 */
.sidebar-link-child {
  padding-left: 20px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.55);
}

.sidebar-link-child::before {
  content: '└';
  font-size: 11px;
  color: rgba(255, 255, 255, 0.25);
  flex-shrink: 0;
  margin-right: -4px;
}

.sidebar-link-child:hover {
  color: rgba(255, 255, 255, 0.9);
}

.sidebar-link-child.active {
  background: #2563eb;
  color: white;
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

  /* 모바일 미니바 표시 */
  .subnav-mobile-bar {
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
