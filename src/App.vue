<template>
  <Navbar />
  <div class="main-wrapper">
    <!-- admin 라우트: AdminLayout이 router-view 안에서 자체 사이드바 처리 -->
    <template v-if="isAdminRoute">
      <router-view />
    </template>

    <!-- 자식 메뉴가 있는 섹션: SubMenuLayout 사이드바 -->
    <template v-else-if="currentSection">
      <SubMenuLayout :section="currentSection">
        <router-view />
      </SubMenuLayout>
    </template>

    <!-- 일반 페이지 -->
    <template v-else>
      <router-view />
    </template>
  </div>

  <Toast />
</template>

<script>
import { computed } from 'vue';
import { useStore } from 'vuex';
import { useRoute } from 'vue-router';
import Toast from '@/components/Toast.vue';
import Navbar from '@/components/Navbar.vue';
import SubMenuLayout from '@/components/SubMenuLayout.vue';

export default {
  components: { Toast, Navbar, SubMenuLayout },
  setup() {
    const store = useStore();
    const route = useRoute();

    const isAdminRoute = computed(() =>
      route.matched.some(r => r.path === '/admin' || r.path.startsWith('/admin/'))
    );

    // navigationMenus에서 children이 있는 섹션 찾기
    const currentSection = computed(() => {
      if (isAdminRoute.value) return null;

      const navMenus = store.getters['menu/navigationMenus'];
      const path = route.path;

      for (const menu of navMenus) {
        if (!menu.children || menu.children.length === 0) continue;

        // 현재 경로가 부모 메뉴 → 이 섹션
        if (menu.path === path) return menu;

        // 현재 경로가 자식 메뉴 중 하나 → 이 섹션
        if (menu.children.some(c => c.path === path)) return menu;
      }

      return null;
    });

    return { isAdminRoute, currentSection };
  },
};
</script>

<style src="@/assets/css/app.css"></style>
