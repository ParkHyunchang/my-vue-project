<template>
  <div class="diary-page">

    <!-- 모바일 사이드바 백드롭 -->
    <div
      v-if="sidebarOpen"
      class="sidebar-backdrop"
      @click="sidebarOpen = false"
    ></div>

    <!-- 좌측: 일기 목록 사이드바 -->
    <aside class="diary-sidebar" :class="{ 'sidebar--open': sidebarOpen }">
      <div class="sidebar-header">
        <h3>내 일기</h3>
        <button class="new-entry-btn" @click="selectDate(today)">+ 오늘 쓰기</button>
      </div>
      <div class="entry-list">
        <div
          v-for="entry in entries"
          :key="entry.id"
          class="entry-item"
          :class="{ active: selectedEntry && selectedEntry.id === entry.id }"
          @click="openEntry(entry)"
        >
          <span class="entry-mood">{{ parsedMood(entry) }}</span>
          <div class="entry-meta">
            <span class="entry-date">{{ formatDate(entry.diaryDate) }}</span>
            <span class="entry-preview">{{ previewText(entry.content) }}</span>
          </div>
        </div>
        <div v-if="entries.length === 0 && !loading" class="entry-empty">
          첫 일기를 작성해보세요
        </div>
      </div>
    </aside>

    <!-- 우측: 메인 영역 -->
    <div class="diary-main">
      <!-- 헤더 -->
      <div class="diary-header">
        <button class="sidebar-toggle" @click.stop="sidebarOpen = !sidebarOpen">☰</button>
        <div class="diary-header-text">
          <h2>AI 일기</h2>
          <p>오늘의 하루를 기록하고 AI의 감정 분석을 받아보세요</p>
        </div>
        <button
          class="btn-insights"
          @click="showInsights = true"
          :disabled="!entries.length"
          :title="!entries.length ? '먼저 일기를 작성해주세요' : '월별 추이 · 키워드 · 검색'"
        >
          📊 인사이트
        </button>
      </div>

      <!-- 2컬럼 콘텐츠 -->
      <div class="diary-content">

        <!-- 왼쪽: 에디터 -->
        <div class="editor-col">
          <div class="date-bar">
            <button class="date-nav" @click="moveDateBy(-1)">‹</button>
            <input type="date" v-model="selectedDate" class="date-input" @change="onDateChange" />
            <button class="date-nav" @click="moveDateBy(1)">›</button>
          </div>
          <div class="editor-area">
            <textarea
              v-model="content"
              class="diary-textarea"
              placeholder="오늘 하루 어땠나요? 자유롭게 적어보세요..."
              :disabled="saving"
              ref="diaryTextarea"
              @wheel.prevent="onTextareaWheel"
            ></textarea>
            <div class="editor-actions">
              <button class="btn-save" @click="saveDiary" :disabled="saving || !content.trim()">
                {{ saving ? '저장 중...' : '저장' }}
              </button>
              <button
                class="btn-analyze"
                @click="analyzeDiary"
                :disabled="analyzing || !selectedEntry"
                :title="!selectedEntry ? '먼저 저장하세요' : ''"
              >
                {{ analyzing ? 'AI 분석 중...' : '✨ AI 분석' }}
              </button>
              <button v-if="selectedEntry" class="btn-delete" @click="deleteDiary">
                삭제
              </button>
            </div>
          </div>
        </div>

        <!-- 오른쪽: AI 분석 패널 -->
        <div class="analysis-col">
          <transition name="fade" mode="out-in">
            <!-- 분석 결과 -->
            <div v-if="analysis" key="result" class="analysis-card">
              <div class="analysis-header">
                <span class="analysis-mood">{{ analysis.mood }}</span>
                <div class="mood-bar">
                  <div class="mood-fill" :style="{ width: (analysis.moodScore * 10) + '%' }"></div>
                </div>
                <span class="mood-score">{{ analysis.moodScore }}/10</span>
              </div>
              <p class="analysis-summary">{{ analysis.summary }}</p>
              <div class="analysis-keywords">
                <span v-for="kw in analysis.keywords" :key="kw" class="keyword-tag">#{{ kw }}</span>
              </div>
              <div class="analysis-comment">
                <span class="comment-icon">💬</span>
                <p>{{ analysis.comment }}</p>
              </div>
            </div>

            <!-- 분석 중 -->
            <div v-else-if="analyzing" key="loading" class="analysis-placeholder">
              <div class="placeholder-spinner"></div>
              <p>AI가 일기를 분석하고 있어요...</p>
            </div>

            <!-- 빈 상태 -->
            <div v-else key="empty" class="analysis-placeholder">
              <span class="placeholder-icon">✨</span>
              <p>일기를 저장한 뒤<br><strong>AI 분석</strong> 버튼을 눌러보세요</p>
              <p class="placeholder-hint">감정 분석 · 키워드 · 따뜻한 한마디</p>
            </div>
          </transition>
        </div>

      </div>
    </div>

    <teleport to="#modal">
      <DiaryInsightsModal
        v-if="showInsights"
        :entries="entries"
        @close="showInsights = false"
        @select="onSelectFromInsights"
      />
    </teleport>
  </div>
</template>

<script>
import axios from '@/axios'
import { apiErrorMessage } from '@/utils/apiError'
import DiaryInsightsModal from '@/components/diary/DiaryInsightsModal.vue'

export default {
  name: 'DiaryPage',
  components: { DiaryInsightsModal },
  data() {
    return {
      entries: [],
      selectedDate: new Date().toISOString().split('T')[0],
      selectedEntry: null,
      content: '',
      analysis: null,
      loading: false,
      saving: false,
      analyzing: false,
      sidebarOpen: false,
      showInsights: false,
    }
  },
  computed: {
    today() {
      return new Date().toISOString().split('T')[0]
    },
  },
  mounted() {
    this.loadEntries()
  },
  methods: {
    async loadEntries() {
      this.loading = true
      try {
        const res = await axios.get('/api/diary')
        this.entries = res.data
        const todayEntry = this.entries.find(e => e.diaryDate === this.selectedDate)
        if (todayEntry) this.openEntry(todayEntry)
      } catch {
        // 로드 실패 시 빈 목록 유지
      } finally {
        this.loading = false
      }
    },

    openEntry(entry) {
      this.selectedEntry = entry
      this.selectedDate = entry.diaryDate
      this.content = entry.content
      this.analysis = this.parseAnalysis(entry.aiAnalysis)
      this.sidebarOpen = false
    },

    selectDate(date) {
      this.selectedDate = date
      this.onDateChange()
      this.sidebarOpen = false
    },

    async onDateChange() {
      const entry = this.entries.find(e => e.diaryDate === this.selectedDate)
      if (entry) {
        this.openEntry(entry)
      } else {
        this.selectedEntry = null
        this.content = ''
        this.analysis = null
      }
    },

    moveDateBy(days) {
      const d = new Date(this.selectedDate)
      d.setDate(d.getDate() + days)
      this.selectedDate = d.toISOString().split('T')[0]
      this.onDateChange()
    },

    async saveDiary() {
      if (!this.content.trim()) return
      this.saving = true
      try {
        await axios.post('/api/diary', {
          diaryDate: this.selectedDate,
          content: this.content,
        })
        await this.loadEntries()
        this.selectedEntry = null
        this.content = ''
        this.analysis = null
        this.selectedDate = this.today
        this.$store.dispatch('toast/showToast', { message: '일기가 저장되었습니다.', type: 'success' })
      } catch (err) {
        this.$store.dispatch('toast/showToast', { message: apiErrorMessage(err, '저장에 실패했습니다.'), type: 'error' })
      } finally {
        this.saving = false
      }
    },

    async analyzeDiary() {
      if (!this.selectedEntry) return
      this.analyzing = true
      this.analysis = null
      try {
        const res = await axios.post(`/api/diary/${this.selectedEntry.id}/analyze`)
        this.selectedEntry = res.data
        this.analysis = this.parseAnalysis(res.data.aiAnalysis)
        const idx = this.entries.findIndex(e => e.id === res.data.id)
        if (idx !== -1) this.entries.splice(idx, 1, res.data)
      } catch (err) {
        this.$store.dispatch('toast/showToast', { message: apiErrorMessage(err, 'AI 분석에 실패했습니다.'), type: 'error' })
      } finally {
        this.analyzing = false
      }
    },

    async deleteDiary() {
      if (!this.selectedEntry) return
      if (!confirm('이 일기를 삭제하시겠습니까?')) return
      try {
        await axios.delete(`/api/diary/${this.selectedEntry.id}`)
        this.selectedEntry = null
        this.content = ''
        this.analysis = null
        await this.loadEntries()
        this.$store.dispatch('toast/showToast', { message: '삭제되었습니다.', type: 'success' })
      } catch (err) {
        this.$store.dispatch('toast/showToast', { message: apiErrorMessage(err, '삭제에 실패했습니다.'), type: 'error' })
      }
    },

    parseAnalysis(aiAnalysis) {
      if (!aiAnalysis) return null
      try {
        const jsonStr = aiAnalysis.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        return JSON.parse(jsonStr)
      } catch {
        return null
      }
    },

    parsedMood(entry) {
      const a = this.parseAnalysis(entry.aiAnalysis)
      return a ? a.mood.split(' ')[0] : '📝'
    },

    previewText(text) {
      return text ? text.slice(0, 30) + (text.length > 30 ? '...' : '') : ''
    },

    formatDate(dateStr) {
      const d = new Date(dateStr)
      return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
    },

    onTextareaWheel(e) {
      const ta = this.$refs.diaryTextarea
      if (ta) ta.scrollTop += e.deltaY
    },

    onSelectFromInsights(entry) {
      this.openEntry(entry)
      this.showInsights = false
    },
  },
}
</script>

<style scoped>
/* ══════════════════════════════════════════
   기본 레이아웃
══════════════════════════════════════════ */
.diary-page {
  display: flex;
  height: calc(100vh - 80px);
  background: var(--mainBg-color, #0b0b10);
  font-family: inherit;
  overflow: hidden;
}

/* ══════════════════════════════════════════
   사이드바
══════════════════════════════════════════ */
.diary-sidebar {
  width: 240px;
  min-width: 240px;
  background: var(--surface, #13131a);
  border-right: 1px solid var(--card-border, rgba(201,169,110,0.12));
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: 18px 14px 12px;
  border-bottom: 1px solid var(--card-border, rgba(201,169,110,0.12));
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.sidebar-header h3 {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary, #f0ece4);
  font-family: "Playfair Display", serif;
  letter-spacing: 0.04em;
}

.new-entry-btn {
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid var(--card-border-strong, rgba(201,169,110,0.28));
  background: transparent;
  color: var(--accent, #c9a96e);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.new-entry-btn:hover {
  background: var(--accent-dim, rgba(201,169,110,0.15));
}

.entry-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
}

.entry-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: background 0.15s;
}
.entry-item:hover { background: var(--sidebar-link-hover-bg, rgba(201,169,110,0.08)); }
.entry-item.active {
  background: var(--sidebar-active-bg, rgba(201,169,110,0.18));
  border-left-color: var(--accent, #c9a96e);
}

.entry-mood { font-size: 1.3rem; flex-shrink: 0; line-height: 1; margin-top: 2px; }
.entry-meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.entry-date { font-size: 0.76rem; font-weight: 600; color: var(--text-secondary, #c8c3bb); }
.entry-preview { font-size: 0.73rem; color: var(--text-muted, #8a8580); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.entry-empty {
  padding: 36px 14px;
  text-align: center;
  color: var(--text-muted, #8a8580);
  font-size: 0.83rem;
}

/* ══════════════════════════════════════════
   메인 영역
══════════════════════════════════════════ */
.diary-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0 20px 16px;
  background: var(--content-bg, #1c1c28);
  min-width: 0;
}

.diary-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0 12px;
  border-bottom: 1px solid var(--card-border, rgba(201,169,110,0.12));
  margin-bottom: 14px;
  flex-shrink: 0;
}

.sidebar-toggle {
  display: none;
  background: none;
  border: none;
  font-size: 1.3rem;
  cursor: pointer;
  color: var(--text-muted, #8a8580);
  padding: 4px 8px;
}

.diary-header-text h2 {
  margin: 0 0 1px;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-primary, #f0ece4);
  font-family: "Playfair Display", serif;
  letter-spacing: 0.04em;
}
.diary-header-text p {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-muted, #8a8580);
}

.btn-insights {
  margin-left: auto;
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid var(--card-border-strong, rgba(201,169,110,0.28));
  background: transparent;
  color: var(--accent, #c9a96e);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}
.btn-insights:hover:not(:disabled) {
  background: var(--accent-dim, rgba(201,169,110,0.15));
  border-color: var(--accent, #c9a96e);
}
.btn-insights:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* ══════════════════════════════════════════
   2컬럼 콘텐츠
══════════════════════════════════════════ */
.diary-content {
  flex: 1;
  display: flex;
  gap: 16px;
  min-height: 0;
  overflow: hidden;
}

/* ── 에디터 컬럼 ── */
.editor-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  overflow: hidden;
}

.date-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.date-nav {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid var(--card-border, rgba(201,169,110,0.12));
  background: var(--card-bg, #252535);
  font-size: 1.1rem;
  cursor: pointer;
  color: var(--text-secondary, #c8c3bb);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}
.date-nav:hover {
  border-color: var(--accent, #c9a96e);
  color: var(--accent, #c9a96e);
  background: var(--accent-dim, rgba(201,169,110,0.15));
}

.date-input {
  border: 1px solid var(--input-border, rgba(201,169,110,0.2));
  border-radius: 8px;
  padding: 5px 10px;
  font-size: 0.88rem;
  color: var(--input-text, #f0ece4);
  background: var(--input-bg, #1c1c28);
  transition: border-color 0.2s;
  color-scheme: dark;
}
.date-input:focus {
  outline: none;
  border-color: var(--accent, #c9a96e);
  box-shadow: 0 0 0 2px var(--input-focus-shadow, rgba(201,169,110,0.25));
}

.editor-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.diary-textarea {
  flex: 1;
  min-height: 0;
  width: 100%;
  padding: 16px;
  border: 1px solid var(--input-border, rgba(201,169,110,0.2));
  border-radius: 12px;
  font-size: 0.97rem;
  line-height: 1.75;
  color: var(--input-text, #f0ece4);
  resize: none;
  background: var(--card-bg, #252535);
  box-sizing: border-box;
  overflow-y: auto;
  transition: border-color 0.2s, box-shadow 0.2s;
  font-family: inherit;
}
.diary-textarea:focus {
  outline: none;
  border-color: var(--accent, #c9a96e);
  box-shadow: 0 0 0 2px var(--input-focus-shadow, rgba(201,169,110,0.25));
}
.diary-textarea::placeholder { color: var(--input-placeholder, #8a8580); }
.diary-textarea:disabled { opacity: 0.5; }

.editor-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn-save {
  padding: 8px 20px;
  border-radius: 8px;
  border: none;
  background: var(--accent, #c9a96e);
  color: var(--text-on-accent, #0b0b10);
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-save:hover:not(:disabled) { opacity: 0.85; }
.btn-save:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-analyze {
  padding: 8px 20px;
  border-radius: 8px;
  border: 1px solid var(--card-border-strong, rgba(201,169,110,0.28));
  background: transparent;
  color: var(--accent, #c9a96e);
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-analyze:hover:not(:disabled) {
  background: var(--accent-dim, rgba(201,169,110,0.15));
  border-color: var(--accent, #c9a96e);
}
.btn-analyze:disabled { opacity: 0.35; cursor: not-allowed; }

.btn-delete {
  margin-left: auto;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--danger-color, #c45a5a);
  background: transparent;
  color: var(--danger-color, #c45a5a);
  font-size: 0.88rem;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-delete:hover { background: var(--danger-bg, rgba(196,90,90,0.15)); }

/* ── AI 분석 컬럼 ── */
.analysis-col {
  width: 300px;
  min-width: 300px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

/* 분석 결과 카드 */
.analysis-card {
  padding: 20px;
  background: var(--card-bg-2, #2e2e3e);
  border-radius: 14px;
  border: 1px solid var(--card-border-strong, rgba(201,169,110,0.28));
  box-shadow: 0 2px 16px rgba(0,0,0,0.3);
}

.analysis-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.analysis-mood {
  font-size: 1rem;
  font-weight: 700;
  color: var(--accent, #c9a96e);
  white-space: nowrap;
}

.mood-bar {
  flex: 1;
  height: 5px;
  background: var(--subBg500, #3a3a4e);
  border-radius: 99px;
  overflow: hidden;
}
.mood-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent, #c9a96e), var(--accent-light, #e8d5b0));
  border-radius: 99px;
  transition: width 0.8s ease;
}

.mood-score {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--accent, #c9a96e);
  white-space: nowrap;
}

.analysis-summary {
  font-size: 0.88rem;
  line-height: 1.7;
  color: var(--text-secondary, #c8c3bb);
  margin: 0 0 12px;
}

.analysis-keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 14px;
}
.keyword-tag {
  padding: 3px 10px;
  background: var(--accent-dim, rgba(201,169,110,0.15));
  border: 1px solid var(--card-border-strong, rgba(201,169,110,0.28));
  border-radius: 20px;
  font-size: 0.77rem;
  color: var(--accent, #c9a96e);
  font-weight: 500;
}

.analysis-comment {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  background: var(--surface-2, #1c1c28);
  border-radius: 10px;
  padding: 12px 14px;
  border: 1px solid var(--card-border, rgba(201,169,110,0.12));
}
.comment-icon { font-size: 1rem; flex-shrink: 0; }
.analysis-comment p {
  margin: 0;
  font-size: 0.86rem;
  line-height: 1.7;
  color: var(--text-secondary, #c8c3bb);
}

/* 빈 상태 / 로딩 플레이스홀더 */
.analysis-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px 20px;
  background: var(--card-bg, #252535);
  border-radius: 14px;
  border: 1px dashed var(--card-border-strong, rgba(201,169,110,0.28));
  text-align: center;
  min-height: 200px;
}

.placeholder-icon { font-size: 2rem; opacity: 0.6; }

.analysis-placeholder p {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.6;
  color: var(--text-muted, #8a8580);
}
.analysis-placeholder strong { color: var(--accent, #c9a96e); }

.placeholder-hint {
  font-size: 0.77rem !important;
  color: var(--text-muted, #8a8580);
  opacity: 0.7;
}

/* 로딩 스피너 */
.placeholder-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--card-border-strong, rgba(201,169,110,0.28));
  border-top-color: var(--accent, #c9a96e);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ══════════════════════════════════════════
   트랜지션
══════════════════════════════════════════ */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ══════════════════════════════════════════
   반응형
══════════════════════════════════════════ */
.sidebar-backdrop { display: none; }

@media (max-width: 768px) {
  .diary-sidebar {
    position: fixed;
    top: 80px;
    left: 0;
    height: calc(100vh - 80px);
    z-index: 100;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }
  .diary-sidebar.sidebar--open { transform: translateX(0); }
  .sidebar-toggle { display: flex; }

  .sidebar-backdrop {
    display: block;
    position: fixed;
    top: 80px;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 99;
  }

  .diary-main {
    padding: 0 14px 16px;
    overflow-y: auto;
  }

  /* 모바일: 세로 적층 */
  .diary-content {
    flex-direction: column;
    overflow: visible;
  }

  .analysis-col {
    width: 100%;
    min-width: unset;
    overflow-y: visible;
  }

  .editor-col { overflow: visible; }

  .diary-textarea {
    flex: none;
    height: 220px;
  }

  .analysis-placeholder { min-height: 140px; }

  .editor-actions { flex-wrap: wrap; gap: 6px; }
  .btn-save, .btn-analyze, .btn-delete {
    padding: 8px 14px;
    font-size: 0.84rem;
  }
  .btn-delete { margin-left: 0; }

  .btn-insights {
    padding: 6px 10px;
    font-size: 0.76rem;
  }
}
</style>
