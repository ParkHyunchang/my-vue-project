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

<style src="@/assets/css/pages/diary.css" scoped></style>
