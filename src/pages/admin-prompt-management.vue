<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1>프롬프트 관리</h1>
        <p>주식·여행·부동산·포트폴리오·일기 AI가 사용하는 프롬프트를 직접 수정합니다. 저장하지 않으면 코드의 기본 프롬프트로 동작합니다.</p>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>불러오는 중...</p>
    </div>
    <div v-else-if="error" class="error-state">{{ error }}</div>

    <template v-else>
      <div v-for="(group, category) in grouped" :key="category" class="prompt-group">
        <p class="group-label">{{ category }}</p>
        <div class="prompt-card" v-for="p in group" :key="p.key">
          <div class="card-main">
            <div class="card-title-row">
              <span class="card-title">{{ p.displayName }}</span>
              <span class="badge" :class="p.customized ? 'badge-custom' : 'badge-default'">
                {{ p.customized ? '커스텀 적용 중' : '기본값 사용 중' }}
              </span>
            </div>
            <p class="card-desc">{{ p.description }}</p>
          </div>
          <button class="btn btn-edit" @click="openEditor(p)">편집</button>
        </div>
      </div>
    </template>

    <!-- 편집 모달 (body로 teleport — 전역 공통 스타일 admin-modal.css 의 amodal-* 사용) -->
    <teleport to="body">
      <div v-if="selected" class="amodal-overlay" data-lenis-prevent @click.self="closeEditor">
        <div class="amodal-box">
          <div class="amodal-head">
            <div>
              <h2>{{ selected.displayName }}</h2>
              <span class="amodal-badge" :class="selected.customized ? 'amodal-badge-on' : 'amodal-badge-off'">
                {{ selected.customized ? '커스텀 적용 중' : '기본값 사용 중' }}
              </span>
            </div>
            <button class="amodal-close" @click="closeEditor" aria-label="닫기">✕</button>
          </div>

          <div class="amodal-body">
            <p class="amodal-desc">{{ selected.description }}</p>

            <div class="amodal-section">
              <p class="amodal-section-label">사용 가능한 변수 <span class="amodal-hint">(클릭하면 커서 위치에 삽입)</span></p>
              <div class="amodal-chips">
                <button
                  v-for="v in selected.variables"
                  :key="v.name"
                  class="amodal-chip"
                  :title="v.description"
                  @click="insertVariable(v.name)"
                >{{ varToken(v.name) }}</button>
              </div>
            </div>

            <textarea
              ref="editor"
              v-model="editContent"
              class="amodal-textarea thin-scrollbar"
              spellcheck="false"
              placeholder="프롬프트 내용을 입력하세요"
            ></textarea>

            <div v-if="validationError" class="amodal-error">⚠ {{ validationError }}</div>

            <div class="amodal-tools">
              <button class="amodal-btn amodal-btn-ghost" @click="toggleDefault">
                {{ showDefault ? '기본값 닫기' : '기본값 보기' }}
              </button>
              <span v-if="isDirty" class="amodal-tools-note">저장하지 않은 변경사항</span>
            </div>

            <div v-if="showDefault" class="amodal-preview">
              <p class="amodal-preview-label">코드 기본 프롬프트</p>
              <pre class="amodal-preview-pre thin-scrollbar">{{ selected.defaultTemplate }}</pre>
            </div>
          </div>

          <div class="amodal-foot">
            <button
              class="amodal-btn amodal-btn-danger"
              :disabled="saving || !selected.customized"
              @click="resetToDefault"
              title="커스텀을 지우고 코드 기본값으로 되돌립니다"
            >기본값으로 되돌리기</button>
            <div class="amodal-foot-right">
              <button class="amodal-btn amodal-btn-ghost" :disabled="saving" @click="closeEditor">취소</button>
              <button class="amodal-btn amodal-btn-primary" :disabled="saving || !isDirty" @click="save">
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
      editContent: '',
      saving: false,
      validationError: '',
      showDefault: false,
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
      const baseline = this.selected.effectiveContent || ''
      return this.editContent !== baseline
    },
  },
  mounted() {
    this.load()
  },
  methods: {
    varToken(name) {
      return '{{' + name + '}}'
    },
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
      this.editContent = p.effectiveContent || ''
      this.validationError = ''
      this.showDefault = false
    },
    closeEditor() {
      if (this.isDirty && !window.confirm('저장하지 않은 변경사항이 있습니다. 닫으시겠습니까?')) return
      this.selected = null
      this.editContent = ''
      this.validationError = ''
      this.showDefault = false
    },
    toggleDefault() {
      this.showDefault = !this.showDefault
    },
    insertVariable(name) {
      const token = '{{' + name + '}}'
      const el = this.$refs.editor
      if (!el || el.selectionStart == null) {
        this.editContent += token
        return
      }
      const start = el.selectionStart
      const end = el.selectionEnd
      this.editContent = this.editContent.slice(0, start) + token + this.editContent.slice(end)
      this.$nextTick(() => {
        const pos = start + token.length
        el.focus()
        el.setSelectionRange(pos, pos)
      })
    },
    save() {
      this.saving = true
      this.validationError = ''
      axios.put(`/api/admin/prompts/${this.selected.key}`, { content: this.editContent })
        .then(res => {
          this.applyUpdated(res.data)
          this.$store.dispatch('toast/showToast', { message: '프롬프트가 저장되었습니다.', type: 'success' })
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
      if (!window.confirm('커스텀 프롬프트를 지우고 코드 기본값으로 되돌립니다. 계속할까요?')) return
      this.saving = true
      this.validationError = ''
      axios.post(`/api/admin/prompts/${this.selected.key}/reset`)
        .then(res => {
          this.applyUpdated(res.data)
          this.$store.dispatch('toast/showToast', { message: '기본값으로 되돌렸습니다.', type: 'success' })
          this.editContent = res.data.effectiveContent || ''
        })
        .catch(() => {
          this.$store.dispatch('toast/showToast', { message: '되돌리기에 실패했습니다.', type: 'error' })
        })
        .finally(() => { this.saving = false })
    },
    applyUpdated(updated) {
      const idx = this.prompts.findIndex(p => p.key === updated.key)
      if (idx !== -1) this.prompts.splice(idx, 1, updated)
      if (this.selected && this.selected.key === updated.key) this.selected = updated
    },
  },
}
</script>

<!-- 페이지(목록) 스타일 — scoped -->
<style scoped>
.page-container {
  max-width: 960px;
  margin: 2rem auto;
  padding: 0 1rem;
}

.page-header {
  margin-bottom: 1.5rem;
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.3rem;
}

.page-header p {
  color: #888;
  font-size: 0.9rem;
  margin: 0;
  line-height: 1.5;
}

.loading-state {
  text-align: center;
  padding: 2rem;
  color: #888;
}

.error-state {
  color: #e57373;
  text-align: center;
  padding: 2rem;
}

.prompt-group {
  margin-bottom: 1.75rem;
}

.group-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #7c6fff;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0 0 0.6rem;
}

.prompt-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.9rem 1rem;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  margin-bottom: 0.6rem;
  background: rgba(255, 255, 255, 0.02);
}

.card-main {
  flex: 1;
  min-width: 0;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.card-title {
  font-size: 0.98rem;
  font-weight: 600;
}

.card-desc {
  color: #888;
  font-size: 0.82rem;
  margin: 0.3rem 0 0;
  line-height: 1.5;
}

.badge {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  white-space: nowrap;
}

.badge-custom {
  color: #7c6fff;
  background: rgba(124, 111, 255, 0.14);
}

.badge-default {
  color: #888;
  background: rgba(255, 255, 255, 0.06);
}

.btn-edit {
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.5rem 0.9rem;
  background: #2a2a2a;
  color: #ddd;
  white-space: nowrap;
  transition: background 0.15s;
}

.btn-edit:hover {
  background: #383838;
}

@media (max-width: 640px) {
  .prompt-card {
    flex-direction: column;
    align-items: stretch;
  }
  .btn-edit {
    width: 100%;
  }
}
</style>
