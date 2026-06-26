<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1>포트폴리오 스킬 관리</h1>
        <p>Portfolio 섹션 스킬 카드 데이터를 관리합니다.</p>
      </div>
      <button class="btn-primary" @click="openCreate">+ 새 스킬 추가</button>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>데이터를 불러오는 중...</p>
    </div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
    <div v-else-if="skills.length === 0" class="loading-state">등록된 스킬이 없습니다.</div>

    <div v-else class="table-wrapper">
      <!-- 데스크탑 테이블 -->
      <table class="data-table desktop-only">
        <thead>
          <tr>
            <th>순서</th>
            <th>CSS 클래스</th>
            <th>제목</th>
            <th>설명 목록</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in skills" :key="item.id">
            <td>
              <div class="order-cell">
                <span>{{ item.sortOrder }}</span>
                <div class="order-btns">
                  <button @click="moveUp(item)" :disabled="isFirst(item) || saving" class="order-btn" title="위로">↑</button>
                  <button @click="moveDown(item)" :disabled="isLast(item) || saving" class="order-btn" title="아래로">↓</button>
                </div>
              </div>
            </td>
            <td><span class="class-badge">{{ item.cssClass }}</span></td>
            <td><strong>{{ item.title }}</strong></td>
            <td class="desc-cell">{{ parseDescriptions(item.descriptions).join(' / ') }}</td>
            <td class="actions">
              <button class="btn-edit" @click="openEdit(item)">수정</button>
              <button class="btn-delete" @click="confirmDelete(item)">삭제</button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 모바일 카드 -->
      <div class="card-list mobile-only">
        <div v-for="item in skills" :key="item.id" class="card-item">
          <div class="card-top">
            <span class="class-badge">{{ item.cssClass }}</span>
            <strong class="card-title">{{ item.title }}</strong>
          </div>
          <p class="card-desc">{{ parseDescriptions(item.descriptions).slice(0, 2).join(' / ') }}</p>
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
            <h2>{{ editTarget ? '스킬 수정' : '스킬 추가' }}</h2>
            <button class="modal-close" @click="closeModal" aria-label="닫기">✕</button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="save">
              <div class="form-grid">
                <div class="form-row">
                  <label>CSS 클래스 <span class="hint">(p1~p8)</span></label>
                  <select v-model="form.cssClass">
                    <option value="">-- 선택 --</option>
                    <option v-for="n in 8" :key="n" :value="'p' + n">p{{ n }}</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <label>제목 *</label>
                <input v-model="form.title" placeholder="AI / LLM" required />
              </div>
              <div class="form-row">
                <label>설명 목록 <span class="hint">(한 줄에 하나씩)</span></label>
                <textarea v-model="descriptionsText" rows="5" placeholder="Claude / OpenAI API 연동 및 활용&#10;프롬프트 엔지니어링 설계&#10;Anthropic Agent SDK 기반 개발"></textarea>
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
            <h2>스킬 삭제</h2>
            <button class="modal-close" @click="deleteTarget = null" aria-label="닫기">✕</button>
          </div>
          <div class="modal-body">
            <p><strong>{{ deleteTarget.title }}</strong> 스킬을 삭제하시겠습니까?</p>
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
import { adminPortfolioSkillApi } from '@/api/adminContent'
import { apiErrorMessage } from '@/utils/apiError'
import {
  hasDuplicateSortOrder,
  linesToJsonArray,
  nextSortOrder,
  parseJsonArray,
} from '@/utils/resourceForm'

export default {
  name: 'AdminPortfolioSkill',
  data() {
    return {
      skills: [],
      loading: true,
      error: '',
      showModal: false,
      editTarget: null,
      deleteTarget: null,
      saving: false,
      form: { cssClass: '', title: '', sortOrder: 0 },
      descriptionsText: '',
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
        const res = await adminPortfolioSkillApi.list()
        this.skills = res.data
      } catch (e) {
        this.error = apiErrorMessage(e, '데이터를 불러오지 못했습니다.')
      } finally {
        this.loading = false
      }
    },
    parseDescriptions(json) {
      return parseJsonArray(json)
    },
    openCreate() {
      this.editTarget = null
      const maxOrder = nextSortOrder(this.skills)
      this.form = { cssClass: 'p' + (this.skills.length + 1), title: '', sortOrder: maxOrder }
      this.descriptionsText = ''
      this.showModal = true
    },
    openEdit(item) {
      this.editTarget = item
      this.form = { cssClass: item.cssClass || '', title: item.title || '', sortOrder: item.sortOrder ?? 0 }
      this.descriptionsText = this.parseDescriptions(item.descriptions).join('\n')
      this.showModal = true
    },
    closeModal() {
      this.showModal = false
      this.editTarget = null
    },
    toast(message, type = 'success') {
      this.$store.dispatch('toast/showToast', { message, type })
    },
    isFirst(item) { return this.skills.length === 0 || this.skills[0].id === item.id },
    isLast(item) { return this.skills.length === 0 || this.skills[this.skills.length - 1].id === item.id },
    async moveUp(item) {
      const idx = this.skills.findIndex(s => s.id === item.id)
      if (idx <= 0) return
      await this.swapOrder(item, this.skills[idx - 1])
    },
    async moveDown(item) {
      const idx = this.skills.findIndex(s => s.id === item.id)
      if (idx < 0 || idx >= this.skills.length - 1) return
      await this.swapOrder(item, this.skills[idx + 1])
    },
    async swapOrder(a, b) {
      this.saving = true
      try {
        await adminPortfolioSkillApi.swapOrder(a, b)
        await this.load()
      } catch (e) {
        this.toast(apiErrorMessage(e, '순서 변경에 실패했습니다.'), 'danger')
      } finally {
        this.saving = false
      }
    },
    async save() {
      const isDuplicate = hasDuplicateSortOrder(this.skills, this.form.sortOrder, this.editTarget?.id)
      if (isDuplicate) {
        this.toast(`정렬 순서 ${this.form.sortOrder}은(는) 이미 사용 중입니다.`, 'warning')
        return
      }
      this.saving = true
      const isEdit = !!this.editTarget
      try {
        const descriptions = linesToJsonArray(this.descriptionsText)
        const payload = { ...this.form, descriptions }
        if (isEdit) {
          await adminPortfolioSkillApi.update(this.editTarget.id, payload)
        } else {
          await adminPortfolioSkillApi.create(payload)
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
        await adminPortfolioSkillApi.remove(this.deleteTarget.id)
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

<style src="@/assets/css/pages/admin-portfolio-skill.css" scoped></style>
