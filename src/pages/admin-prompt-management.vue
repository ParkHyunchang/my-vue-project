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

    <!-- 편집 모달 (body로 teleport — 전역 스타일 pm-* 사용) -->
    <teleport to="body">
      <div v-if="selected" class="pm-overlay" data-lenis-prevent @click.self="closeEditor">
        <div class="pm-box">
          <div class="pm-head">
            <div>
              <h2>{{ selected.displayName }}</h2>
              <span class="pm-badge" :class="selected.customized ? 'pm-badge-on' : 'pm-badge-off'">
                {{ selected.customized ? '커스텀 적용 중' : '기본값 사용 중' }}
              </span>
            </div>
            <button class="pm-close" @click="closeEditor" aria-label="닫기">✕</button>
          </div>

          <div class="pm-body">
            <p class="pm-desc">{{ selected.description }}</p>

            <div class="pm-vars">
              <p class="pm-vars-label">사용 가능한 변수 <span class="pm-vars-hint">(클릭하면 커서 위치에 삽입)</span></p>
              <div class="pm-chips">
                <button
                  v-for="v in selected.variables"
                  :key="v.name"
                  class="pm-chip"
                  :title="v.description"
                  @click="insertVariable(v.name)"
                >{{ varToken(v.name) }}</button>
              </div>
            </div>

            <textarea
              ref="editor"
              v-model="editContent"
              class="pm-textarea"
              spellcheck="false"
              placeholder="프롬프트 내용을 입력하세요"
            ></textarea>

            <div v-if="validationError" class="pm-error">⚠ {{ validationError }}</div>

            <div class="pm-tools">
              <button class="pm-btn pm-ghost" @click="toggleDefault">
                {{ showDefault ? '기본값 닫기' : '기본값 보기' }}
              </button>
              <span v-if="isDirty" class="pm-dirty">저장하지 않은 변경사항</span>
            </div>

            <div v-if="showDefault" class="pm-default">
              <p class="pm-default-label">코드 기본 프롬프트</p>
              <pre class="pm-default-pre">{{ selected.defaultTemplate }}</pre>
            </div>
          </div>

          <div class="pm-foot">
            <button
              class="pm-btn pm-reset"
              :disabled="saving || !selected.customized"
              @click="resetToDefault"
              title="커스텀을 지우고 코드 기본값으로 되돌립니다"
            >기본값으로 되돌리기</button>
            <div class="pm-foot-right">
              <button class="pm-btn pm-ghost" :disabled="saving" @click="closeEditor">취소</button>
              <button class="pm-btn pm-save" :disabled="saving || !isDirty" @click="save">
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

<!-- 모달 스타일 — teleport 대상이라 전역(non-scoped)으로 둠. pm- 접두사로 충돌 방지 -->
<style>
.pm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  overflow: hidden;
  box-sizing: border-box;
  z-index: 10001;
}

.pm-box {
  background: #16161f;
  border: 1px solid #2f2f3d;
  border-radius: 14px;
  width: 100%;
  max-width: 720px;
  height: min(82vh, 780px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.5);
}

.pm-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.1rem 1.25rem;
  border-bottom: 1px solid #2a2a36;
  flex-shrink: 0;
}

.pm-head h2 {
  font-size: 1.12rem;
  font-weight: 600;
  color: #f0ece4;
  margin: 0 0.6rem 0 0;
  display: inline;
}

.pm-close {
  background: none;
  border: none;
  color: #888;
  font-size: 1.15rem;
  cursor: pointer;
  padding: 0.2rem 0.45rem;
  border-radius: 6px;
  line-height: 1;
}

.pm-close:hover {
  color: #f0ece4;
  background: #2a2a36;
}

.pm-badge {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  white-space: nowrap;
}

.pm-badge-on {
  color: #9d92ff;
  background: rgba(124, 111, 255, 0.16);
}

.pm-badge-off {
  color: #999;
  background: rgba(255, 255, 255, 0.07);
}

.pm-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 1rem 1.25rem;
  overflow: hidden;
}

.pm-desc {
  color: #999;
  font-size: 0.83rem;
  margin: 0 0 0.9rem;
  line-height: 1.5;
  flex-shrink: 0;
}

.pm-vars {
  margin-bottom: 0.75rem;
  flex-shrink: 0;
}

.pm-vars-label {
  font-size: 0.78rem;
  color: #aaa;
  margin: 0 0 0.5rem;
}

.pm-vars-hint {
  color: #666;
  font-weight: 400;
}

.pm-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.pm-chip {
  font-family: monospace;
  font-size: 0.78rem;
  color: #9d92ff;
  background: rgba(124, 111, 255, 0.1);
  border: 1px solid rgba(124, 111, 255, 0.25);
  border-radius: 6px;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  transition: background 0.15s;
}

.pm-chip:hover {
  background: rgba(124, 111, 255, 0.22);
}

.pm-textarea {
  flex: 1 1 auto;
  width: 100%;
  min-height: 120px;
  resize: none;
  background: #0e0e15;
  border: 1px solid #2f2f3d;
  border-radius: 10px;
  color: #ddd;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 0.82rem;
  line-height: 1.6;
  padding: 0.8rem;
  box-sizing: border-box;
  overflow: auto;
}

.pm-textarea:focus {
  outline: none;
  border-color: #7c6fff;
}

.pm-error {
  color: #ffab91;
  background: rgba(255, 112, 67, 0.1);
  border: 1px solid rgba(255, 112, 67, 0.3);
  border-radius: 8px;
  padding: 0.55rem 0.7rem;
  font-size: 0.82rem;
  margin-top: 0.6rem;
  line-height: 1.5;
  flex-shrink: 0;
}

.pm-tools {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-top: 0.7rem;
  flex-shrink: 0;
}

.pm-dirty {
  font-size: 0.76rem;
  color: #c9a227;
}

.pm-default {
  margin-top: 0.7rem;
  border: 1px solid #2a2a36;
  border-radius: 8px;
  overflow: hidden;
  flex: 0 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.pm-default-label {
  margin: 0;
  padding: 0.45rem 0.7rem;
  font-size: 0.76rem;
  color: #888;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid #2a2a36;
  flex-shrink: 0;
}

.pm-default-pre {
  margin: 0;
  padding: 0.7rem;
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  font-size: 0.78rem;
  line-height: 1.55;
  color: #aaa;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 얇은 커스텀 스크롤바 (모달 내부) */
.pm-textarea,
.pm-default-pre {
  scrollbar-width: thin;
  scrollbar-color: #3a3a48 transparent;
}
.pm-textarea::-webkit-scrollbar,
.pm-default-pre::-webkit-scrollbar {
  width: 8px;
}
.pm-textarea::-webkit-scrollbar-thumb,
.pm-default-pre::-webkit-scrollbar-thumb {
  background: #3a3a48;
  border-radius: 8px;
  border: 2px solid transparent;
  background-clip: content-box;
}
.pm-textarea::-webkit-scrollbar-thumb:hover,
.pm-default-pre::-webkit-scrollbar-thumb:hover {
  background: #4a4a5a;
  background-clip: content-box;
}
.pm-textarea::-webkit-scrollbar-track,
.pm-default-pre::-webkit-scrollbar-track {
  background: transparent;
}

.pm-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.9rem 1.25rem;
  border-top: 1px solid #2a2a36;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.pm-foot-right {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
}

.pm-btn {
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.5rem 0.9rem;
  transition: background 0.15s, opacity 0.15s;
}

.pm-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.pm-ghost {
  background: transparent;
  color: #aaa;
  border: 1px solid #383844;
}

.pm-ghost:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.04);
}

.pm-reset {
  background: transparent;
  color: #e57373;
  border: 1px solid rgba(229, 115, 115, 0.4);
}

.pm-reset:hover:not(:disabled) {
  background: rgba(229, 115, 115, 0.1);
}

.pm-save {
  background: #7c6fff;
  color: #fff;
}

.pm-save:hover:not(:disabled) {
  background: #6a5df0;
}

@media (max-width: 640px) {
  .pm-overlay {
    padding: 0.75rem 0.6rem;
  }
  .pm-box {
    height: calc(100vh - 1.5rem);
  }
}
</style>
