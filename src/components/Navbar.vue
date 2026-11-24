<template>
  <header
    id="header"
    role="banner"
  >
    <div
      v-if="isOpen"
      class="mobile-menu-backdrop"
      aria-hidden="true"
      @click="closeMenu"
      @touchstart.stop.prevent="closeMenu"
    />
    <div class="header__inner">
      <div class="header__logo">
        <router-link
          to="/"
          aria-label="현창 홈"
        >
          <span
            class="brand-monogram"
            aria-hidden="true"
          >H.</span>
          <span>hyunchang<em>Personal workspace</em></span>
        </router-link>
      </div>
      <div class="header__left">
        <div
          v-if="!isAuthenticated"
          class="auth-buttons"
        >
          <router-link
            to="/login"
            @click="closeMenu"
            class="login-btn"
          >
            로그인
          </router-link>
        </div>
        <!-- 모바일 전용: 아바타 클릭 → 드롭다운 -->
        <div
          v-else
          class="mobile-avatar-wrapper"
        >
          <button
            ref="mobileAccountButton"
            type="button"
            class="mobile-avatar"
            aria-label="내 계정 메뉴"
            :aria-expanded="showUserDropdown"
            aria-controls="mobile-account-menu"
            @click.stop="toggleUserDropdown"
          >
            {{ userInitial }}
          </button>
          <transition name="dropdown-fade">
            <div
              v-if="showUserDropdown"
              id="mobile-account-menu"
              ref="mobileAccountMenu"
              class="mobile-user-dropdown"
              @click.stop
            >
              <div class="dropdown-user-header">
                <div class="dropdown-avatar-lg">
                  {{ userInitial }}
                </div>
                <div class="dropdown-user-meta">
                  <span class="dropdown-username">{{ user.username }}</span>
                  <span class="dropdown-role">{{ user.role }}</span>
                </div>
              </div>
              <div class="dropdown-divider" />
              <router-link
                to="/mypage"
                class="dropdown-menu-item"
                @click="closeMenu"
              >
                내 정보 수정
              </router-link>
              <router-link
                to="/change-password"
                class="dropdown-menu-item"
                @click="closeMenu"
              >
                비밀번호 수정
              </router-link>
              <div class="dropdown-divider" />
              <button
                @click="handleLogout"
                class="dropdown-logout-btn"
              >
                로그아웃
              </button>
            </div>
          </transition>
        </div>
        <button
          ref="menuButton"
          type="button"
          class="header__nav__mobile"
          :aria-label="isOpen ? '메인 메뉴 닫기' : '메인 메뉴 열기'"
          :aria-expanded="isOpen"
          aria-controls="main-navigation"
          @click="toggleMenu"
        >
          <span aria-hidden="true" />
        </button>
      </div>
      <nav
        id="main-navigation"
        ref="mainNavigation"
        :class="['header__nav', { show: isOpen, 'has-more-below': hasMoreBelow }]"
        role="navigation"
        aria-label="메인 메뉴"
      >
        <ul
          ref="menuList"
          data-lenis-prevent
          @scroll.passive="updateScrollHint"
        >
          <li
            v-for="menu in navigationMenus"
            :key="menu.path"
            class="nav-item"
          >
            <router-link
              :to="menu.path"
              @click="closeMenu"
            >
              {{ menu.navLabel }}
            </router-link>
          </li>
          <li
            v-if="isAdmin"
            class="nav-item"
          >
            <router-link
              to="/admin"
              @click="closeMenu"
            >
              관리자
            </router-link>
          </li>
          <li
            v-if="!isAuthenticated"
            class="nav-item mobile-login-item"
          >
            <router-link
              to="/login"
              @click="closeMenu"
            >
              로그인
            </router-link>
          </li>
        </ul>
        <div
          v-if="!isAuthenticated"
          class="desktop-login"
        >
          <router-link
            to="/login"
            @click="closeMenu"
            class="login-btn"
          >
            로그인
          </router-link>
        </div>
        <!-- 데스크탑 전용: 아바타 클릭 → 드롭다운 -->
        <div
          v-else
          class="desktop-avatar-wrapper"
        >
          <button
            ref="desktopAccountButton"
            type="button"
            class="desktop-account-button"
            aria-label="내 계정 메뉴"
            :aria-expanded="showDesktopDropdown"
            aria-controls="desktop-account-menu"
            @click.stop="toggleDesktopDropdown"
          >
            <span class="desktop-avatar">{{ userInitial }}</span>
            <span class="desktop-avatar-name">{{ user.username }}</span>
            <span
              class="account-chevron"
              aria-hidden="true"
            >⌄</span>
          </button>
          <transition name="dropdown-fade">
            <div
              v-if="showDesktopDropdown"
              id="desktop-account-menu"
              ref="desktopAccountMenu"
              class="desktop-user-dropdown"
              @click.stop
            >
              <div class="dropdown-user-header">
                <div class="dropdown-avatar-lg">
                  {{ userInitial }}
                </div>
                <div class="dropdown-user-meta">
                  <span class="dropdown-username">{{ user.username }}</span>
                  <span class="dropdown-role">{{ user.role }}</span>
                </div>
              </div>
              <div class="dropdown-divider" />
              <router-link
                to="/mypage"
                class="dropdown-menu-item"
                @click="closeMenu"
              >
                내 정보 수정
              </router-link>
              <router-link
                to="/change-password"
                class="dropdown-menu-item"
                @click="closeMenu"
              >
                비밀번호 수정
              </router-link>
              <div class="dropdown-divider" />
              <button
                @click="handleLogout"
                class="dropdown-logout-btn"
              >
                로그아웃
              </button>
            </div>
          </transition>
        </div>
      </nav>
    </div>
  </header>
</template>

<script>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { lenis } from '@/assets/js/smooth';

export default {
  name: 'Navbar',
  setup() {
    const store = useStore();
    const router = useRouter();
    const isOpen = ref(false);
    const showUserDropdown = ref(false);
    const showDesktopDropdown = ref(false);
    const menuButton = ref(null);
    const mainNavigation = ref(null);
    const menuList = ref(null);
    const hasMoreBelow = ref(false);
    const mobileAccountButton = ref(null);
    const mobileAccountMenu = ref(null);
    const desktopAccountButton = ref(null);
    const desktopAccountMenu = ref(null);
    let scrollSnapshot = null;
    let menuResizeObserver;

    const updateScrollHint = () => {
      const list = menuList.value;
      hasMoreBelow.value = !!(isOpen.value && list && list.scrollHeight - list.clientHeight - list.scrollTop > 2);
    };

    // Fixed positioning also prevents background rubber-banding on iOS Safari.
    const lockBackground = () => {
      if (scrollSnapshot) return;
      const body = document.body;
      scrollSnapshot = {
        x: window.scrollX, y: window.scrollY,
        body: Object.fromEntries(['position', 'top', 'left', 'width', 'overflow'].map(key => [key, body.style[key]])),
        htmlOverflow: document.documentElement.style.overflow,
        smoothScroll: lenis,
        resumeSmoothScroll: !!lenis && !lenis.isStopped,
      };
      if (scrollSnapshot.resumeSmoothScroll) lenis.stop();
      Object.assign(body.style, {
        position: 'fixed', top: `-${scrollSnapshot.y}px`, left: `-${scrollSnapshot.x}px`, width: '100%', overflow: 'hidden',
      });
      document.documentElement.style.overflow = 'hidden';
    };

    const unlockBackground = () => {
      if (!scrollSnapshot) return;
      const saved = scrollSnapshot;
      scrollSnapshot = null;
      Object.assign(document.body.style, saved.body);
      const html = document.documentElement;
      html.style.overflow = saved.htmlOverflow;
      const scrollBehavior = html.style.scrollBehavior;
      html.style.scrollBehavior = 'auto';
      window.scrollTo(saved.x, saved.y);
      html.style.scrollBehavior = scrollBehavior;
      if (saved.resumeSmoothScroll) saved.smoothScroll.start();
    };

    watch(isOpen, (open) => {
      if (open) {
        lockBackground();
        nextTick(() => {
          if (menuList.value) menuList.value.scrollTop = 0;
          updateScrollHint();
        });
      } else {
        unlockBackground();
        hasMoreBelow.value = false;
      }
    }, { flush: 'sync' });

    const focusFirstLink = (element) => {
      nextTick(() => element.value?.querySelector('a, button')?.focus());
    };

    const toggleMenu = () => {
      isOpen.value = !isOpen.value;
      showUserDropdown.value = false;
      showDesktopDropdown.value = false;
      if (isOpen.value) focusFirstLink(mainNavigation);
    };

    const closeMenu = () => {
      isOpen.value = false;
      showUserDropdown.value = false;
      showDesktopDropdown.value = false;
    };

    const toggleUserDropdown = () => {
      showUserDropdown.value = !showUserDropdown.value;
      showDesktopDropdown.value = false;
      isOpen.value = false;
      if (showUserDropdown.value) focusFirstLink(mobileAccountMenu);
    };

    const toggleDesktopDropdown = () => {
      showDesktopDropdown.value = !showDesktopDropdown.value;
      showUserDropdown.value = false;
      if (showDesktopDropdown.value) focusFirstLink(desktopAccountMenu);
    };
    
    const handleLogout = async () => {
      await store.dispatch('auth/logout');
      store.dispatch('toast/showToast', {
        message: '로그아웃되었습니다.',
        type: 'success'
      });
      router.push('/');
      closeMenu();
    };
    
    const isAuthenticated = computed(() => store.getters['auth/isAuthenticated']);
    const user = computed(() => store.getters['auth/user']);
    const userInitial = computed(() => user.value?.username?.charAt(0)?.toUpperCase() || '?');
    const navigationMenus = computed(() => store.getters['menu/navigationMenus']);
    const isAdmin = computed(() => store.getters['auth/isAdmin']);
    watch([navigationMenus, isAdmin, isAuthenticated], () => {
      nextTick(() => updateScrollHint());
    });
    watch(() => router.currentRoute.value.fullPath, () => closeMenu(), { flush: 'sync' });
    
    const hasRole = (role) => {
      return store.getters['auth/hasRole'](role);
    };
    
    
    // 바깥 영역 클릭/터치 시 메뉴 닫기
    const handleDocumentClick = (event) => {
      const navElement = event.target.closest('.header__nav');
      const mobileToggle = event.target.closest('.header__nav__mobile');
      const mobileAvatarWrapper = event.target.closest('.mobile-avatar-wrapper');
      const desktopAvatarWrapper = event.target.closest('.desktop-avatar-wrapper');
      if (!navElement && !mobileToggle && isOpen.value) {
        isOpen.value = false;
      }
      if (!mobileAvatarWrapper && showUserDropdown.value) {
        showUserDropdown.value = false;
      }
      if (!desktopAvatarWrapper && showDesktopDropdown.value) {
        showDesktopDropdown.value = false;
      }
    };

    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      const trigger = showUserDropdown.value ? mobileAccountButton.value
        : showDesktopDropdown.value ? desktopAccountButton.value
          : isOpen.value ? menuButton.value : null;
      if (!trigger) return;
      event.preventDefault();
      closeMenu();
      trigger.focus();
    };

    const handleResize = () => {
      // Mobile browser chrome changes height while scrolling; keep the menu open.
      if (window.innerWidth > 800) closeMenu();
      else nextTick(updateScrollHint);
    };
    
    onMounted(() => {
      document.addEventListener('click', handleDocumentClick);
      document.addEventListener('touchstart', handleDocumentClick);
      document.addEventListener('focusin', handleDocumentClick);
      document.addEventListener('keydown', handleEscape);
      window.addEventListener('resize', handleResize);
      if (typeof ResizeObserver !== 'undefined') {
        menuResizeObserver = new ResizeObserver(updateScrollHint);
        if (menuList.value) menuResizeObserver.observe(menuList.value);
      }
    });
    
    onUnmounted(() => {
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('touchstart', handleDocumentClick);
      document.removeEventListener('focusin', handleDocumentClick);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', handleResize);
      menuResizeObserver?.disconnect();
      unlockBackground();
    });
    
    return {
      isOpen,
      showUserDropdown,
      showDesktopDropdown,
      toggleMenu,
      toggleUserDropdown,
      toggleDesktopDropdown,
      closeMenu,
      handleLogout,
      isAuthenticated,
      user,
      userInitial,
      navigationMenus,
      isAdmin,
      hasRole,
      menuButton, mainNavigation, mobileAccountButton, mobileAccountMenu,
      desktopAccountButton, desktopAccountMenu,
      menuList, hasMoreBelow, updateScrollHint
    };
  }
}
</script>

<style src="@/assets/css/layout.css" scoped></style>
<style src="@/assets/css/section/header.css" scoped></style>
