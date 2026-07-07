<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1>프롬프트 관리</h1>
        <p>각 AI가 어떻게 분석·답변할지 지침을 관리합니다. 개선한 지침은 저장되어 이후 분석에 그대로 사용됩니다.</p>
      </div>
    </div>

    <div
      v-if="loading"
      class="loading-state"
    >
      <div class="spinner" />
      <p>불러오는 중...</p>
    </div>
    <div
      v-else-if="error"
      class="error-state"
    >
      {{ error }}
    </div>

    <template v-else>
      <div
        v-for="(group, category) in grouped"
        :key="category"
        class="prompt-group"
      >
        <p class="group-label">
          {{ category }}
        </p>
        <div
          class="prompt-card"
          v-for="p in group"
          :key="p.key"
        >
          <div class="card-main">
            <div class="card-title-row">
              <span class="card-title">{{ p.displayName }}</span>
              <span
                v-if="p.customized"
                class="badge-customized"
              >커스텀 지침 사용 중</span>
            </div>
            <p class="card-desc">
              {{ p.description }}
            </p>
          </div>
          <button
            class="btn btn-edit"
            @click="openEditor(p)"
          >
            편집
          </button>
        </div>
      </div>
    </template>

    <!-- 편집 모달 (body로 teleport — 전역 공통 스타일 admin-modal.css 의 amodal-* 사용) -->
    <teleport to="body">
      <div
        v-if="selected"
        class="amodal-overlay"
        data-lenis-prevent
        @click.self="closeEditor"
      >
        <div class="amodal-box">
          <div class="amodal-head">
            <div>
              <h2>{{ selected.displayName }}</h2>
            </div>
            <button
              class="amodal-close"
              @click="closeEditor"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>

          <div class="amodal-body">
            <p class="amodal-desc">
              {{ selected.description }}
            </p>

            <div class="amodal-note">
              이 화면에서는 <b>지침만</b> 수정하면 됩니다.
              분석 데이터와 응답 형식(JSON)은 실행 시 시스템이 자동으로 붙입니다.
            </div>

            <p class="amodal-section-label">
              지침
            </p>
            <textarea
              ref="editor"
              v-model="editContent"
              class="amodal-textarea thin-scrollbar"
              spellcheck="false"
              placeholder="예) 당신은 ○○ 분석가입니다. 아래 데이터만 근거로 간결하게 분석하세요..."
            />

            <div
              v-if="validationError"
              class="amodal-error"
            >
              ⚠ {{ validationError }}
            </div>

            <div class="amodal-tools">
              <button
                class="amodal-btn amodal-btn-ghost"
                @click="toggleAdvanced"
              >
                {{ showAdvanced ? '고급 보기 닫기' : '고급 보기' }}
              </button>
              <span
                v-if="selected.customized"
                class="amodal-tools-note"
              >커스텀 지침 사용 중 (코드 기본값과 다름)</span>
              <span
                v-if="isDirty"
                class="amodal-tools-note"
              >저장 안 됨</span>
            </div>

            <div
              v-if="showAdvanced"
              class="amodal-preview"
            >
              <p class="amodal-preview-label">
                자동으로 붙는 데이터·응답 형식 (수정 불가) — {{ varExample }} 는 실행 시 실제 값으로 채워집니다
              </p>
              <pre class="amodal-preview-pre thin-scrollbar">{{ selected.fixedPreview }}</pre>
            </div>
          </div>

          <div class="amodal-foot">
            <button
              v-if="selected.customized"
              class="amodal-btn amodal-btn-danger"
              :disabled="saving || resetting"
              @click="resetToDefault"
            >
              {{ resetting ? '초기화 중...' : '기본값으로 초기화' }}
            </button>
            <div class="amodal-foot-right">
              <button
                class="amodal-btn amodal-btn-ghost"
                :disabled="saving"
                @click="closeEditor"
              >
                취소
              </button>
              <button
                class="amodal-btn amodal-btn-primary"
                :disabled="saving || !isDirty"
                @click="save"
              >
                {{ saving ? '저장 중...' : '저장' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script>
import axios from '@/axios'

export default {
  name: 'AdminPromptManagement',
  data() {
    return {
      prompts: [],
      loading: true,
      error: '',
      selected: null,        // 편집 중인 프롬프트
      editContent: '',       // 편집 중인 지침 텍스트
      saving: false,
      resetting: false,
      validationError: '',
      showAdvanced: false,   // 자동 데이터·응답 형식 참고 보기
      varExample: '{{변수}}',
    }
  },
  computed: {
    grouped() {
      const out = {}
      for (const p of this.prompts) {
        const c = p.category || '기타'
        if (!out[c]) out[c] = []
        out[c].push(p)
      }
      return out
    },
    isDirty() {
      if (!this.selected) return false
      return this.editContent !== (this.selected.effectiveInstruction || '')
    },
  },
  mounted() {
    this.load()
  },
  methods: {
    load() {
      this.loading = true
      this.error = ''
      axios.get('/api/admin/prompts')
        .then(res => { this.prompts = res.data })
        .catch(err => {
          if (err.response?.status === 403) {
            this.$store.dispatch('toast/showToast', { message: '접근 권한이 없습니다.', type: 'error' })
            this.$router.push('/')
          } else {
            this.error = '프롬프트를 불러오지 못했습니다.'
          }
        })
        .finally(() => { this.loading = false })
    },
    openEditor(p) {
      this.selected = p
      this.editContent = p.effectiveInstruction || ''
      this.validationError = ''
      this.showAdvanced = false
    },
    closeEditor() {
      if (this.isDirty && !window.confirm('저장하지 않은 변경사항이 있습니다. 닫으시겠습니까?')) return
      this.selected = null
      this.editContent = ''
      this.validationError = ''
      this.showAdvanced = false
    },
    toggleAdvanced() {
      this.showAdvanced = !this.showAdvanced
    },
    save() {
      this.saving = true
      this.validationError = ''
      axios.put(`/api/admin/prompts/${this.selected.key}`, { content: this.editContent })
        .then(res => {
          this.applyUpdated(res.data)
          this.$store.dispatch('toast/showToast', { message: '지침이 저장되었습니다.', type: 'success' })
          this.selected = null
        })
        .catch(err => {
          const msg = typeof err.response?.data === 'string'
            ? err.response.data
            : '저장에 실패했습니다.'
          this.validationError = msg
        })
        .finally(() => { this.saving = false })
    },
    resetToDefault() {
      if (!window.confirm('저장된 커스텀 지침을 지우고 코드 기본 지침으로 되돌립니다. 계속할까요?')) return
      this.resetting = true
      this.validationError = ''
      axios.post(`/api/admin/prompts/${this.selected.key}/reset`)
        .then(res => {
          this.applyUpdated(res.data)
          this.editContent = res.data.effectiveInstruction || ''
          this.$store.dispatch('toast/showToast', { message: '기본 지침으로 초기화되었습니다.', type: 'success' })
        })
        .catch(() => {
          this.validationError = '초기화에 실패했습니다.'
        })
        .finally(() => { this.resetting = false })
    },
    applyUpdated(updated) {
      const idx = this.prompts.findIndex(p => p.key === updated.key)
      if (idx !== -1) this.prompts.splice(idx, 1, updated)
      if (this.selected && this.selected.key === updated.key) this.selected = updated
    },
  },
}
</script>

<!-- 페이지(목록) 스타일 — scoped. 모달 스타일은 전역 admin-modal.css(amodal-*) 사용 -->
<style src="@/assets/css/pages/admin-prompt-management.css" scoped></style>
