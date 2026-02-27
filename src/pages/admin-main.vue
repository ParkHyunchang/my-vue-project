<template>
  <div class="admin-main-container">
    <div class="admin-main-header">
      <h1>관리자 대시보드</h1>
      <p>시스템 관리 및 설정</p>
    </div>

    <div class="admin-main-content">
      <div class="admin-menu-grid">
        <div class="admin-menu-card">
          <div class="menu-icon">👥</div>
          <h3>사용자 관리</h3>
          <p>사용자 계정 및 권한 관리</p>
          <router-link to="/admin/users" class="menu-link">관리하기</router-link>
        </div>
        
        <div class="admin-menu-card">
          <div class="menu-icon">🔐</div>
          <h3>메뉴 권한 관리</h3>
          <p>사용자 권한별 메뉴 접근 권한 설정</p>
          <router-link to="/admin/menu-management" class="menu-link">관리하기</router-link>
        </div>

        <div class="admin-menu-card">
          <div class="menu-icon">🛡️</div>
          <h3>권한 관리</h3>
          <p>사용자 역할(Role) 정보 관리</p>
          <router-link to="/admin/role-management" class="menu-link">관리하기</router-link>
        </div>
        
        <!-- 향후 추가될 관리 기능들을 위한 플레이스홀더 -->
        <div class="admin-menu-card coming-soon">
          <div class="menu-icon">⚙️</div>
          <h3>시스템 설정</h3>
          <p>시스템 전반적인 설정 관리</p>
          <span class="coming-soon-badge">준비 중</span>
        </div>
        
        <div class="admin-menu-card coming-soon">
          <div class="menu-icon">📊</div>
          <h3>통계 및 분석</h3>
          <p>사용자 활동 및 시스템 통계</p>
          <span class="coming-soon-badge">준비 중</span>
        </div>
        
        <div class="admin-menu-card coming-soon">
          <div class="menu-icon">🔒</div>
          <h3>보안 관리</h3>
          <p>보안 설정 및 접근 제어</p>
          <span class="coming-soon-badge">준비 중</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AdminMain',
  setup() {
    return {};
  }
};
</script>

<style scoped>
.admin-main-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.admin-main-header {
  text-align: center;
  margin-bottom: 40px;
}

.admin-main-header h1 {
  color: #2c3e50;
  margin-bottom: 10px;
  font-size: 2.5rem;
}

.admin-main-header p {
  color: #7f8c8d;
  font-size: 1.1rem;
}

.admin-main-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  padding: 40px;
}

.admin-menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 30px;
}

.admin-menu-card {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 30px;
  text-align: center;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.admin-menu-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  border-color: #667eea;
}

.admin-menu-card.coming-soon {
  opacity: 0.6;
  cursor: not-allowed;
}

.admin-menu-card.coming-soon:hover {
  transform: none;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border-color: transparent;
}

.menu-icon {
  font-size: 3rem;
  margin-bottom: 20px;
}

.admin-menu-card h3 {
  color: #2c3e50;
  margin-bottom: 15px;
  font-size: 1.5rem;
}

.admin-menu-card p {
  color: #7f8c8d;
  margin-bottom: 25px;
  line-height: 1.6;
}

.menu-link {
  display: inline-block;
  background: #667eea;
  color: white;
  padding: 12px 24px;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 500;
  transition: background 0.3s ease;
}

.menu-link:hover {
  background: #5a6fd8;
}

.coming-soon-badge {
  display: inline-block;
  background: #6c757d;
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
}

@media (max-width: 768px) {
  .admin-main-container {
    padding: 15px;
  }
  
  .admin-main-content {
    padding: 20px;
  }
  
  .admin-menu-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .admin-menu-card {
    padding: 20px;
  }
  
  .admin-main-header h1 {
    font-size: 2rem;
  }
}
</style>
