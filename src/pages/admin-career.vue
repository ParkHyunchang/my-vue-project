<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1>경력 관리</h1>
        <p>Career &amp; Projects 섹션 데이터를 관리합니다.</p>
      </div>
      <button
        class="btn-primary"
        @click="openCreate"
      >
        + 새 경력 추가
      </button>
    </div>

    <div
      v-if="loading"
      class="loading-state"
    >
      <div class="spinner" />
      <p>데이터를 불러오는 중...</p>
    </div>
    <div
      v-else-if="error"
      class="error-state"
    >
      {{ error }}
    </div>
    <div
      v-else-if="careers.length === 0"
      class="loading-state"
    >
      등록된 경력이 없습니다.
    </div>

    <div
      v-else
      class="table-wrapper"
    >
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
            <th />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in careers"
            :key="item.id"
          >
            <td>
              <div class="order-cell">
                <span>{{ item.sortOrder }}</span>
                <div class="order-btns">
                  <button
                    @click="moveUp(item)"
                    :disabled="isFirst(item) || saving"
                    class="order-btn"
                    title="위로"
                  >
                    ↑
                  </button>
                  <button
                    @click="moveDown(item)"
                    :disabled="isLast(item) || saving"
                    class="order-btn"
                    title="아래로"
                  >
                    ↓
                  </button>
                </div>
              </div>
            </td>
            <td><span class="icon-badge">{{ item.icon }}</span></td>
            <td>{{ item.company }}</td>
            <td>{{ item.period }}</td>
            <td>{{ item.badge || '-' }}</td>
            <td class="role-cell">
              {{ item.roleDesc }}
            </td>
            <td class="actions">
              <button
                class="btn-edit"
                @click="openEdit(item)"
              >
                수정
              </button>
              <button
                class="btn-delete"
                @click="confirmDelete(item)"
              >
                삭제
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 모바일 카드 -->
      <div class="card-list mobile-only">
        <div
          v-for="item in careers"
          :key="item.id"
          class="card-item"
        >
          <div class="card-top">
            <span class="icon-badge">{{ item.icon }}</span>
            <div class="card-info">
              <strong>{{ item.company }}</strong>
              <span class="card-period">{{ item.period }}</span>
            </div>
            <span
              v-if="item.badge"
              class="badge-tag"
            >{{ item.badge }}</span>
          </div>
          <p class="card-role">
            {{ item.roleDesc }}
          </p>
          <div class="card-actions">
            <button
              class="order-btn"
              @click="moveUp(item)"
              :disabled="isFirst(item) || saving"
              title="위로"
            >
              ↑
            </button>
            <button
              class="order-btn"
              @click="moveDown(item)"
              :disabled="isLast(item) || saving"
              title="아래로"
            >
              ↓
            </button>
            <button
              class="btn-edit"
              @click="openEdit(item)"
            >
              수정
            </button>
            <button
              class="btn-delete"
              @click="confirmDelete(item)"
            >
              삭제
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 모달 -->
    <Teleport to="body">
      <div
        v-if="showModal"
        class="modal-overlay"
        @click.self="closeModal"
      >
        <div class="modal-box">
          <div class="modal-header">
            <h2>{{ editTarget ? '경력 수정' : '경력 추가' }}</h2>
            <button
              class="modal-close"
              @click="closeModal"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="save">
              <div class="form-grid">
                <div class="form-row">
                  <label>아이콘 <span class="hint">(예: AI, NLP, SEC)</span></label>
                  <input
                    v-model="form.icon"
                    placeholder="AI"
                    maxlength="10"
                    required
                  >
                </div>
                <div class="form-row">
                  <label>배지 <span class="hint">(재직중이면 입력)</span></label>
                  <input
                    v-model="form.badge"
                    placeholder="재직중"
                  >
                </div>
              </div>
              <div class="form-row">
                <label>회사명 *</label>
                <input
                  v-model="form.company"
                  placeholder="(주)회사명"
                  required
                >
              </div>
              <div class="form-row">
                <label>기간 *</label>
                <input
                  v-model="form.period"
                  placeholder="2025.04 ~ 재직중"
                  required
                >
              </div>
              <div class="form-row">
                <label>역할 설명 *</label>
                <input
                  v-model="form.roleDesc"
                  placeholder="LLM 개발운영 — 대규모 언어 모델 프로젝트"
                  required
                >
              </div>
              <div class="form-row">
                <label>프로젝트 목록 <span class="hint">(한 줄에 하나씩)</span></label>
                <textarea
                  v-model="projectsText"
                  rows="3"
                  placeholder="SKT — LLM 서비스 개발 및 운영&#10;H사 — 대규모 언어 모델 개발"
                />
              </div>
              <div class="form-row">
                <label>기술 태그 <span class="hint">(쉼표로 구분)</span></label>
                <input
                  v-model="tagsText"
                  placeholder="Python, LLM, Spring Boot, Docker"
                >
              </div>
              <div class="form-actions">
                <button
                  type="button"
                  class="btn-cancel"
                  @click="closeModal"
                >
                  취소
                </button>
                <button
                  type="submit"
                  class="btn-primary"
                  :disabled="saving"
                >
                  {{ saving ? '저장 중...' : '저장' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 삭제 확인 -->
    <Teleport to="body">
      <div
        v-if="deleteTarget"
        class="modal-overlay"
        @click.self="deleteTarget = null"
      >
        <div class="modal-box modal-confirm">
          <div class="modal-header">
            <h2>경력 삭제</h2>
            <button
              class="modal-close"
              @click="deleteTarget = null"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>
          <div class="modal-body">
            <p><strong>{{ deleteTarget.company }}</strong> 경력을 삭제하시겠습니까?</p>
            <div class="form-actions">
              <button
                class="btn-cancel"
                @click="deleteTarget = null"
              >
                취소
              </button>
              <button
                class="btn-delete"
                :disabled="saving"
                @click="doDelete"
              >
                {{ saving ? '삭제 중...' : '삭제' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
import { adminCareerApi } from '@/api/adminContentApi'
import { apiErrorMessage } from '@/utils/apiError'
import {
  csvToJsonArray,
  hasDuplicateSortOrder,
  linesToJsonArray,
  nextSortOrder,
  parseJsonArray,
} from '@/utils/resourceForm'

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
        const res = await adminCareerApi.list()
        this.careers = res.data
      } catch (e) {
        this.error = apiErrorMessage(e, '데이터를 불러오지 못했습니다.')
      } finally {
        this.loading = false
      }
    },
    openCreate() {
      this.editTarget = null
      const maxOrder = nextSortOrder(this.careers)
      this.form = { icon: '', company: '', period: '', badge: '', roleDesc: '', sortOrder: maxOrder }
      this.projectsText = ''
      this.tagsText = ''
      this.showModal = true
    },
    openEdit(item) {
      this.editTarget = item
      this.form = { icon: item.icon || '', company: item.company || '', period: item.period || '', badge: item.badge || '', roleDesc: item.roleDesc || '', sortOrder: item.sortOrder ?? 0 }
      this.projectsText = parseJsonArray(item.projects).join('\n')
      this.tagsText = parseJsonArray(item.tags).join(', ')
      this.showModal = true
    },
    closeModal() {
      this.showModal = false
      this.editTarget = null
    },
    toast(message, type = 'success') {
      this.$store.dispatch('toast/showToast', { message, type })
    },
    isFirst(item) { return this.careers.length === 0 || this.careers[0].id === item.id },
    isLast(item) { return this.careers.length === 0 || this.careers[this.careers.length - 1].id === item.id },
    async moveUp(item) {
      const idx = this.careers.findIndex(c => c.id === item.id)
      if (idx <= 0) return
      await this.swapOrder(item, this.careers[idx - 1])
    },
    async moveDown(item) {
      const idx = this.careers.findIndex(c => c.id === item.id)
      if (idx < 0 || idx >= this.careers.length - 1) return
      await this.swapOrder(item, this.careers[idx + 1])
    },
    async swapOrder(a, b) {
      this.saving = true
      try {
        await adminCareerApi.swapOrder(a, b)
        await this.load()
      } catch (e) {
        this.toast(apiErrorMessage(e, '순서 변경에 실패했습니다.'), 'danger')
      } finally {
        this.saving = false
      }
    },
    async save() {
      const isDuplicate = hasDuplicateSortOrder(this.careers, this.form.sortOrder, this.editTarget?.id)
      if (isDuplicate) {
        this.toast(`정렬 순서 ${this.form.sortOrder}은(는) 이미 사용 중입니다.`, 'warning')
        return
      }
      this.saving = true
      const isEdit = !!this.editTarget
      try {
        const projects = linesToJsonArray(this.projectsText)
        const tags = csvToJsonArray(this.tagsText)
        const payload = { ...this.form, projects, tags }
        if (isEdit) {
          await adminCareerApi.update(this.editTarget.id, payload)
        } else {
          await adminCareerApi.create(payload)
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
        await adminCareerApi.remove(this.deleteTarget.id)
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

<style src="@/assets/css/pages/admin-career.css" scoped></style>
