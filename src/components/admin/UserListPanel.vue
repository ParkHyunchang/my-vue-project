<template>
  <div class="users-section">
    <div class="section-header">
      <h2>사용자 목록</h2>
      <div class="header-actions">
        <button
          class="btn btn-refresh"
          :disabled="loadingUsers"
          title="사용자 목록 새로고침"
          @click="$emit('refresh')"
        >
          {{ loadingUsers ? '로딩 중...' : '↻ 새로고침' }}
        </button>
        <button class="btn btn-create" @click="$emit('open-create')">
          새 사용자 생성
        </button>
        <div class="stats">
          <button
            :class="['stat-item', { active: searchFilters.role === '' }]"
            @click="filterByRole('')"
          >
            전체: {{ users.length }}명
          </button>
          <button
            v-for="roleInfo in roleInfos"
            :key="roleInfo.roleName"
            :class="['stat-item', `stat-${roleInfo.roleName.toLowerCase()}`, { active: searchFilters.role === roleInfo.roleName }]"
            @click="filterByRole(roleInfo.roleName)"
          >
            {{ roleInfo.displayName }}: {{ countByRole(roleInfo.roleName) }}명
          </button>
        </div>
      </div>
    </div>

    <!-- 검색 및 필터 섹션 -->
    <div class="search-section">
      <div class="search-filters">
        <div class="filter-group">
          <label>회원분류:</label>
          <select v-model="searchFilters.role" class="filter-select">
            <option value="">전체</option>
            <option v-for="roleInfo in roleInfos" :key="roleInfo.roleName" :value="roleInfo.roleName">
              {{ roleInfo.displayName }}
            </option>
          </select>
        </div>
        <div class="filter-group">
          <label>이름 / 사용자ID:</label>
          <input
            v-model="searchFilters.name"
            type="text"
            placeholder="이름 또는 사용자ID로 검색"
            class="filter-input"
          />
        </div>
        <div class="filter-group">
          <label>정렬:</label>
          <select v-model="sortKey" class="filter-select">
            <option value="createdAt_desc">가입일 최신순</option>
            <option value="createdAt_asc">가입일 오래된순</option>
            <option value="name_asc">이름순</option>
            <option value="role_asc">권한순</option>
          </select>
        </div>
        <div class="search-actions">
          <button class="btn btn-reset" @click="resetSearch">초기화</button>
        </div>
      </div>
    </div>

    <!-- 검색 결과 정보 -->
    <div class="search-results-info">
      <span>검색결과: {{ filteredUsers.length }} / 총 {{ users.length }}명</span>
    </div>

    <!-- 사용자 카드 리스트 -->
    <div :class="['users-cards-container', { 'refreshing': loadingUsers && users.length > 0 }]">
      <div v-if="loadingUsers && users.length === 0" class="loading-state">
        사용자 목록을 불러오는 중...
      </div>
      <div v-else-if="!loadingUsers && filteredUsers.length === 0" class="empty-state">
        <span v-if="searchFilters.role || searchFilters.name">검색 조건에 맞는 사용자가 없습니다.</span>
        <span v-else>등록된 사용자가 없습니다.</span>
      </div>
      <div v-for="user in filteredUsers" :key="user.id" class="user-card">
        <div class="user-info">
          <div class="user-main">
            <span class="user-id">{{ user?.userId || '-' }}</span>
            <span class="user-name">({{ user?.name || '-' }})</span>
            <span :class="['role-badge', user?.role?.toLowerCase()]">
              {{ getRoleDisplayName(user?.role) }}
            </span>
          </div>
          <div class="user-details">
            <div class="detail-item">
              <span class="detail-label">이메일:</span>
              <span class="detail-value">{{ user?.email || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">전화번호:</span>
              <span class="detail-value">{{ user?.phone || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">가입일:</span>
              <span class="detail-value">{{ formatDate(user?.createdAt) }}</span>
            </div>
          </div>
        </div>
        <div class="user-actions">
          <button class="btn btn-detail" @click="$emit('open-detail', user)">
            상세
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from "vue";

const ROLE_ORDER = { ADMIN: 0, PREMIUM: 1, USER: 2 };

export default {
  name: "UserListPanel",
  props: {
    users: { type: Array, default: () => [] },
    loadingUsers: { type: Boolean, default: false },
    roleInfos: { type: Array, default: () => [] },
  },
  emits: ["refresh", "open-create", "open-detail"],
  setup(props) {
    const searchFilters = ref({ role: "", name: "" });
    const sortKey = ref("createdAt_desc");

    const countByRole = (roleName) => props.users.filter((u) => u.role === roleName).length;

    const getRoleDisplayName = (role) => {
      const found = props.roleInfos.find((r) => r.roleName === role);
      return found ? found.displayName : (role || "-");
    };

    const formatDate = (dateString) => {
      if (!dateString) return "-";
      const date = new Date(dateString);
      return date.toLocaleDateString("ko-KR", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
      });
    };

    const filteredUsers = computed(() => {
      let filtered = props.users;
      if (searchFilters.value.role) {
        filtered = filtered.filter((u) => u.role === searchFilters.value.role);
      }
      if (searchFilters.value.name) {
        const q = searchFilters.value.name.toLowerCase();
        filtered = filtered.filter(
          (u) =>
            u.name?.toLowerCase().includes(q) ||
            u.userId?.toLowerCase().includes(q),
        );
      }
      const [field, dir] = sortKey.value.split("_");
      return [...filtered].sort((a, b) => {
        if (field === "name") {
          return dir === "asc"
            ? (a.name || "").localeCompare(b.name || "", "ko")
            : (b.name || "").localeCompare(a.name || "", "ko");
        }
        if (field === "role") {
          const ra = ROLE_ORDER[a.role] ?? 99;
          const rb = ROLE_ORDER[b.role] ?? 99;
          return dir === "asc" ? ra - rb : rb - ra;
        }
        const da = new Date(a.createdAt || 0).getTime();
        const db = new Date(b.createdAt || 0).getTime();
        return dir === "asc" ? da - db : db - da;
      });
    });

    const filterByRole = (role) => {
      searchFilters.value.role = role;
    };

    const resetSearch = () => {
      searchFilters.value.role = "";
      searchFilters.value.name = "";
      sortKey.value = "createdAt_desc";
    };

    return {
      searchFilters, sortKey,
      filteredUsers,
      countByRole, getRoleDisplayName, formatDate,
      filterByRole, resetSearch,
    };
  },
};
</script>

<style src="@/assets/css/admin.css" scoped></style>

<style src="@/assets/css/components/admin/user-list-panel.css" scoped></style>
