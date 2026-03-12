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
            <!-- 모든 메뉴: 단순 링크 (자식 있는 섹션은 사이드바에서 서브메뉴 제공) -->
            <router-link :to="menu.path" @click="closeMenu">{{ menu.navLabel }}</router-link>
          </li>
          <li v-if="hasAdminAccess" class="nav-item">
            <router-link to="/admin" @click="closeMenu">관리자</router-link>
          </li>
        </ul>
        <div v-if="!isAuthenticated" class="desktop-login">
          <router-link to="/login" @click="closeMenu" class="login-btn">로그인</router-link>
        </div>
        <div v-else class="desktop-user">
          <span class="user-info">{{ user.username }} ({{ user.role }})</span>
          <button @click="handleLogout" class="logout-btn">로그아웃</button>
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

    const toggleMenu = () => {
      isOpen.value = !isOpen.value;
      showUserDropdown.value = false;
    };

    const closeMenu = () => {
      isOpen.value = false;
      showUserDropdown.value = false;
    };

    const toggleUserDropdown = () => {
      showUserDropdown.value = !showUserDropdown.value;
      isOpen.value = false;
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
    const hasAdminAccess = computed(() => store.getters['menu/hasAdminAccess']);
    
    const hasRole = (role) => {
      return store.getters['auth/hasRole'](role);
    };
    
    
    // 바깥 영역 클릭/터치 시 메뉴 닫기
    const handleDocumentClick = (event) => {
      const navElement = event.target.closest('.header__nav');
      const mobileToggle = event.target.closest('.header__nav__mobile');
      const avatarWrapper = event.target.closest('.mobile-avatar-wrapper');
      if (!navElement && !mobileToggle && isOpen.value) {
        isOpen.value = false;
      }
      if (!avatarWrapper && showUserDropdown.value) {
        showUserDropdown.value = false;
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
      toggleMenu,
      toggleUserDropdown,
      closeMenu,
      handleLogout,
      isAuthenticated,
      user,
      userInitial,
      navigationMenus,
      hasAdminAccess,
      hasRole
    };
  }
}
</script>

<style scoped>

.header__left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.auth-buttons {
  display: flex;
  gap: 10px;
}

/* ===== 로그인 버튼 ===== */
.login-btn {
  padding: 7px 16px;
  background: linear-gradient(135deg, var(--accent) 0%, #b8924a 100%);
  color: var(--text-on-accent);
  text-decoration: none;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  transition: all 0.25s ease;
  box-shadow: 0 2px 8px rgba(201, 169, 110, 0.2);
}

.login-btn:hover {
  background: linear-gradient(135deg, var(--accent-light) 0%, var(--accent) 100%);
  box-shadow: 0 4px 14px rgba(201, 169, 110, 0.3);
}

/* ===== 모바일 아바타 + 드롭다운 ===== */
.mobile-avatar-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.mobile-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), #8a6030);
  color: var(--text-on-accent);
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  transition: opacity 0.2s ease, box-shadow 0.2s ease;
  flex-shrink: 0;
  border: 1px solid var(--accent-glow);
}

.mobile-avatar:hover {
  opacity: 0.85;
  box-shadow: 0 0 12px var(--accent-glow);
}

.mobile-user-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  background: var(--surface);
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
  border: 1px solid var(--card-border-strong);
  min-width: 220px;
  z-index: 20000;
  overflow: hidden;
}

.dropdown-user-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--subBg300);
  border-bottom: 1px solid var(--card-border);
}

.dropdown-avatar-lg {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), #8a6030);
  color: var(--text-on-accent);
  font-size: 17px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid var(--accent-glow);
}

.dropdown-user-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.dropdown-username {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-role {
  font-size: 11px;
  color: var(--accent);
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.dropdown-divider {
  height: 1px;
  background: var(--card-border);
}

.dropdown-logout-btn {
  width: 100%;
  padding: 12px 16px;
  background: none;
  border: none;
  text-align: left;
  font-size: 13px;
  font-weight: 500;
  color: var(--danger-color);
  cursor: pointer;
  transition: background 0.15s ease;
}

.dropdown-logout-btn:hover {
  background: var(--danger-bg);
}

/* 드롭다운 트랜지션 */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ===== 데스크탑: user info & logout ===== */
.user-info {
  font-size: 13px;
  color: var(--text-muted);
  font-weight: 500;
}

.logout-btn {
  padding: 6px 14px;
  background: var(--danger-bg);
  color: var(--danger-color);
  border: 1px solid rgba(196, 90, 90, 0.3);
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.logout-btn:hover {
  background: var(--danger-color);
  color: #fff;
  border-color: transparent;
}

/* ===== nav-item ===== */
.nav-item {
  display: inline-block;
}

@media (min-width: 768px) {
  .header__nav {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  
  .header__nav ul {
    display: flex;
    align-items: center;
    gap: 20px;
    margin: 0;
    padding: 0;
  }
  
  /* 데스크탑에서는 header__left의 로그인/아바타 숨김 */
  .header__left .auth-buttons,
  .header__left .mobile-avatar-wrapper {
    display: none;
  }
}

.desktop-login .login-btn,
.desktop-user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.desktop-user .user-info {
  color: var(--text-muted);
  font-size: 13px;
}

.desktop-user .logout-btn {
  font-size: 12px;
  padding: 5px 12px;
}


@media (max-width: 767px) {
  .header__left {
    order: 2;
  }
  
  .header__nav {
    order: 3;
    position: relative;
    z-index: 999;
  }

  /* 모바일에서는 desktop-user / desktop-login 숨김 */
  .desktop-login,
  .desktop-user {
    display: none;
  }

  /* 모바일 nav-item: block으로 */
  .nav-item {
    display: block !important;
  }
}
</style>