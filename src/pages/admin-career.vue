<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1>경력 관리</h1>
        <p>Career &amp; Projects 섹션 데이터를 관리합니다.</p>
      </div>
      <button class="btn-primary" @click="openCreate">+ 새 경력 추가</button>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>데이터를 불러오는 중...</p>
    </div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
    <div v-else-if="careers.length === 0" class="loading-state">등록된 경력이 없습니다.</div>

    <div v-else class="table-wrapper">
      <!-- 데스크탑 테이블 -->
      <table class="data-table desktop-only">
        <thead>
          <tr>
            <th>순서</th>
            <th>아이콘</th>
            <th>회사명</th>
            <th>기간</th>
            <th>배지</th>
            <th>역할</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in careers" :key="item.id">
            <td>{{ item.sortOrder }}</td>
            <td><span class="icon-badge">{{ item.icon }}</span></td>
            <td>{{ item.company }}</td>
            <td>{{ item.period }}</td>
            <td>{{ item.badge || '-' }}</td>
            <td class="role-cell">{{ item.roleDesc }}</td>
            <td class="actions">
              <button class="btn-edit" @click="openEdit(item)">수정</button>
              <button class="btn-delete" @click="confirmDelete(item)">삭제</button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 모바일 카드 -->
      <div class="card-list mobile-only">
        <div v-for="item in careers" :key="item.id" class="card-item">
          <div class="card-top">
            <span class="icon-badge">{{ item.icon }}</span>
            <div class="card-info">
              <strong>{{ item.company }}</strong>
              <span class="card-period">{{ item.period }}</span>
            </div>
            <span v-if="item.badge" class="badge-tag">{{ item.badge }}</span>
          </div>
          <p class="card-role">{{ item.roleDesc }}</p>
          <div class="card-actions">
            <button class="btn-edit" @click="openEdit(item)">수정</button>
            <button class="btn-delete" @click="confirmDelete(item)">삭제</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 모달 -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-box">
          <div class="modal-header">
            <h2>{{ editTarget ? '경력 수정' : '경력 추가' }}</h2>
            <button class="modal-close" @click="closeModal" aria-label="닫기">✕</button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="save">
              <div class="form-grid">
                <div class="form-row">
                  <label>아이콘 <span class="hint">(예: AI, NLP, SEC)</span></label>
                  <input v-model="form.icon" placeholder="AI" maxlength="10" required />
                </div>
                <div class="form-row">
                  <label>배지 <span class="hint">(재직중이면 입력)</span></label>
                  <input v-model="form.badge" placeholder="재직중" />
                </div>
              </div>
              <div class="form-row">
                <label>회사명 *</label>
                <input v-model="form.company" placeholder="(주)회사명" required />
              </div>
              <div class="form-row">
                <label>기간 *</label>
                <input v-model="form.period" placeholder="2025.04 ~ 재직중" required />
              </div>
              <div class="form-row">
                <label>역할 설명 *</label>
                <input v-model="form.roleDesc" placeholder="LLM 개발운영 — 대규모 언어 모델 프로젝트" required />
              </div>
              <div class="form-row">
                <label>프로젝트 목록 <span class="hint">(한 줄에 하나씩)</span></label>
                <textarea v-model="projectsText" rows="3" placeholder="SKT — LLM 서비스 개발 및 운영&#10;H사 — 대규모 언어 모델 개발"></textarea>
              </div>
              <div class="form-row">
                <label>기술 태그 <span class="hint">(쉼표로 구분)</span></label>
                <input v-model="tagsText" placeholder="Python, LLM, Spring Boot, Docker" />
              </div>
              <div class="form-row form-row-sm">
                <label>정렬 순서</label>
                <input v-model.number="form.sortOrder" type="number" min="0" placeholder="0" />
              </div>
              <div class="form-actions">
                <button type="button" class="btn-cancel" @click="closeModal">취소</button>
                <button type="submit" class="btn-primary" :disabled="saving">{{ saving ? '저장 중...' : '저장' }}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 삭제 확인 -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
        <div class="modal-box modal-confirm">
          <div class="modal-header">
            <h2>경력 삭제</h2>
            <button class="modal-close" @click="deleteTarget = null" aria-label="닫기">✕</button>
          </div>
          <div class="modal-body">
            <p><strong>{{ deleteTarget.company }}</strong> 경력을 삭제하시겠습니까?</p>
            <div class="form-actions">
              <button class="btn-cancel" @click="deleteTarget = null">취소</button>
              <button class="btn-delete" :disabled="saving" @click="doDelete">{{ saving ? '삭제 중...' : '삭제' }}</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
import axios from '@/axios'

export default {
  name: 'AdminCareer',
  data() {
    return {
      careers: [],
      loading: true,
      error: '',
      showModal: false,
      editTarget: null,
      deleteTarget: null,
      saving: false,
      form: { icon: '', company: '', period: '', badge: '', roleDesc: '', sortOrder: 0 },
      projectsText: '',
      tagsText: '',
    }
  },
  mounted() {
    this.load()
  },
  methods: {
    async load() {
      this.loading = true
      this.error = ''
      try {
        const res = await axios.get('/api/admin/career')
        this.careers = res.data
      } catch (e) {
        this.error = '데이터를 불러오지 못했습니다.'
      } finally {
        this.loading = false
      }
    },
    openCreate() {
      this.editTarget = null
      this.form = { icon: '', company: '', period: '', badge: '', roleDesc: '', sortOrder: this.careers.length }
      this.projectsText = ''
      this.tagsText = ''
      this.showModal = true
    },
    openEdit(item) {
      this.editTarget = item
      this.form = { icon: item.icon || '', company: item.company || '', period: item.period || '', badge: item.badge || '', roleDesc: item.roleDesc || '', sortOrder: item.sortOrder ?? 0 }
      this.projectsText = item.projects ? JSON.parse(item.projects).join('\n') : ''
      this.tagsText = item.tags ? JSON.parse(item.tags).join(', ') : ''
      this.showModal = true
    },
    closeModal() {
      this.showModal = false
      this.editTarget = null
    },
    async save() {
      this.saving = true
      try {
        const projects = JSON.stringify(this.projectsText.split('\n').map(s => s.trim()).filter(Boolean))
        const tags = JSON.stringify(this.tagsText.split(',').map(s => s.trim()).filter(Boolean))
        const payload = { ...this.form, projects, tags }
        if (this.editTarget) {
          await axios.put(`/api/admin/career/${this.editTarget.id}`, payload)
        } else {
          await axios.post('/api/admin/career', payload)
        }
        this.closeModal()
        await this.load()
      } catch (e) {
        alert('저장에 실패했습니다.')
      } finally {
        this.saving = false
      }
    },
    confirmDelete(item) {
      this.deleteTarget = item
    },
    async doDelete() {
      this.saving = true
      try {
        await axios.delete(`/api/admin/career/${this.deleteTarget.id}`)
        this.deleteTarget = null
        await this.load()
      } catch (e) {
        alert('삭제에 실패했습니다.')
      } finally {
        this.saving = false
      }
    },
  }
}
</script>

<style scoped>
/* ── 기본 레이아웃 ── */
.page-container { padding: 2rem; max-width: 1100px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; gap: 1rem; }
.page-header h1 { font-size: 1.5rem; margin: 0 0 0.25rem; }
.page-header p { margin: 0; color: #888; font-size: 0.875rem; }

/* ── 상태 ── */
.loading-state { text-align: center; padding: 3rem; color: #888; }
.error-state { text-align: center; padding: 2rem; color: #e74c3c; }
.spinner { width: 32px; height: 32px; border: 3px solid #333; border-top-color: #c9a96e; border-radius: 50%; animation: spin 0.7s linear infinite; margin: 0 auto 1rem; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── 테이블 ── */
.table-wrapper { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.data-table th { background: #1a1a2e; color: #c9a96e; padding: 0.75rem 1rem; text-align: left; font-weight: 600; white-space: nowrap; }
.data-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #222; vertical-align: middle; }
.data-table tr:hover td { background: #111; }
.role-cell { max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #888; font-size: 0.8rem; }

/* ── 모바일 카드 ── */
.desktop-only { display: table; }
.mobile-only { display: none; }
.card-list { display: flex; flex-direction: column; gap: 0.75rem; }
.card-item { background: #13131f; border: 1px solid #2a2a3a; border-radius: 8px; padding: 1rem; }
.card-top { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
.card-info { flex: 1; min-width: 0; }
.card-info strong { display: block; font-size: 0.9rem; color: #f0ece4; }
.card-period { font-size: 0.75rem; color: #888; }
.card-role { font-size: 0.8rem; color: #888; margin: 0.25rem 0 0.75rem; line-height: 1.5; }
.badge-tag { background: transparent; color: #c9a96e; border: 1px solid rgba(201,169,110,0.4); padding: 2px 8px; font-size: 0.7rem; border-radius: 3px; white-space: nowrap; }
.card-actions { display: flex; gap: 0.5rem; }

/* ── 배지/아이콘 ── */
.icon-badge { display: inline-block; background: #c9a96e22; color: #c9a96e; border: 1px solid #c9a96e55; padding: 0.1rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 700; }
.actions { white-space: nowrap; }

/* ── 버튼 ── */
.btn-primary { background: #c9a96e; color: #0a0a12; border: none; padding: 0.5rem 1.2rem; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.875rem; white-space: nowrap; }
.btn-primary:hover { background: #e0bb80; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-edit { background: #1a3a5c; color: #7ab3e0; border: 1px solid #2a5a8c; padding: 0.3rem 0.8rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
.btn-edit:hover { background: #2a4a7c; }
.btn-delete { background: #3a1a1a; color: #e07a7a; border: 1px solid #5a2a2a; padding: 0.3rem 0.8rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
.btn-delete:hover { background: #4a2a2a; }
.btn-delete:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-cancel { background: #2a2a3a; color: #aaa; border: 1px solid #444; padding: 0.5rem 1.2rem; border-radius: 6px; cursor: pointer; font-size: 0.875rem; }
.btn-cancel:hover { background: #3a3a4a; }

/* ── 모달 오버레이 ── */
/* ── 모달 바디 (스크롤) ── */
.modal-body {
  padding: 1.25rem 1.5rem;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

/* ── 폼 ── */
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 1rem; }
.form-row { margin-bottom: 0.875rem; }
.form-row-sm { max-width: 160px; }
.form-row label { display: block; font-size: 0.78rem; color: #aaa; margin-bottom: 0.25rem; }
.form-row .hint { color: #666; font-size: 0.72rem; }
.form-row input, .form-row textarea {
  width: 100%;
  background: #0a0a12;
  border: 1px solid #333;
  border-radius: 6px;
  padding: 0.45rem 0.7rem;
  color: #f0ece4;
  font-size: 0.875rem;
  box-sizing: border-box;
}
.form-row textarea { resize: vertical; font-family: inherit; min-height: 80px; }
.form-row input:focus, .form-row textarea:focus { outline: none; border-color: #c9a96e; }
.form-actions { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid #1a1a2a; }
.modal-confirm .modal-body p { color: #ccc; margin-bottom: 1rem; }

/* ── 반응형: 노트북 (1024px 이하) ── */
@media (max-width: 1024px) {
  .page-container { padding: 1.5rem; }
}

/* ── 반응형: 태블릿 (768px 이하) ── */
@media (max-width: 768px) {
  .page-container { padding: 1rem; }
  .page-header { flex-direction: column; align-items: stretch; }
  .page-header h1 { font-size: 1.25rem; }
  .btn-primary { text-align: center; }
  .desktop-only { display: none; }
  .mobile-only { display: flex; }
  .form-grid { grid-template-columns: 1fr; }
  .form-row-sm { max-width: 100%; }
}

/* ── 반응형: 모바일 (480px 이하) ── */
@media (max-width: 480px) {
  .modal-header { padding: 1rem; }
  .modal-body { padding: 1rem; }
  .form-row { margin-bottom: 0.75rem; }
}
</style>
