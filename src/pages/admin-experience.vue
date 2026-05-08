<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1>교육 · 경험 관리</h1>
        <p>Experience 섹션 타임라인 데이터를 관리합니다.</p>
      </div>
      <button class="btn-primary" @click="openCreate">+ 새 항목 추가</button>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>데이터를 불러오는 중...</p>
    </div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
    <div v-else-if="items.length === 0" class="loading-state">등록된 항목이 없습니다.</div>

    <div v-else class="table-wrapper">
      <!-- 데스크탑 테이블 -->
      <table class="data-table desktop-only">
        <thead>
          <tr>
            <th>순서</th>
            <th>제목</th>
            <th>기관</th>
            <th>기간</th>
            <th>설명</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td>
              <div class="order-cell">
                <span>{{ item.sortOrder }}</span>
                <div class="order-btns">
                  <button @click="moveUp(item)" :disabled="isFirst(item) || saving" class="order-btn" title="위로">↑</button>
                  <button @click="moveDown(item)" :disabled="isLast(item) || saving" class="order-btn" title="아래로">↓</button>
                </div>
              </div>
            </td>
            <td>{{ item.title }}</td>
            <td>{{ item.subtitle }}</td>
            <td>{{ item.period }}</td>
            <td class="desc-cell">{{ item.description }}</td>
            <td class="actions">
              <button class="btn-edit" @click="openEdit(item)">수정</button>
              <button class="btn-delete" @click="confirmDelete(item)">삭제</button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 모바일 카드 -->
      <div class="card-list mobile-only">
        <div v-for="item in items" :key="item.id" class="card-item">
          <div class="card-top">
            <div class="card-info">
              <strong>{{ item.title }}</strong>
              <span class="card-sub">{{ item.subtitle }}</span>
            </div>
          </div>
          <p class="card-period">{{ item.period }}</p>
          <p class="card-desc">{{ item.description }}</p>
          <div class="card-actions">
            <button class="order-btn" @click="moveUp(item)" :disabled="isFirst(item) || saving" title="위로">↑</button>
            <button class="order-btn" @click="moveDown(item)" :disabled="isLast(item) || saving" title="아래로">↓</button>
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
            <h2>{{ editTarget ? '항목 수정' : '항목 추가' }}</h2>
            <button class="modal-close" @click="closeModal" aria-label="닫기">✕</button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="save">
              <div class="form-row">
                <label>제목 *</label>
                <input v-model="form.title" placeholder="멀티프레임워크기반 웹 전문 개발자" required />
              </div>
              <div class="form-row">
                <label>기관명 *</label>
                <input v-model="form.subtitle" placeholder="에이콘아카데미" required />
              </div>
              <div class="form-row">
                <label>기간 *</label>
                <input v-model="form.period" placeholder="2017.03.09 ~ 2017.09.12" required />
              </div>
              <div class="form-row">
                <label>설명</label>
                <textarea v-model="form.description" rows="3" placeholder="프론트엔드와 백엔드 전반에 걸친 웹 개발 기술을 체계적으로 학습하였습니다."></textarea>
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
            <h2>항목 삭제</h2>
            <button class="modal-close" @click="deleteTarget = null" aria-label="닫기">✕</button>
          </div>
          <div class="modal-body">
            <p><strong>{{ deleteTarget.title }}</strong> 항목을 삭제하시겠습니까?</p>
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
import { apiErrorMessage } from '@/utils/apiError'

export default {
  name: 'AdminExperience',
  data() {
    return {
      items: [],
      loading: true,
      error: '',
      showModal: false,
      editTarget: null,
      deleteTarget: null,
      saving: false,
      form: { title: '', subtitle: '', description: '', period: '', sortOrder: 0 },
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
        const res = await axios.get('/api/admin/experience')
        this.items = res.data
      } catch (e) {
        this.error = apiErrorMessage(e, '데이터를 불러오지 못했습니다.')
      } finally {
        this.loading = false
      }
    },
    openCreate() {
      this.editTarget = null
      const maxOrder = this.items.length > 0 ? Math.max(...this.items.map(i => i.sortOrder)) + 1 : 0
      this.form = { title: '', subtitle: '', description: '', period: '', sortOrder: maxOrder }
      this.showModal = true
    },
    openEdit(item) {
      this.editTarget = item
      this.form = { title: item.title || '', subtitle: item.subtitle || '', description: item.description || '', period: item.period || '', sortOrder: item.sortOrder ?? 0 }
      this.showModal = true
    },
    closeModal() {
      this.showModal = false
      this.editTarget = null
    },
    toast(message, type = 'success') {
      this.$store.dispatch('toast/showToast', { message, type })
    },
    isFirst(item) { return this.items.length === 0 || this.items[0].id === item.id },
    isLast(item) { return this.items.length === 0 || this.items[this.items.length - 1].id === item.id },
    async moveUp(item) {
      const idx = this.items.findIndex(i => i.id === item.id)
      if (idx <= 0) return
      await this.swapOrder(item, this.items[idx - 1])
    },
    async moveDown(item) {
      const idx = this.items.findIndex(i => i.id === item.id)
      if (idx < 0 || idx >= this.items.length - 1) return
      await this.swapOrder(item, this.items[idx + 1])
    },
    async swapOrder(a, b) {
      this.saving = true
      try {
        await Promise.all([
          axios.put(`/api/admin/experience/${a.id}`, { ...a, sortOrder: b.sortOrder }),
          axios.put(`/api/admin/experience/${b.id}`, { ...b, sortOrder: a.sortOrder }),
        ])
        await this.load()
      } catch (e) {
        this.toast(apiErrorMessage(e, '순서 변경에 실패했습니다.'), 'danger')
      } finally {
        this.saving = false
      }
    },
    async save() {
      const isDuplicate = this.items.some(item =>
        item.sortOrder === this.form.sortOrder &&
        (!this.editTarget || item.id !== this.editTarget.id)
      )
      if (isDuplicate) {
        this.toast(`정렬 순서 ${this.form.sortOrder}은(는) 이미 사용 중입니다.`, 'warning')
        return
      }
      this.saving = true
      const isEdit = !!this.editTarget
      try {
        if (isEdit) {
          await axios.put(`/api/admin/experience/${this.editTarget.id}`, this.form)
        } else {
          await axios.post('/api/admin/experience', this.form)
        }
        this.closeModal()
        await this.load()
        this.toast(isEdit ? '수정되었습니다.' : '추가되었습니다.')
      } catch (e) {
        this.toast(apiErrorMessage(e, '저장에 실패했습니다.'), 'danger')
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
        await axios.delete(`/api/admin/experience/${this.deleteTarget.id}`)
        this.deleteTarget = null
        await this.load()
        this.toast('삭제되었습니다.')
      } catch (e) {
        this.toast(apiErrorMessage(e, '삭제에 실패했습니다.'), 'danger')
      } finally {
        this.saving = false
      }
    },
  }
}
</script>

<style scoped>
.page-container { padding: 2rem; max-width: 1100px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; gap: 1rem; }
.page-header h1 { font-size: 1.5rem; margin: 0 0 0.25rem; }
.page-header p { margin: 0; color: #888; font-size: 0.875rem; }
.loading-state { text-align: center; padding: 3rem; color: #888; }
.error-state { text-align: center; padding: 2rem; color: #e74c3c; }
.spinner { width: 32px; height: 32px; border: 3px solid #333; border-top-color: #c9a96e; border-radius: 50%; animation: spin 0.7s linear infinite; margin: 0 auto 1rem; }
@keyframes spin { to { transform: rotate(360deg); } }
.table-wrapper { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.data-table th { background: #1a1a2e; color: #c9a96e; padding: 0.75rem 1rem; text-align: left; font-weight: 600; white-space: nowrap; }
.data-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #222; vertical-align: middle; }
.data-table tr:hover td { background: #111; }
.desc-cell { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #888; font-size: 0.8rem; }
.actions { white-space: nowrap; }

/* 모바일 카드 */
.desktop-only { display: table; }
.mobile-only { display: none; }
.card-list { display: flex; flex-direction: column; gap: 0.75rem; }
.card-item { background: #13131f; border: 1px solid #2a2a3a; border-radius: 8px; padding: 1rem; }
.card-top { margin-bottom: 0.4rem; }
.card-info strong { display: block; font-size: 0.9rem; color: #f0ece4; margin-bottom: 0.15rem; }
.card-sub { font-size: 0.75rem; color: #c9a96e; }
.card-period { font-size: 0.75rem; color: #888; margin: 0 0 0.4rem; }
.card-desc { font-size: 0.8rem; color: #888; margin: 0 0 0.75rem; line-height: 1.5; }
.card-actions { display: flex; gap: 0.5rem; }

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

.modal-body { padding: 1.25rem 1.5rem; overflow-y: auto; flex: 1; min-height: 0; }
.form-row { margin-bottom: 0.875rem; }
.form-row label { display: block; font-size: 0.78rem; color: #aaa; margin-bottom: 0.25rem; }
.form-row input, .form-row textarea { width: 100%; background: #0a0a12; border: 1px solid #333; border-radius: 6px; padding: 0.45rem 0.7rem; color: #f0ece4; font-size: 0.875rem; box-sizing: border-box; }
.form-row textarea { resize: vertical; font-family: inherit; min-height: 80px; }
.form-row input:focus, .form-row textarea:focus { outline: none; border-color: #c9a96e; }
.order-cell { display: flex; align-items: center; gap: 0.4rem; }
.order-btns { display: flex; flex-direction: column; gap: 2px; }
.order-btn { background: #1a1a2e; color: #c9a96e; border: 1px solid #333; border-radius: 3px; cursor: pointer; font-size: 0.7rem; padding: 1px 5px; line-height: 1.4; }
.order-btn:hover:not(:disabled) { background: #2a2a4e; }
.order-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.form-actions { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid #1a1a2a; }
.modal-confirm .modal-body p { color: #ccc; margin-bottom: 1rem; }

@media (max-width: 1024px) { .page-container { padding: 1.5rem; } }
@media (max-width: 768px) {
  .page-container { padding: 1rem; }
  .page-header { flex-direction: column; align-items: stretch; }
  .page-header h1 { font-size: 1.25rem; }
  .desktop-only { display: none; }
  .mobile-only { display: flex; }
}
@media (max-width: 480px) {
  .modal-body { padding: 1rem; }
}
</style>
