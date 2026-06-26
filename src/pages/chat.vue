<template>
  <div class="chat-page">

    <!-- 사이드바 (항상 표시) -->
    <aside class="chat-sidebar" :class="{ 'sidebar--open': sidebarOpen }">
      <div class="sidebar-header">
        <button class="new-chat-btn" @click="startNewChat">+ 새 대화</button>
      </div>
      <div class="session-list thin-scrollbar" data-lenis-prevent>
        <div
          v-for="s in sessions"
          :key="s.sessionKey"
          class="session-item"
          :class="{ active: s.sessionKey === sessionKey }"
          @click="switchSession(s.sessionKey)"
        >
          <span class="session-title">{{ s.title || '새 대화' }}</span>
          <span class="session-date">{{ formatDate(s.lastActivity) }}</span>
        </div>
        <div v-if="sessions.length === 0 && !initialLoading" class="session-empty">대화 없음</div>
      </div>
    </aside>

    <!-- 채팅 영역 -->
    <div class="chat-main">
      <div class="chat-header">
        <button class="sidebar-toggle" @click="sidebarOpen = !sidebarOpen">☰</button>
        <div class="chat-header-text">
          <h2 class="chat-title">AI Chat</h2>
          <p class="chat-subtitle">Claude AI와 대화하세요</p>
        </div>
      </div>

      <div class="messages thin-scrollbar" ref="messagesEl" data-lenis-prevent>
        <!-- 새 채팅 환영 화면 -->
        <div v-if="!sessionKey && !historyLoading" class="welcome-screen">
          <h1 class="welcome-title">
            {{ username ? `안녕하세요, ${username}님` : '무엇이든 물어보세요' }}
          </h1>
          <p class="welcome-subtitle">Claude AI와 대화해보세요</p>
        </div>
        <!-- 히스토리 로딩 중 -->
        <div v-else-if="historyLoading" class="empty-state">불러오는 중...</div>
        <!-- 메시지 목록 -->
        <template v-else>
          <div
            v-for="(msg, i) in messages"
            :key="i"
            class="message"
            :class="msg.role"
          >
            <div class="message__bubble">
              <pre class="message__text">{{ msg.content }}<span v-if="msg.streaming" class="stream-cursor">▌</span></pre>
              <span v-if="msg.streaming && !msg.content" class="loading-dots"><span>.</span><span>.</span><span>.</span></span>
            </div>
          </div>
        </template>
      </div>

      <div v-if="!username" class="chat-login-prompt">
        <span>채팅을 사용하려면 로그인이 필요합니다.</span>
        <button class="login-btn" type="button" @click="goToLogin">로그인</button>
      </div>
      <form v-else class="chat-input-area" @submit.prevent="send">
        <textarea
          v-model="input"
          class="chat-input thin-scrollbar"
          placeholder="메시지를 입력하세요..."
          rows="1"
          @keydown.enter.exact.prevent="send"
          @input="autoResize"
          ref="inputEl"
          :disabled="loading || historyLoading"
        />
        <button class="send-btn" type="submit" :disabled="loading || historyLoading || !input.trim()">
          전송
        </button>
      </form>
    </div>

    <!-- 모바일 사이드바 오버레이 -->
    <div v-if="sidebarOpen" class="sidebar-overlay" @click="sidebarOpen = false" />
  </div>
</template>

<script>
import axios from '@/axios'

export default {
  name: 'ChatPage',
  data() {
    return {
      messages: [],
      input: '',
      loading: false,
      historyLoading: false,
      initialLoading: true,
      sessionKey: '',
      sessions: [],
      sidebarOpen: false,
    }
  },
  computed: {
    username() {
      return this.$store.getters['auth/user']?.username || ''
    },
  },
  mounted() {
    if (this.username) {
      this.loadUserSessions()
    } else {
      this.initialLoading = false
    }
  },
  methods: {
    // ── 세션 로드 ──────────────────────────────────────────────

    loadUserSessions() {
      axios.get(`/api/chat/sessions/${this.username}`)
        .then(res => { this.sessions = res.data })
        .catch(() => {})
        .finally(() => { this.initialLoading = false })
    },

    // ── UUID 생성 (구형 브라우저 폴백 포함) ────────────────────

    generateUUID() {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID()
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
      })
    },

    // ── 세션 관리 ──────────────────────────────────────────────

    startNewChat() {
      this.sessionKey = ''
      this.messages = []
      this.historyLoading = false
      this.sidebarOpen = false
    },

    switchSession(key) {
      this.sessionKey = key
      this.sidebarOpen = false
      this.loadHistory()
    },

    // ── 히스토리 로드 ──────────────────────────────────────────

    loadHistory() {
      if (!this.sessionKey) return
      this.historyLoading = true
      axios.get(`/api/chat/history/${this.sessionKey}`)
        .then(res => {
          this.messages = res.data.map(r => ({ role: r.role, content: r.content }))
          this.$nextTick(() => this.scrollToBottom())
        })
        .catch(() => {})
        .finally(() => { this.historyLoading = false })
    },

    // ── 메시지 전송 (SSE 스트리밍) ─────────────────────────────
    // 백엔드 /api/chat/stream 이 토큰을 SSE 이벤트(delta/done/error)로 흘려보냄.
    // 어시스턴트 메시지를 빈 상태로 먼저 push 한 뒤 delta가 올 때마다 content에 append.

    async send() {
      const text = this.input.trim()
      if (!text || this.loading) return

      if (!this.sessionKey) {
        this.sessionKey = this.generateUUID()
      }

      this.messages.push({ role: 'user', content: text })
      const assistantIndex = this.messages.length
      this.messages.push({ role: 'assistant', content: '', streaming: true })

      const userContent = text
      this.input = ''
      this.$nextTick(() => this.autoResize())
      this.loading = true
      this.scrollToBottom()

      try {
        await this.streamChat(userContent, assistantIndex)
      } catch (e) {
        if (!this.messages[assistantIndex].content) {
          this.messages[assistantIndex].content = '서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.'
        }
      } finally {
        this.messages[assistantIndex].streaming = false
        this.refreshSessions()
        this.loading = false
        this.$nextTick(() => this.scrollToBottom())
      }
    },

    async streamChat(userContent, assistantIndex) {
      const url = `${process.env.VUE_APP_API_URL || ''}/api/chat/stream`
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ sessionKey: this.sessionKey, content: userContent }),
      })

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      let currentEvent = null

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // SSE는 빈 줄(\n\n)로 이벤트가 끝나지만, 라인 단위로 누적 파싱하는 게 더 안전
        let newlineIdx
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIdx).replace(/\r$/, '')
          buffer = buffer.slice(newlineIdx + 1)

          if (line === '') { currentEvent = null; continue }
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim()
          } else if (line.startsWith('data:')) {
            const data = line.slice(5).trim()
            if (!data) continue
            this.handleSseData(currentEvent, data, assistantIndex)
          }
        }
      }
    },

    handleSseData(eventName, data, assistantIndex) {
      let parsed
      try { parsed = JSON.parse(data) } catch { return }

      if (eventName === 'delta' && parsed.text) {
        this.messages[assistantIndex].content += parsed.text
        this.scrollToBottom()
      } else if (eventName === 'error') {
        // 중간에 에러가 나면 지금까지 받은 부분 응답 뒤에 에러 메시지를 덧붙임
        const err = parsed.message || '오류가 발생했습니다.'
        const m = this.messages[assistantIndex]
        m.content = m.content ? `${m.content}\n\n${err}` : err
      }
    },

    refreshSessions() {
      if (this.username) {
        axios.get(`/api/chat/sessions/${this.username}`)
          .then(res => { this.sessions = res.data })
      }
    },

    // ── UI 유틸 ────────────────────────────────────────────────

    scrollToBottom() {
      this.$nextTick(() => {
        const el = this.$refs.messagesEl
        if (el) el.scrollTop = el.scrollHeight
      })
    },

    autoResize() {
      const el = this.$refs.inputEl
      if (!el) return
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 160) + 'px'
    },

    goToLogin() {
      this.$router.push('/login')
    },

    formatDate(dateStr) {
      if (!dateStr) return ''
      const d = new Date(dateStr)
      const now = new Date()
      if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      }
      return d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
    },
  },
}
</script>

<style src="@/assets/css/pages/chat.css" scoped></style>
