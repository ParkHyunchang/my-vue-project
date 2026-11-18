<template>
  <div class="diary-page">
    <!-- 모바일 사이드바 백드롭 -->
    <div
      v-if="sidebarOpen"
      class="sidebar-backdrop"
      @click="sidebarOpen = false"
    />

    <!-- 좌측: 일기 목록 사이드바 -->
    <aside
      class="diary-sidebar"
      :class="{ 'sidebar--open': sidebarOpen }"
    >
      <div class="sidebar-header">
        <h3>내 일기</h3>
        <button
          class="new-entry-btn"
          @click="selectToday"
        >
          + 오늘 쓰기
        </button>
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
        <div
          v-if="entries.length === 0 && !loading"
          class="entry-empty"
        >
          첫 일기를 작성해보세요
        </div>
      </div>
    </aside>

    <!-- 우측: 메인 영역 -->
    <div class="diary-main">
      <!-- 헤더 -->
      <div class="diary-header">
        <button
          class="sidebar-toggle"
          @click.stop="sidebarOpen = !sidebarOpen"
        >
          ☰
        </button>
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
            <button
              class="date-nav"
              @click="moveDateBy(-1)"
            >
              ‹
            </button>
            <input
              type="date"
              :value="selectedDate"
              class="date-input"
              @change="onDateChange"
            >
            <button
              class="date-nav"
              @click="moveDateBy(1)"
            >
              ›
            </button>
          </div>
          <div class="editor-area">
            <textarea
              v-model="content"
              class="diary-textarea"
              placeholder="오늘 하루 어땠나요? 자유롭게 적어보세요..."
              :disabled="saving || deleting"
              ref="diaryTextarea"
              @wheel.prevent="onTextareaWheel"
            />
            <div class="editor-actions">
              <button
                class="btn-save"
                @click="saveDiary"
                :disabled="saving || deleting || analyzingCurrent || !content.trim()"
              >
                {{ saving ? '저장 중...' : '저장' }}
              </button>
              <button
                class="btn-analyze"
                @click="analyzeDiary"
                :disabled="analyzing || saving || deleting || isDirty || !selectedEntry"
                :title="!selectedEntry || isDirty ? '먼저 저장하세요' : ''"
              >
                {{ analyzing ? 'AI 분석 중...' : '✨ AI 분석' }}
              </button>
              <button
                v-if="selectedEntry"
                class="btn-delete"
                @click="deleteDiary"
                :disabled="saving || deleting || analyzingCurrent"
              >
                삭제
              </button>
            </div>
          </div>
        </div>

        <!-- 오른쪽: AI 분석 패널 -->
        <div class="analysis-col">
          <transition
            name="fade"
            mode="out-in"
          >
            <!-- 분석 결과 -->
            <div
              v-if="analysis && !isDirty"
              key="result"
              class="analysis-card"
            >
              <div class="analysis-header">
                <span class="analysis-mood">{{ analysis.mood }}</span>
                <div class="mood-bar">
                  <div
                    class="mood-fill"
                    :style="{ width: (analysis.moodScore * 10) + '%' }"
                  />
                </div>
                <span class="mood-score">{{ analysis.moodScore }}/10</span>
              </div>
              <p class="analysis-summary">
                {{ analysis.summary }}
              </p>
              <div class="analysis-keywords">
                <span
                  v-for="kw in analysis.keywords"
                  :key="kw"
                  class="keyword-tag"
                >#{{ kw }}</span>
              </div>
              <div class="analysis-comment">
                <span class="comment-icon">💬</span>
                <p>{{ analysis.comment }}</p>
              </div>
            </div>

            <!-- 분석 중 -->
            <div
              v-else-if="analyzingCurrent"
              key="loading"
              class="analysis-placeholder"
            >
              <div class="placeholder-spinner" />
              <p>AI가 일기를 분석하고 있어요...</p>
            </div>

            <!-- 빈 상태 -->
            <div
              v-else
              key="empty"
              class="analysis-placeholder"
            >
              <span class="placeholder-icon">✨</span>
              <p>일기를 저장한 뒤<br><strong>AI 분석</strong> 버튼을 눌러보세요</p>
              <p class="placeholder-hint">
                감정 분석 · 키워드 · 따뜻한 한마디
              </p>
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
import { diaryApi } from '@/api/diaryApi'
import { diaryToday, isDiaryDate, shiftDiaryDate } from '@/utils/diaryDate'
import { apiErrorMessage } from '@/utils/apiError'
import DiaryInsightsModal from '@/components/diary/DiaryInsightsModal.vue'

export default {
  name: 'DiaryPage',
  components: { DiaryInsightsModal },
  data() {
    return {
      entries: [],
      selectedDate: diaryToday(),
      selectedEntry: null,
      content: '',
      savedContent: '',
      analysis: null,
      loading: false,
      saving: false,
      deleting: false,
      analyzing: false,
      analyzingEntryId: null,
      selectionVersion: 0,
      listRequestId: 0,
      sidebarOpen: false,
      showInsights: false,
    }
  },
  computed: {
    isDirty() {
      return this.content !== this.savedContent
    },
    analyzingCurrent() {
      return this.analyzing && this.selectedEntry?.id === this.analyzingEntryId
    },
  },
  mounted() {
    this.loadEntries()
    window.addEventListener('beforeunload', this.onBeforeUnload)
  },
  beforeUnmount() {
    window.removeEventListener('beforeunload', this.onBeforeUnload)
    this.listRequestId++
  },
  beforeRouteLeave() {
    return this.confirmDiscard()
  },
  methods: {
    async loadEntries() {
      const requestId = ++this.listRequestId
      const selectionVersion = this.selectionVersion
      this.loading = true
      try {
        const res = await diaryApi.list()
        if (requestId !== this.listRequestId) return
        this.entries = res.data
        const entry = this.entries.find(e => e.diaryDate === this.selectedDate)
        if (entry && !this.isDirty && selectionVersion === this.selectionVersion) this.applyEntry(entry)
      } catch {
        // 로드 실패 시 빈 목록 유지
      } finally {
        if (requestId === this.listRequestId) this.loading = false
      }
    },

    applyEntry(entry) {
      this.selectedEntry = entry
      this.selectedDate = entry.diaryDate
      this.content = entry.content || ''
      this.savedContent = this.content
      this.analysis = this.parseAnalysis(entry.aiAnalysis)
      this.sidebarOpen = false
    },

    confirmDiscard() {
      if (this.saving || this.deleting) return false
      return !this.isDirty || window.confirm('저장하지 않은 일기 내용이 있습니다. 변경 내용을 버리고 이동할까요?')
    },

    onBeforeUnload(event) {
      if (!this.isDirty && !this.saving && !this.deleting) return
      event.preventDefault()
      event.returnValue = ''
    },

    openEntry(entry) {
      if (entry.id === this.selectedEntry?.id) return true
      if (entry.diaryDate === this.selectedDate) {
        if (!this.confirmDiscard()) return false
        this.selectionVersion++
        this.applyEntry(entry)
        return true
      }
      return this.selectDate(entry.diaryDate)
    },

    selectToday() {
      return this.selectDate(diaryToday())
    },

    selectDate(date) {
      if (!isDiaryDate(date)) return false
      if (date === this.selectedDate) return true
      if (!this.confirmDiscard()) return false
      this.selectionVersion++
      this.selectedDate = date
      const entry = this.entries.find(e => e.diaryDate === date)
      if (entry) this.applyEntry(entry)
      else {
        this.selectedEntry = null
        this.content = ''
        this.savedContent = ''
        this.analysis = null
      }
      this.sidebarOpen = false
      return true
    },

    onDateChange(event) {
      this.selectDate(event.target.value)
      // A canceled date-input edit must visibly restore the previous date as well.
      event.target.value = this.selectedDate
    },

    moveDateBy(days) {
      this.selectDate(shiftDiaryDate(this.selectedDate, days))
    },

    upsertEntry(entry) {
      const index = this.entries.findIndex(item => item.id === entry.id)
      if (index === -1) this.entries.push(entry)
      else this.entries.splice(index, 1, entry)
      this.entries.sort((a, b) => b.diaryDate.localeCompare(a.diaryDate))
    },

    cancelPendingList() {
      this.listRequestId++
      this.loading = false
    },

    async saveDiary() {
      if (this.saving || this.deleting || this.analyzingCurrent || !this.content.trim()) return
      this.cancelPendingList()
      this.saving = true
      try {
        const res = await diaryApi.save({
          diaryDate: this.selectedDate,
          content: this.content,
        })
        this.upsertEntry(res.data)
        this.applyEntry(res.data)
        this.$store.dispatch('toast/showToast', { message: '일기가 저장되었습니다.', type: 'success' })
      } catch (err) {
        this.$store.dispatch('toast/showToast', { message: apiErrorMessage(err, '저장에 실패했습니다.'), type: 'error' })
      } finally {
        this.saving = false
      }
    },

    async analyzeDiary() {
      if (!this.selectedEntry || this.analyzing || this.saving || this.deleting || this.isDirty) return
      const entryId = this.selectedEntry.id
      this.analyzing = true
      this.analyzingEntryId = entryId
      try {
        const res = await diaryApi.analyze(entryId)
        const entry = this.entries.find(item => item.id === entryId)
        if (!entry || res.data.id !== entryId) return
        // Analysis owns only this entry's analysis field, never another editor's date/content.
        const updated = { ...entry, aiAnalysis: res.data.aiAnalysis }
        this.upsertEntry(updated)
        if (this.selectedEntry?.id === entryId) {
          this.selectedEntry = updated
          this.analysis = this.parseAnalysis(updated.aiAnalysis)
        }
      } catch (err) {
        this.$store.dispatch('toast/showToast', { message: apiErrorMessage(err, 'AI 분석에 실패했습니다.'), type: 'error' })
      } finally {
        this.analyzing = false
        this.analyzingEntryId = null
      }
    },

    async deleteDiary() {
      if (!this.selectedEntry || this.saving || this.deleting || this.analyzingCurrent) return
      if (!window.confirm(this.isDirty
        ? '저장하지 않은 내용도 버리고 이 일기를 삭제하시겠습니까?'
        : '이 일기를 삭제하시겠습니까?')) return
      const entryId = this.selectedEntry.id
      this.cancelPendingList()
      this.deleting = true
      try {
        await diaryApi.remove(entryId)
        this.entries = this.entries.filter(entry => entry.id !== entryId)
        this.selectedEntry = null
        this.content = ''
        this.savedContent = ''
        this.analysis = null
        this.$store.dispatch('toast/showToast', { message: '삭제되었습니다.', type: 'success' })
      } catch (err) {
        this.$store.dispatch('toast/showToast', { message: apiErrorMessage(err, '삭제에 실패했습니다.'), type: 'error' })
      } finally {
        this.deleting = false
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
      return isDiaryDate(dateStr) ? dateStr.replace(/-/g, '.') : dateStr
    },

    onTextareaWheel(e) {
      const ta = this.$refs.diaryTextarea
      if (ta) ta.scrollTop += e.deltaY
    },

    onSelectFromInsights(entry) {
      if (this.openEntry(entry)) this.showInsights = false
    },
  },
}
</script>

<style src="@/assets/css/pages/diary.css" scoped></style>
