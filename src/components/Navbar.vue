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

.login-btn {
  padding: 8px 16px;
  background: #667eea;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-size: 14px;
  transition: background 0.3s ease;
}

.login-btn:hover {
  background: #5a6fd8;
}

/* ===== 모바일 아바타 + 드롭다운 ===== */
.mobile-avatar-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.mobile-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  transition: opacity 0.2s ease;
  flex-shrink: 0;
}

.mobile-avatar:hover {
  opacity: 0.85;
}

.mobile-user-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  border: 1px solid #e2e8f0;
  min-width: 220px;
  z-index: 20000;
  overflow: hidden;
}

.dropdown-user-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f8fafc;
}

.dropdown-avatar-lg {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
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
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-role {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.dropdown-divider {
  height: 1px;
  background: #e2e8f0;
}

.dropdown-logout-btn {
  width: 100%;
  padding: 13px 16px;
  background: none;
  border: none;
  text-align: left;
  font-size: 14px;
  font-weight: 500;
  color: #dc3545;
  cursor: pointer;
  transition: background 0.15s ease;
}

.dropdown-logout-btn:hover {
  background: #fff5f5;
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

/* ===== 데스크탑: 아바타 숨기고 desktop-user 표시 ===== */
.user-info {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.logout-btn {
  padding: 8px 16px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.logout-btn:hover {
  background: #c82333;
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
  color: white;
  font-size: 14px;
}

.desktop-user .logout-btn {
  font-size: 12px;
  padding: 6px 12px;
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