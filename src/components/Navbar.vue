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
        <div v-else class="user-section">
          <span class="user-info">{{ user.username }} ({{ user.role }})</span>
          <button @click="handleLogout" class="logout-btn">로그아웃</button>
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
          <li v-for="menu in navigationMenus" :key="menu.path">
            <router-link :to="menu.path" @click="closeMenu">{{ menu.navLabel }}</router-link>
          </li>
          <li v-if="hasAdminAccess">
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
    
    const toggleMenu = () => {
      isOpen.value = !isOpen.value;
    };
    
    const closeMenu = () => {
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
    const navigationMenus = computed(() => store.getters['menu/navigationMenus']);
    const hasAdminAccess = computed(() => store.getters['menu/hasAdminAccess']);
    
    const hasRole = (role) => {
      return store.getters['auth/hasRole'](role);
    };
    
    
    // 바깥 영역 클릭/터치 시 메뉴 닫기
    const handleDocumentClick = (event) => {
      // 모바일 메뉴나 햄버거 버튼이 아닌 곳을 클릭/터치하면 메뉴 닫기
      const navElement = event.target.closest('.header__nav');
      const mobileToggle = event.target.closest('.header__nav__mobile');
      if (!navElement && !mobileToggle && isOpen.value) {
        closeMenu();
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
      toggleMenu, 
      closeMenu, 
      handleLogout,
      isAuthenticated,
      user,
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
  gap: 15px;
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

.user-section {
  display: flex;
  align-items: center;
  gap: 15px;
}

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
  
  .header__left .auth-buttons,
  .header__left .user-section {
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
    z-index: 999; /* 오버레이보다 위에 표시 */
  }
  
  .user-section {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
  
  .desktop-login,
  .desktop-user {
    display: none;
  }
  
}
</style>