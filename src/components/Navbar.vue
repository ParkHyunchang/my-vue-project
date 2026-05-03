<template>
  <header id="header" role="banner">
    <div class="header__inner">
      <div class="header__logo">
        <router-link to="/">HYUNCHANG'S<br /><em>HOME</em></router-link>
      </div>
      <div class="header__left">
        <div v-if="!isAuthenticated" class="auth-buttons">
          <router-link to="/login" @click="closeMenu" class="login-btn">로그인</router-link>
        </div>
        <!-- 모바일 전용: 아바타 클릭 → 드롭다운 -->
        <div v-else class="mobile-avatar-wrapper" @click.stop="toggleUserDropdown">
          <div class="mobile-avatar">{{ userInitial }}</div>
          <transition name="dropdown-fade">
            <div v-if="showUserDropdown" class="mobile-user-dropdown" @click.stop>
              <div class="dropdown-user-header">
                <div class="dropdown-avatar-lg">{{ userInitial }}</div>
                <div class="dropdown-user-meta">
                  <span class="dropdown-username">{{ user.username }}</span>
                  <span class="dropdown-role">{{ user.role }}</span>
                </div>
              </div>
              <div class="dropdown-divider"></div>
              <router-link to="/mypage" class="dropdown-menu-item" @click="closeMenu">내 정보 수정</router-link>
              <router-link to="/change-password" class="dropdown-menu-item" @click="closeMenu">비밀번호 수정</router-link>
              <div class="dropdown-divider"></div>
              <button @click="handleLogout" class="dropdown-logout-btn">로그아웃</button>
            </div>
          </transition>
        </div>
        <div class="header__nav__mobile" @click="toggleMenu">
          <span></span>
        </div>
      </div>
      <nav
        :class="['header__nav', { show: isOpen }]"
        role="navigation"
        aria-label="메인 메뉴"
      >
        <ul>
          <li
            v-for="menu in navigationMenus"
            :key="menu.path"
            class="nav-item"
          >
            <router-link :to="menu.path" @click="closeMenu">{{ menu.navLabel }}</router-link>
          </li>
          <li v-if="isAdmin" class="nav-item">
            <router-link to="/admin" @click="closeMenu">관리자</router-link>
          </li>
          <li v-if="!isAuthenticated" class="nav-item mobile-login-item">
            <router-link to="/login" @click="closeMenu">로그인</router-link>
          </li>
        </ul>
        <div v-if="!isAuthenticated" class="desktop-login">
          <router-link to="/login" @click="closeMenu" class="login-btn">로그인</router-link>
        </div>
        <!-- 데스크탑 전용: 아바타 클릭 → 드롭다운 -->
        <div v-else class="desktop-avatar-wrapper" @click.stop="toggleDesktopDropdown">
          <div class="desktop-avatar">{{ userInitial }}</div>
          <span class="desktop-avatar-name">{{ user.username }}</span>
          <transition name="dropdown-fade">
            <div v-if="showDesktopDropdown" class="desktop-user-dropdown" @click.stop>
              <div class="dropdown-user-header">
                <div class="dropdown-avatar-lg">{{ userInitial }}</div>
                <div class="dropdown-user-meta">
                  <span class="dropdown-username">{{ user.username }}</span>
                  <span class="dropdown-role">{{ user.role }}</span>
                </div>
              </div>
              <div class="dropdown-divider"></div>
              <router-link to="/mypage" class="dropdown-menu-item" @click="closeMenu">내 정보 수정</router-link>
              <router-link to="/change-password" class="dropdown-menu-item" @click="closeMenu">비밀번호 수정</router-link>
              <div class="dropdown-divider"></div>
              <button @click="handleLogout" class="dropdown-logout-btn">로그아웃</button>
            </div>
          </transition>
        </div>
      </nav>
    </div>
  </header>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

export default {
  name: 'Navbar',
  setup() {
    const store = useStore();
    const router = useRouter();
    const isOpen = ref(false);
    const showUserDropdown = ref(false);
    const showDesktopDropdown = ref(false);

    const toggleMenu = () => {
      isOpen.value = !isOpen.value;
      showUserDropdown.value = false;
      showDesktopDropdown.value = false;
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
    };

    const toggleDesktopDropdown = () => {
      showDesktopDropdown.value = !showDesktopDropdown.value;
      showUserDropdown.value = false;
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
    
    onMounted(() => {
      document.addEventListener('click', handleDocumentClick);
      document.addEventListener('touchstart', handleDocumentClick);
    });
    
    onUnmounted(() => {
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('touchstart', handleDocumentClick);
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
      hasRole
    };
  }
}
</script>

<style src="@/assets/css/layout.css" scoped></style>