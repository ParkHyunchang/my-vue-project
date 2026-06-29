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
import { adminExperienceApi } from '@/api/adminContentApi'
import { apiErrorMessage } from '@/utils/apiError'
import { hasDuplicateSortOrder, nextSortOrder } from '@/utils/resourceForm'

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
        const res = await adminExperienceApi.list()
        this.items = res.data
      } catch (e) {
        this.error = apiErrorMessage(e, '데이터를 불러오지 못했습니다.')
      } finally {
        this.loading = false
      }
    },
    openCreate() {
      this.editTarget = null
      const maxOrder = nextSortOrder(this.items)
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
        await adminExperienceApi.swapOrder(a, b)
        await this.load()
      } catch (e) {
        this.toast(apiErrorMessage(e, '순서 변경에 실패했습니다.'), 'danger')
      } finally {
        this.saving = false
      }
    },
    async save() {
      const isDuplicate = hasDuplicateSortOrder(this.items, this.form.sortOrder, this.editTarget?.id)
      if (isDuplicate) {
        this.toast(`정렬 순서 ${this.form.sortOrder}은(는) 이미 사용 중입니다.`, 'warning')
        return
      }
      this.saving = true
      const isEdit = !!this.editTarget
      try {
        if (isEdit) {
          await adminExperienceApi.update(this.editTarget.id, this.form)
        } else {
          await adminExperienceApi.create(this.form)
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
        await adminExperienceApi.remove(this.deleteTarget.id)
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

<style src="@/assets/css/pages/admin-experience.css" scoped></style>
